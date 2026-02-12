import { Router } from 'express';
import { findScraper, findScraperByBrand } from '../scrapers/registry.js';
import { normalizeProductUrl, hashUrl } from '../services/urlService.js';
import { getCachedScrape, storeScrapeResult } from '../services/cacheService.js';
import { getDB } from '../config/database.js';
import type { Brand } from '../models/Brand.js';

export const scrapeRoute = Router();

scrapeRoute.get('/brands', async (_req, res) => {
  try {
    const db = getDB();
    const brands = await db
      .collection<Brand>('brands')
      .find({ isActive: true })
      .project({ id: 1, name: 1, logoUrl: 1, _id: 0 })
      .toArray();

    // Map to match frontend expected format
    const formattedBrands = brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      logo: brand.logoUrl,
    }));

    res.json(formattedBrands);
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

scrapeRoute.post('/scrape', async (req, res) => {
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

    // Store result in MongoDB
    await storeScrapeResult(normalizedUrl, urlHash, brand, result);

    // Return result with cache metadata
    res.json({
      ...result,
      cached: false,
      scrapedAt: new Date(),
    });
  } catch (err) {
    console.error(`Scrape error:`, err);
    const message = err instanceof Error ? err.message : 'Unknown scraping error';
    res.status(500).json({ error: message });
  }
});

scrapeRoute.post('/scrape/stream', async (req, res) => {
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

    // Store result in MongoDB
    await storeScrapeResult(normalizedUrl, urlHash, brand, result);

    // Get the updated product to fetch the new version number
    const db = getDB();
    const updatedProduct = await db.collection('products').findOne({ urlHash });
    const currentVersion = updatedProduct?.currentVersion || 1;

    // Send complete event with product info
    sendEvent('complete', {
      product: result.product,
      total: result.reviews.length,
      source: result.source,
      scrapedAt: new Date(),
      version: currentVersion,
    });

    res.end();
  } catch (err) {
    console.error(`Stream error:`, err);
    const message = err instanceof Error ? err.message : 'Unknown scraping error';
    sendEvent('error', { error: message });
    res.end();
  }
});
