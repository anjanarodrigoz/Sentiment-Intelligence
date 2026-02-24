import { connectDB, closeDB } from '../config/database.js';
import { hashReview } from '../services/reviewHashService.js';
import type { Review } from '../models/Review.js';
import type { ProductVersion } from '../models/ProductVersion.js';
import { ObjectId } from 'mongodb';

async function migrateReviewHashes() {
  const db = await connectDB();

  console.log('=== Review Hash Migration ===\n');

  // Step 1: Backfill reviewHash on all reviews that don't have one
  console.log('Step 1: Backfilling review hashes...');

  const reviewsWithoutHash = await db
    .collection<Review>('reviews')
    .find({ reviewHash: { $exists: false } })
    .toArray();

  console.log(`Found ${reviewsWithoutHash.length} reviews without hashes`);

  let hashCount = 0;
  for (const review of reviewsWithoutHash) {
    const hash = hashReview(review.text, review.rating);
    await db.collection('reviews').updateOne(
      { _id: review._id },
      { $set: { reviewHash: hash } }
    );
    hashCount++;
    if (hashCount % 100 === 0) {
      console.log(`  Hashed ${hashCount}/${reviewsWithoutHash.length} reviews`);
    }
  }
  console.log(`  Done: ${hashCount} reviews hashed\n`);

  // Step 2: Deduplicate reviews within the same product (keep earliest version)
  console.log('Step 2: Deduplicating reviews across versions...');

  const products = await db.collection('products').find({}).toArray();
  let totalDuplicatesRemoved = 0;

  for (const product of products) {
    // Find duplicate hashes for this product
    const duplicates = await db.collection('reviews').aggregate([
      { $match: { productId: product._id } },
      { $group: {
        _id: { reviewHash: '$reviewHash' },
        count: { $sum: 1 },
        docs: { $push: { _id: '$_id', version: '$version' } },
      }},
      { $match: { count: { $gt: 1 } } },
    ]).toArray();

    for (const dup of duplicates) {
      // Sort by version ascending — keep the earliest
      const sorted = dup.docs.sort((a: { version: number }, b: { version: number }) => a.version - b.version);
      const toRemove = sorted.slice(1).map((d: { _id: ObjectId }) => d._id);

      if (toRemove.length > 0) {
        await db.collection('reviews').deleteMany({ _id: { $in: toRemove } });
        totalDuplicatesRemoved += toRemove.length;
      }
    }
  }

  console.log(`  Done: Removed ${totalDuplicatesRemoved} duplicate reviews\n`);

  // Step 3: Recalculate newReviewCount and cumulativeReviewCount for each version
  console.log('Step 3: Updating ProductVersion counts...');

  let versionUpdateCount = 0;
  for (const product of products) {
    const versions = await db
      .collection<ProductVersion>('product_versions')
      .find({ productId: product._id })
      .sort({ version: 1 })
      .toArray();

    let cumulativeCount = 0;

    for (const ver of versions) {
      // Count actual reviews stored for this version
      const reviewCount = await db.collection('reviews').countDocuments({
        productId: product._id,
        version: ver.version,
      });

      cumulativeCount += reviewCount;

      await db.collection('product_versions').updateOne(
        { _id: ver._id },
        {
          $set: {
            newReviewCount: reviewCount,
            cumulativeReviewCount: cumulativeCount,
            reviewCount: reviewCount,
          },
        }
      );

      versionUpdateCount++;
    }
  }

  console.log(`  Done: Updated ${versionUpdateCount} product versions\n`);

  // Step 4: Create the unique compound index
  console.log('Step 4: Creating unique compound index { productId, reviewHash }...');

  try {
    await db.collection('reviews').createIndex(
      { productId: 1, reviewHash: 1 },
      { unique: true }
    );
    console.log('  Done: Index created successfully\n');
  } catch (err) {
    console.log('  Index may already exist or there are remaining duplicates:', err);
  }

  // Summary
  console.log('=== Migration Summary ===');
  console.log(`Reviews hashed: ${hashCount}`);
  console.log(`Duplicates removed: ${totalDuplicatesRemoved}`);
  console.log(`Versions updated: ${versionUpdateCount}`);
  console.log('========================\n');

  await closeDB();
}

// Run migration
migrateReviewHashes().catch(console.error);
