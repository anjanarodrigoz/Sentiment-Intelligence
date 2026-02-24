import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createFullPage, closePage } from './baseScraper.js';
import { politeDelay } from '../utils/rateLimit.js';

const TURNTO_SITE_KEY = '78GDJmj4zEDYwwHsite';

function extractSkuFromUrl(url: string): string {
  const path = new URL(url).pathname;
  // Nike URL pattern: /t/product-name/SKU-COLOR or /w/product-name/SKU-COLOR
  const match = path.match(/\/(?:t|w)\/[^/]+\/([A-Z0-9]+-[A-Z0-9]+)/i);
  if (match) return match[1].split('-')[0]; // Just the base SKU without color code
  // Fallback: last path segment
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  return last.split('-')[0];
}

async function fetchTurnToReviews(
  sku: string,
  limit = 200,
  onBatch?: BatchCallback
): Promise<{ reviews: ScrapedReview[]; rating: number; reviewCount: number; title: string }> {
  // First get the summary for product info + total count
  const summaryUrl = `https://cdn-ws.turnto.com/v5/sitedata/${TURNTO_SITE_KEY}/${sku}/d/review/summary/en_US?`;
  const summaryResp = await fetch(summaryUrl);

  let title = '';
  let avgRating = 0;
  let totalReviews = 0;

  if (summaryResp.ok) {
    const summary = await summaryResp.json() as {
      catItem?: { title?: string };
      directReviewsCount?: number;
      relatedReviewsCount?: number;
      rating?: number;
    };
    title = summary.catItem?.title || '';
    totalReviews = (summary.directReviewsCount || 0) + (summary.relatedReviewsCount || 0);
    avgRating = summary.rating || 0;
  }

  // Fetch reviews in pages
  const reviews: ScrapedReview[] = [];
  let offset = 0;
  const pageSize = 50;
  let batchNumber = 1;

  while (reviews.length < limit) {
    const reviewsUrl = `https://cdn-ws.turnto.com/v5/sitedata/${TURNTO_SITE_KEY}/${sku}/d/review/en_US/${offset}/${pageSize}/%7B%7D/RECENT/true/true/?`;

    const resp = await fetch(reviewsUrl);
    if (!resp.ok) break;

    const data = await resp.json() as {
      reviews: Array<{
        id: number;
        text: string;
        rating: number;
        dateCreated: string;
        title?: string;
      }>;
    };

    if (!data.reviews || data.reviews.length === 0) break;

    // Collect reviews from this batch
    const batchReviews: ScrapedReview[] = [];
    for (const r of data.reviews) {
      if (reviews.length >= limit) break;
      const text = r.title ? `${r.title}. ${r.text}` : r.text;
      if (text) {
        const scrapedReview = {
          text,
          rating: r.rating || 0,
          date: r.dateCreated?.split('T')[0] || '',
        };
        reviews.push(scrapedReview);
        batchReviews.push(scrapedReview);
      }
    }

    // Invoke batch callback if provided
    if (onBatch && batchReviews.length > 0) {
      onBatch({
        batchNumber: batchNumber++,
        reviews: batchReviews,
        totalFetched: reviews.length,
        estimatedTotal: totalReviews,
      });
    }

    if (data.reviews.length < pageSize) break;
    offset += pageSize;
    await politeDelay(300);
  }

  return { reviews, rating: avgRating, reviewCount: totalReviews, title };
}

export const nikeScraper: ReviewScraper = {
  name: 'nike',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('nike.com');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const sku = extractSkuFromUrl(url);
    if (!sku) {
      throw new Error('Could not extract product SKU from Nike URL');
    }

    console.log(`  Nike SKU: ${sku}`);
    console.log(`  Nike URL: ${url}`);

    // Try TurnTo API directly first (fast path)
    const turnToResult = await fetchTurnToReviews(sku, 200, onBatch);

    console.log(`  Nike TurnTo result: ${turnToResult.reviews.length} reviews found`);
    console.log(`  Nike product title: ${turnToResult.title}`);

    if (turnToResult.reviews.length > 0) {
      // Get product image from the page via Puppeteer (TurnTo doesn't provide it)
      let imageUrl = '';
      try {
        const page = await createFullPage();
        // Set cookies to bypass location selector
        await page.setCookie(
          { name: 'NIKE_COMMERCE_COUNTRY', value: 'US', domain: '.nike.com' },
          { name: 'NIKE_COMMERCE_LANG_LOCALE', value: 'en_US', domain: '.nike.com' },
          { name: 'geoloc', value: 'cc=US,rc=CA,tp=vhigh,tz=PST,la=37.77,lo=-122.42', domain: '.nike.com' },
        );
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        imageUrl = await page.evaluate(() =>
          document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
        );
        await closePage(page);
      } catch {
        // Image fetch is best-effort
      }

      console.log(`  Fetched ${turnToResult.reviews.length} reviews via TurnTo API`);

      return {
        product: {
          title: turnToResult.title || 'Unknown Product',
          imageUrl,
          rating: Math.round(turnToResult.rating * 10) / 10,
          reviewCount: turnToResult.reviewCount || turnToResult.reviews.length,
        },
        reviews: turnToResult.reviews,
        source: 'nike',
      };
    }

    throw new Error(
      'No reviews found for this Nike product. The product may be too new or the SKU may be incorrect.'
    );
  },
};
