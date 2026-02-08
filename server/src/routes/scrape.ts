import { Router } from 'express';
import { findScraper, findScraperByBrand, getSupportedBrands } from '../scrapers/registry.js';

export const scrapeRoute = Router();

scrapeRoute.get('/brands', (_req, res) => {
  res.json(getSupportedBrands());
});

scrapeRoute.post('/scrape', async (req, res) => {
  const { url, brand } = req.body;

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
    res.json(result);
  } catch (err) {
    console.error(`Scrape error:`, err);
    const message = err instanceof Error ? err.message : 'Unknown scraping error';
    res.status(500).json({ error: message });
  }
});
