import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createPage, closePage } from './baseScraper.js';
import { politeDelay } from '../utils/rateLimit.js';

const YOTPO_DOMAINS = [
  'lululemon.com',
  'allbirds.com',
];

interface YotpoConfig {
  appKey: string;
  productId: string;
}

async function discoverYotpoConfig(url: string): Promise<YotpoConfig> {
  const page = await createPage();

  try {
    const yotpoRequests: string[] = [];

    page.on('request', (req) => {
      const reqUrl = req.url();
      if (reqUrl.includes('yotpo.com')) {
        yotpoRequests.push(reqUrl);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to find from intercepted requests
    for (const reqUrl of yotpoRequests) {
      const match = reqUrl.match(/widget\/([a-zA-Z0-9]+)\/products\/([^/]+)\/reviews/);
      if (match) {
        return { appKey: match[1], productId: match[2] };
      }
      // Alternative URL pattern
      const altMatch = reqUrl.match(/apps\/([a-zA-Z0-9]+)/);
      if (altMatch) {
        const params = new URL(reqUrl).searchParams;
        const pid = params.get('product_id') || params.get('domain_key') || '';
        if (pid) {
          return { appKey: altMatch[1], productId: pid };
        }
      }
    }

    // Fallback: look in DOM
    const config = await page.evaluate(() => {
      // Check for Yotpo widget div
      const yotpoDiv = document.querySelector('[data-yotpo-app-key]');
      const appKey = yotpoDiv?.getAttribute('data-yotpo-app-key') || '';

      const productDiv = document.querySelector('[data-yotpo-product-id], [data-product-id], .yotpo[data-product-id]');
      const productId = productDiv?.getAttribute('data-yotpo-product-id')
        || productDiv?.getAttribute('data-product-id') || '';

      // Check script tags
      if (!appKey) {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          const keyMatch = text.match(/yotpoAppKey['":\s]+['"]([a-zA-Z0-9]+)['"]/);
          if (keyMatch) {
            return { appKey: keyMatch[1], productId };
          }
        }
      }

      return { appKey, productId };
    });

    if (config.appKey && config.productId) {
      return config;
    }

    throw new Error('Could not discover Yotpo configuration. The product page may not use Yotpo for reviews.');
  } finally {
    await closePage(page);
  }
}

async function fetchYotpoReviews(
  appKey: string,
  productId: string,
  limit = 200,
  onBatch?: BatchCallback
): Promise<{ reviews: ScrapedReview[]; product: { title: string; imageUrl: string; rating: number; reviewCount: number } }> {
  const reviews: ScrapedReview[] = [];
  let page = 1;
  const perPage = 50;
  let productInfo = { title: '', imageUrl: '', rating: 0, reviewCount: 0 };
  let batchNumber = 1;

  while (reviews.length < limit) {
    const apiUrl = `https://api.yotpo.com/v1/widget/${appKey}/products/${productId}/reviews.json?per_page=${perPage}&page=${page}&sort=date&direction=desc`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Yotpo API error: ${response.status}`);
    }

    const data = await response.json() as {
      response: {
        reviews: Array<{
          content: string;
          score: number;
          created_at: string;
        }>;
        bottomline: {
          total_review: number;
          average_score: number;
        };
        product?: {
          name: string;
          image_url: string;
        };
        pagination: {
          total: number;
          per_page: number;
          page: number;
        };
      };
    };

    const resp = data.response;
    if (!resp?.reviews) break;

    // Extract product info on first page
    if (page === 1) {
      productInfo = {
        title: resp.product?.name || '',
        imageUrl: resp.product?.image_url || '',
        rating: resp.bottomline?.average_score || 0,
        reviewCount: resp.bottomline?.total_review || 0,
      };
    }

    // Collect reviews from this batch
    const batchReviews: ScrapedReview[] = [];
    for (const review of resp.reviews) {
      if (reviews.length >= limit) break;
      if (review.content) {
        const scrapedReview = {
          text: review.content,
          rating: review.score || 0,
          date: review.created_at?.split('T')[0] || '',
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
        estimatedTotal: resp.bottomline?.total_review,
      });
    }

    if (resp.reviews.length < perPage) break;
    page++;
    await politeDelay(500);
  }

  return { reviews, product: productInfo };
}

export const yotpoScraper: ReviewScraper = {
  name: 'yotpo',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return YOTPO_DOMAINS.some((d) => hostname.includes(d));
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const config = await discoverYotpoConfig(url);
    const { reviews, product } = await fetchYotpoReviews(config.appKey, config.productId, 200, onBatch);

    if (reviews.length === 0) {
      throw new Error('No reviews found for this product');
    }

    return {
      product: {
        title: product.title || 'Unknown Product',
        imageUrl: product.imageUrl,
        rating: Math.round(product.rating * 10) / 10,
        reviewCount: product.reviewCount,
      },
      reviews,
      source: 'yotpo',
    };
  },
};
