import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import type { Product } from '../models/Product.js';
import type { ProductVersion } from '../models/ProductVersion.js';
import type { Review } from '../models/Review.js';
import type { ScrapeResult } from '../scrapers/types.js';
import { hashReview, hashReviews } from './reviewHashService.js';

interface CacheOptions {
  maxAgeHours?: number; // Default: 24 hours
}

interface CachedScrapeResult extends ScrapeResult {
  cached: boolean;
  version: number;
  scrapedAt: Date;
  urlHash: string;
}

export interface StoreResult {
  version: number;
  newReviewCount: number;
  duplicateCount: number;
  totalScraped: number;
  isNewVersion: boolean;
}

/**
 * Retrieves cached scrape data for a product URL
 * Returns cumulative reviews across all versions up to the latest
 */
export async function getCachedScrape(
  normalizedUrl: string,
  urlHash: string,
  options: CacheOptions = {}
): Promise<CachedScrapeResult | null> {
  try {
    const db = getDB();
    const maxAgeHours = options.maxAgeHours ?? 24;
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    // Find product by URL hash
    const product = await db.collection<Product>('products').findOne({ urlHash });

    if (!product || !product._id) {
      return null;
    }

    // Get latest version that's not too old
    const latestVersion = await db
      .collection<ProductVersion>('product_versions')
      .findOne(
        {
          productId: product._id,
          scrapedAt: { $gte: cutoffTime },
        },
        { sort: { version: -1 } }
      );

    if (!latestVersion || !latestVersion._id) {
      return null;
    }

    // Fetch cumulative reviews across all versions up to the latest
    const reviews = await db
      .collection<Review>('reviews')
      .find({
        productId: product._id,
        version: { $lte: latestVersion.version },
      })
      .sort({ version: 1, createdAt: 1 })
      .toArray();

    // Transform to ScrapeResult format (matching old structure)
    return {
      product: latestVersion.product,
      reviews: reviews.map(r => ({
        text: r.text,
        rating: r.rating,
        date: r.date,
      })),
      source: latestVersion.source,
      cached: true,
      version: latestVersion.version,
      scrapedAt: latestVersion.scrapedAt,
      urlHash,
    };
  } catch (error) {
    console.error('Cache lookup failed:', error);
    // Degrade gracefully - return null to trigger fresh scrape
    return null;
  }
}

/**
 * Stores a new scrape result in the database using hash-based deduplication.
 * Only new reviews (not seen in previous versions) are stored.
 * If no new reviews are found, no new version is created.
 */
export async function storeScrapeResult(
  normalizedUrl: string,
  urlHash: string,
  brandId: string,
  result: ScrapeResult
): Promise<StoreResult> {
  try {
    const db = getDB();
    const now = new Date();

    // Hash all incoming reviews
    const scrapedHashMap = hashReviews(result.reviews);
    const totalScraped = scrapedHashMap.size;

    // Find existing product or create new one
    const existingProduct = await db.collection<Product>('products').findOne({ urlHash });

    if (!existingProduct) {
      // New product — store all reviews as version 1
      const newVersion = 1;

      const insertResult = await db.collection<Product>('products').insertOne({
        url: normalizedUrl,
        urlHash,
        brandId,
        title: result.product.title,
        imageUrl: result.product.imageUrl,
        currentVersion: newVersion,
        createdAt: now,
        updatedAt: now,
      });

      const productId = insertResult.insertedId;

      const versionInsertResult = await db
        .collection<ProductVersion>('product_versions')
        .insertOne({
          productId,
          version: newVersion,
          scrapedAt: now,
          product: {
            title: result.product.title,
            imageUrl: result.product.imageUrl,
            rating: result.product.rating,
            reviewCount: result.product.reviewCount,
          },
          source: result.source,
          reviewCount: totalScraped,
          newReviewCount: totalScraped,
          cumulativeReviewCount: totalScraped,
        });

      const productVersionId = versionInsertResult.insertedId;

      if (totalScraped > 0) {
        const reviewDocs = Array.from(scrapedHashMap.entries()).map(([hash, review]) => ({
          productVersionId,
          productId,
          version: newVersion,
          reviewHash: hash,
          text: review.text,
          rating: review.rating,
          date: review.date,
          createdAt: now,
        }));

        await db.collection<Review>('reviews').insertMany(reviewDocs);
      }

      console.log(`Stored version ${newVersion}: ${totalScraped} reviews for ${normalizedUrl}`);

      return {
        version: newVersion,
        newReviewCount: totalScraped,
        duplicateCount: 0,
        totalScraped,
        isNewVersion: true,
      };
    }

    // Existing product — compute delta
    const productId = existingProduct._id!;
    const currentVersion = existingProduct.currentVersion || 0;

    // Get all existing review hashes for this product
    const existingHashes = new Set<string>(
      await db.collection<Review>('reviews').distinct('reviewHash', { productId })
    );

    // Find only new reviews (hashes not in existing set)
    const newReviews: Array<{ hash: string; review: typeof result.reviews[0] }> = [];
    for (const [hash, review] of scrapedHashMap) {
      if (!existingHashes.has(hash)) {
        newReviews.push({ hash, review });
      }
    }

    const duplicateCount = totalScraped - newReviews.length;

    if (newReviews.length === 0) {
      // No new reviews — don't create a new version, just update timestamp
      await db.collection<Product>('products').updateOne(
        { _id: productId },
        { $set: { updatedAt: now } }
      );

      console.log(`No new reviews found for ${normalizedUrl}. Skipping version creation.`);

      return {
        version: currentVersion,
        newReviewCount: 0,
        duplicateCount,
        totalScraped,
        isNewVersion: false,
      };
    }

    // New reviews found — create new version with delta only
    const newVersion = currentVersion + 1;

    // Get cumulative count from the previous latest version
    const previousVersion = await db
      .collection<ProductVersion>('product_versions')
      .findOne(
        { productId, version: currentVersion },
        { projection: { cumulativeReviewCount: 1 } }
      );
    const previousCumulative = previousVersion?.cumulativeReviewCount ?? existingHashes.size;
    const cumulativeReviewCount = previousCumulative + newReviews.length;

    // Update product
    await db.collection<Product>('products').updateOne(
      { _id: productId },
      {
        $set: {
          url: normalizedUrl,
          brandId,
          title: result.product.title,
          imageUrl: result.product.imageUrl,
          currentVersion: newVersion,
          updatedAt: now,
        },
      }
    );

    // Create new product version
    const versionInsertResult = await db
      .collection<ProductVersion>('product_versions')
      .insertOne({
        productId,
        version: newVersion,
        scrapedAt: now,
        product: {
          title: result.product.title,
          imageUrl: result.product.imageUrl,
          rating: result.product.rating,
          reviewCount: result.product.reviewCount,
        },
        source: result.source,
        reviewCount: newReviews.length,
        newReviewCount: newReviews.length,
        cumulativeReviewCount,
      });

    const productVersionId = versionInsertResult.insertedId;

    // Insert only new reviews
    const reviewDocs = newReviews.map(({ hash, review }) => ({
      productVersionId,
      productId,
      version: newVersion,
      reviewHash: hash,
      text: review.text,
      rating: review.rating,
      date: review.date,
      createdAt: now,
    }));

    try {
      await db.collection<Review>('reviews').insertMany(reviewDocs, { ordered: false });
    } catch (err: unknown) {
      // Handle race-condition duplicates gracefully
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        console.log(`Some duplicate reviews skipped during insert for ${normalizedUrl}`);
      } else {
        throw err;
      }
    }

    console.log(`Stored version ${newVersion}: ${newReviews.length} new reviews (${duplicateCount} duplicates skipped) for ${normalizedUrl}`);

    return {
      version: newVersion,
      newReviewCount: newReviews.length,
      duplicateCount,
      totalScraped,
      isNewVersion: true,
    };
  } catch (error) {
    console.error('Failed to store scrape result:', error);
    // Return a safe default so the response can still be sent
    return {
      version: 0,
      newReviewCount: 0,
      duplicateCount: 0,
      totalScraped: result.reviews.length,
      isNewVersion: false,
    };
  }
}
