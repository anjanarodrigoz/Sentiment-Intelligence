import { getDB, connectDB, closeDB } from '../config/database.js';
import type { Review } from '../models/Review.js';
import { ObjectId } from 'mongodb';

async function migrateReviews() {
  const db = await connectDB();

  console.log('Starting reviews migration...');

  // Find all product_versions that have reviews array
  const versionsWithReviews = await db
    .collection('product_versions')
    .find({ reviews: { $exists: true, $ne: [] } })
    .toArray();

  console.log(`Found ${versionsWithReviews.length} versions to migrate`);

  let migratedCount = 0;
  let totalReviews = 0;

  for (const version of versionsWithReviews) {
    if (!version._id || !version.productId || !version.reviews) continue;

    const reviews = version.reviews;

    // Insert reviews into new collection
    if (reviews.length > 0) {
      const reviewDocs = reviews.map((review: any) => ({
        productVersionId: version._id,
        productId: version.productId,
        version: version.version,
        text: review.text,
        rating: review.rating,
        date: review.date,
        createdAt: version.scrapedAt || new Date(),
      }));

      await db.collection('reviews').insertMany(reviewDocs);
      totalReviews += reviews.length;
    }

    // Remove reviews array from product_version
    await db
      .collection('product_versions')
      .updateOne(
        { _id: version._id },
        { $unset: { reviews: '' } }
      );

    migratedCount++;

    if (migratedCount % 10 === 0) {
      console.log(`Progress: ${migratedCount}/${versionsWithReviews.length}`);
    }
  }

  console.log(`Migration complete!`);
  console.log(`Migrated ${migratedCount} versions`);
  console.log(`Total reviews moved: ${totalReviews}`);

  await closeDB();
}

// Run migration
migrateReviews().catch(console.error);
