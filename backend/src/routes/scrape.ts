import { Router } from 'express';
import { findScraper, findScraperByBrand } from '../scrapers/registry.js';
import { normalizeProductUrl, hashUrl } from '../services/urlService.js';
import { getCachedScrape, storeScrapeResult } from '../services/cacheService.js';
import { getDB } from '../config/database.js';
import type { Brand } from '../models/Brand.js';
import type { Product } from '../models/Product.js';
import type { ProductVersion } from '../models/ProductVersion.js';
import type { Review } from '../models/Review.js';
import { scrapeRateLimiter } from '../middleware/rateLimiter.js';

export const scrapeRoute = Router();

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: List all active brands
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: Array of active brands
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Brand'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.get('/brands', async (_req, res) => {
  try {
    const db = getDB();
    const brands = await db
      .collection<Brand>('brands')
      .find({ isActive: true })
      .project({ id: 1, name: 1, logoUrl: 1, onboarding: 1, _id: 0 })
      .toArray();

    // Map to match frontend expected format
    const formattedBrands = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      logo: brand.logoUrl,
      onboarding: brand.onboarding,
    }));

    res.json(formattedBrands);
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List previously scraped products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product title (case-insensitive)
 *     responses:
 *       200:
 *         description: Array of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.get('/products', async (req, res) => {
  try {
    const { brand, search } = req.query;
    const db = getDB();

    const query: Record<string, unknown> = {};
    if (brand && typeof brand === 'string') {
      query.brandId = brand;
    }
    if (search && typeof search === 'string' && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const products = await db
      .collection<Product>('products')
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    if (products.length === 0) {
      res.json([]);
      return;
    }

    // Batch-fetch the latest version for each product in a single aggregation
    const productIds = products.map((p) => p._id!);
    const latestVersions = await db
      .collection<ProductVersion>('product_versions')
      .aggregate([
        { $match: { productId: { $in: productIds } } },
        { $sort: { version: -1 } },
        {
          $group: {
            _id: '$productId',
            cumulativeReviewCount: { $first: '$cumulativeReviewCount' },
            rating: { $first: '$product.rating' },
          },
        },
      ])
      .toArray();

    const versionMap = new Map(
      latestVersions.map((v) => [v._id.toString(), v])
    );

    const enriched = products.map((p) => {
      const latest = versionMap.get(p._id!.toString());
      return {
        urlHash: p.urlHash,
        title: p.title,
        imageUrl: p.imageUrl,
        url: p.url,
        brandId: p.brandId,
        currentVersion: p.currentVersion,
        updatedAt: p.updatedAt,
        reviewCount: latest?.cumulativeReviewCount ?? 0,
        rating: latest?.rating ?? 0,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /api/products/{urlHash}/versions:
 *   get:
 *     summary: Get version history for a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: urlHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Product URL hash
 *     responses:
 *       200:
 *         description: Product info with version history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                     urlHash:
 *                       type: string
 *                 versions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductVersion'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.get('/products/:urlHash/versions', async (req, res) => {
  try {
    const { urlHash } = req.params;
    const db = getDB();

    const product = await db.collection<Product>('products').findOne({ urlHash });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const versions = await db
      .collection<ProductVersion>('product_versions')
      .find({ productId: product._id })
      .sort({ version: 1 })
      .project({
        version: 1,
        scrapedAt: 1,
        newReviewCount: 1,
        cumulativeReviewCount: 1,
        reviewCount: 1,
        'product.rating': 1,
        'product.reviewCount': 1,
      })
      .toArray();

    res.json({
      product: {
        title: product.title,
        imageUrl: product.imageUrl,
        urlHash: product.urlHash,
      },
      versions,
    });
  } catch (error) {
    console.error('Failed to fetch versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * @swagger
 * /api/products/{urlHash}/reviews:
 *   get:
 *     summary: Get reviews for a product
 *     description: Returns all reviews up to a specific version. If no version is specified, returns all reviews.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: urlHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Product URL hash
 *       - in: query
 *         name: upToVersion
 *         schema:
 *           type: integer
 *         description: Return reviews up to this version number
 *     responses:
 *       200:
 *         description: Reviews with product metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 totalReviews:
 *                   type: integer
 *                 version:
 *                   type: integer
 *                 product:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     reviewCount:
 *                       type: integer
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.get('/products/:urlHash/reviews', async (req, res) => {
  try {
    const { urlHash } = req.params;
    const upToVersion = parseInt(req.query.upToVersion as string) || undefined;
    const db = getDB();

    const product = await db.collection<Product>('products').findOne({ urlHash });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const query: Record<string, unknown> = { productId: product._id };
    if (upToVersion) {
      query.version = { $lte: upToVersion };
    }

    const reviews = await db
      .collection<Review>('reviews')
      .find(query)
      .sort({ version: 1, createdAt: 1 })
      .toArray();

    // Get the version metadata for the target version
    const targetVersion = upToVersion || product.currentVersion;
    const versionDoc = await db
      .collection<ProductVersion>('product_versions')
      .findOne({ productId: product._id, version: targetVersion });

    res.json({
      reviews: reviews.map(r => ({
        text: r.text,
        rating: r.rating,
        date: r.date,
        version: r.version,
      })),
      totalReviews: reviews.length,
      version: targetVersion,
      product: versionDoc?.product,
    });
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * @swagger
 * /api/products/{urlHash}:
 *   delete:
 *     summary: Delete a product and all its data
 *     description: Cascade deletes all reviews, version history, and the product record.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: urlHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Product URL hash
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 title:
 *                   type: string
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.delete('/products/:urlHash', async (req, res) => {
  try {
    const { urlHash } = req.params;
    const db = getDB();

    const product = await db.collection<Product>('products').findOne({ urlHash });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Delete reviews, versions, then the product itself
    await db.collection<Review>('reviews').deleteMany({ productId: product._id });
    await db.collection<ProductVersion>('product_versions').deleteMany({ productId: product._id });
    await db.collection<Product>('products').deleteOne({ _id: product._id });

    console.log(`Deleted product "${product.title}" (${urlHash}) and all associated data`);
    res.json({ success: true, title: product.title });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * @swagger
 * /api/scrape:
 *   post:
 *     summary: Scrape product reviews
 *     description: Scrapes reviews from a product URL. Returns cached results if available unless forceRescrape is true.
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScrapeRequest'
 *     responses:
 *       200:
 *         description: Scrape result with reviews and metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScrapeResponse'
 *       400:
 *         description: Invalid URL, missing brand, or unsupported brand
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Scraping error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.post('/scrape', scrapeRateLimiter, async (req, res) => {
  const { url, brand, forceRescrape = false } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  if (!brand || typeof brand !== 'string') {
    res.status(400).json({ error: 'Brand is required' });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  // Normalize URL for cache lookup
  const normalizedUrl = normalizeProductUrl(url);
  const urlHash = hashUrl(normalizedUrl);

  // Check cache unless force rescrape is requested
  if (!forceRescrape) {
    const cached = await getCachedScrape(normalizedUrl, urlHash);
    if (cached) {
      console.log(`Cache hit for ${normalizedUrl} (version ${cached.version})`);
      res.json(cached);
      return;
    }
    console.log(`Cache miss for ${normalizedUrl}`);
  } else {
    console.log(`Force rescrape requested for ${normalizedUrl}`);
  }

  // Check onboarding status from database
  const db = getDB();
  const brandDoc = await db.collection<Brand>('brands').findOne({ id: brand });
  
  if (brandDoc && brandDoc.onboarding === false) {
    res.status(403).json({ 
      error: `Scraping is currently disabled for ${brandDoc.name}. This brand is marked as "Coming Soon".` 
    });
    return;
  }

  // Scraper selection
  let scraper = findScraperByBrand(brand);
  if (!scraper && brand === 'other') {
    scraper = findScraper(url);
  }

  if (!scraper) {
    res.status(400).json({
      error: `Unsupported brand "${brand}". Use GET /api/brands to see supported brands.`,
    });
    return;
  }

  try {
    console.log(`Scraping ${url} with ${scraper.name} (brand: ${brand})...`);
    const result = await scraper.scrape(url);
    console.log(`Scraped ${result.reviews.length} reviews from ${scraper.name}`);

    // Store result in MongoDB with hash-based deduplication
    const storeResult = await storeScrapeResult(normalizedUrl, urlHash, brand, result);

    // Return result with delta metadata
    res.json({
      ...result,
      cached: false,
      scrapedAt: new Date(),
      version: storeResult.version,
      newReviews: storeResult.newReviewCount,
      duplicates: storeResult.duplicateCount,
      isNewVersion: storeResult.isNewVersion,
      urlHash,
    });
  } catch (err) {
    console.error(`Scrape error:`, err);
    const message = err instanceof Error ? err.message : 'Unknown scraping error';
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/scrape/stream:
 *   post:
 *     summary: Scrape product reviews with SSE streaming
 *     description: |
 *       Scrapes reviews and streams progress via Server-Sent Events.
 *       Events: `cache-hit`, `batch`, `progress`, `dedup-progress`, `complete`, `error`.
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScrapeRequest'
 *     responses:
 *       200:
 *         description: SSE event stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events stream with batch, progress, and complete events
 *       400:
 *         description: Invalid URL, missing brand, or unsupported brand
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
scrapeRoute.post('/scrape/stream', scrapeRateLimiter, async (req, res) => {
  const { url, brand, forceRescrape = false } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  if (!brand || typeof brand !== 'string') {
    res.status(400).json({ error: 'Brand is required' });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper function to send SSE events
  const sendEvent = (event: string, data: object) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Normalize URL for cache lookup
  const normalizedUrl = normalizeProductUrl(url);
  const urlHash = hashUrl(normalizedUrl);

  try {
    // Check cache unless force rescrape is requested
    if (!forceRescrape) {
      const cached = await getCachedScrape(normalizedUrl, urlHash);
      if (cached) {
        console.log(`Cache hit for ${normalizedUrl} (version ${cached.version})`);
        sendEvent('cache-hit', cached);
        res.end();
        return;
      }
      console.log(`Cache miss for ${normalizedUrl}`);
    } else {
      console.log(`Force rescrape requested for ${normalizedUrl}`);
    }

    // Check onboarding status from database
    const db = getDB();
    const brandDoc = await db.collection<Brand>('brands').findOne({ id: brand });
    
    if (brandDoc && brandDoc.onboarding === false) {
      sendEvent('error', { 
        error: `Scraping is currently disabled for ${brandDoc.name}. This brand is marked as "Coming Soon".` 
      });
      res.end();
      return;
    }

    // Scraper selection
    let scraper = findScraperByBrand(brand);
    if (!scraper && brand === 'other') {
      scraper = findScraper(url);
    }

    if (!scraper) {
      sendEvent('error', {
        error: `Unsupported brand "${brand}". Use GET /api/brands to see supported brands.`,
      });
      res.end();
      return;
    }

    console.log(`Streaming scrape ${url} with ${scraper.name} (brand: ${brand})...`);

    // Start scraping with batch callback
    const result = await scraper.scrape(url, (batch) => {
      // Send batch event
      sendEvent('batch', {
        batchNumber: batch.batchNumber,
        reviews: batch.reviews,
      });

      // Send progress event
      const percentage = batch.estimatedTotal
        ? Math.round((batch.totalFetched / batch.estimatedTotal) * 100)
        : 0;

      sendEvent('progress', {
        current: batch.totalFetched,
        estimated: batch.estimatedTotal || null,
        percentage,
      });
    });

    console.log(`Streamed ${result.reviews.length} reviews from ${scraper.name}`);

    // Send dedup-progress event before storing
    sendEvent('dedup-progress', {
      message: `Comparing ${result.reviews.length} reviews against existing data...`,
      totalScraped: result.reviews.length,
    });

    // Store result in MongoDB with hash-based deduplication
    const storeResult = await storeScrapeResult(normalizedUrl, urlHash, brand, result);

    // Send complete event with product info and delta metadata
    sendEvent('complete', {
      product: result.product,
      total: result.reviews.length,
      source: result.source,
      scrapedAt: new Date(),
      version: storeResult.version,
      newReviews: storeResult.newReviewCount,
      duplicates: storeResult.duplicateCount,
      isNewVersion: storeResult.isNewVersion,
      urlHash,
    });

    res.end();
  } catch (err) {
    console.error(`Stream error:`, err);
    const message = err instanceof Error ? err.message : 'Unknown scraping error';
    sendEvent('error', { error: message });
    res.end();
  }
});
