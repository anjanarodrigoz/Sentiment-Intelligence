import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import type { Product } from '../models/Product.js';
import type { ProductVersion } from '../models/ProductVersion.js';
import type { ScrapeResult } from '../scrapers/types.js';

interface CacheOptions {
  maxAgeHours?: number; // Default: 24 hours
}

interface CachedScrapeResult extends ScrapeResult {
  cached: boolean;
  version: number;
  scrapedAt: Date;
}

/**
 * Retrieves cached scrape data for a product URL
 * Returns null if no cache exists or cache is too old
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

    if (!latestVersion) {
      return null;
    }

    // Transform to ScrapeResult format
    return {
      product: latestVersion.product,
      reviews: latestVersion.reviews,
      source: latestVersion.source,
      cached: true,
      version: latestVersion.version,
      scrapedAt: latestVersion.scrapedAt,
    };
  } catch (error) {
    console.error('Cache lookup failed:', error);
    // Degrade gracefully - return null to trigger fresh scrape
    return null;
  }
}

/**
 * Stores a new scrape result in the database
 * Creates or updates product and adds new version
 */
export async function storeScrapeResult(
  normalizedUrl: string,
  urlHash: string,
  brandId: string,
  result: ScrapeResult
): Promise<void> {
  try {
    const db = getDB();
    const now = new Date();

    // Find existing product or create new one
    const existingProduct = await db.collection<Product>('products').findOne({ urlHash });

    let productId: ObjectId;
    let newVersion: number;

    if (existingProduct && existingProduct._id) {
      // Update existing product
      const currentVersion = existingProduct.currentVersion || 0;
      newVersion = currentVersion + 1;

      await db.collection<Product>('products').updateOne(
        { _id: existingProduct._id },
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

      productId = existingProduct._id;
    } else {
      // Create new product
      newVersion = 1;

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

      productId = insertResult.insertedId;
    }

    // Insert new product version
    await db.collection<ProductVersion>('product_versions').insertOne({
      productId,
      version: newVersion,
      scrapedAt: now,
      product: {
        title: result.product.title,
        imageUrl: result.product.imageUrl,
        rating: result.product.rating,
        reviewCount: result.product.reviewCount,
      },
      reviews: result.reviews,
      source: result.source,
      reviewCount: result.reviews.length,
    });

    console.log(`Stored scrape result: version ${newVersion} for ${normalizedUrl}`);
  } catch (error) {
    console.error('Failed to store scrape result:', error);
    // Don't throw - allow response to return to user even if caching fails
  }
}
