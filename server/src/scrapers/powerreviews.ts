import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createPage, closePage } from './baseScraper.js';
import { politeDelay } from '../utils/rateLimit.js';

const PR_DOMAINS = [
  'adidas.com',
  'jcpenney.com',
];

interface PRConfig {
  merchantId: string;
  pageId: string;
  apiKey: string;
}

async function discoverPRConfig(url: string): Promise<PRConfig> {
  const page = await createPage();

  try {
    const prRequests: string[] = [];

    page.on('request', (req) => {
      const reqUrl = req.url();
      if (reqUrl.includes('powerreviews.com') || reqUrl.includes('pwr.')) {
        prRequests.push(reqUrl);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to find from intercepted requests
    for (const reqUrl of prRequests) {
      const match = reqUrl.match(/\/m\/(\d+)\/.+\/product\/([^/]+)\/reviews/);
      if (match) {
        const params = new URL(reqUrl).searchParams;
        return {
          merchantId: match[1],
          pageId: match[2],
          apiKey: params.get('apikey') || '',
        };
      }
      // Alternative pattern
      const altMatch = reqUrl.match(/merchant_id=(\d+)/);
      const pageMatch = reqUrl.match(/page_id=([^&]+)/);
      if (altMatch && pageMatch) {
        return {
          merchantId: altMatch[1],
          pageId: pageMatch[1],
          apiKey: new URL(reqUrl).searchParams.get('apikey') || '',
        };
      }
    }

    // Fallback: look in DOM
    const config = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        const merchantMatch = text.match(/merchant_id['":\s]+['"]?(\d+)['"]?/);
        const pageMatch = text.match(/page_id['":\s]+['"]([^'"]+)['"]/);
        const apiMatch = text.match(/api_key['":\s]+['"]([^'"]+)['"]/);
        if (merchantMatch && pageMatch) {
          return {
            merchantId: merchantMatch[1],
            pageId: pageMatch[1],
            apiKey: apiMatch ? apiMatch[1] : '',
          };
        }
      }

      // Check for PR widget div
      const prDiv = document.querySelector('[data-merchant-id]');
      return {
        merchantId: prDiv?.getAttribute('data-merchant-id') || '',
        pageId: prDiv?.getAttribute('data-page-id') || '',
        apiKey: prDiv?.getAttribute('data-api-key') || '',
      };
    });

    if (config.merchantId && config.pageId) {
      return config;
    }

    throw new Error('Could not discover PowerReviews configuration. The product page may not use PowerReviews.');
  } finally {
    await closePage(page);
  }
}

async function fetchPRReviews(
  config: PRConfig,
  limit = 200,
  onBatch?: BatchCallback
): Promise<{ reviews: ScrapedReview[]; product: { title: string; imageUrl: string; rating: number; reviewCount: number } }> {
  const reviews: ScrapedReview[] = [];
  let pageNum = 0;
  const pageSize = 25;
  let productInfo = { title: '', imageUrl: '', rating: 0, reviewCount: 0 };
  let batchNumber = 1;

  while (reviews.length < limit) {
    let apiUrl = `https://display.powerreviews.com/m/${config.merchantId}/l/en_US/product/${config.pageId}/reviews?paging.from=${pageNum * pageSize}&paging.size=${pageSize}&sort=Newest`;
    if (config.apiKey) {
      apiUrl += `&apikey=${config.apiKey}`;
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`PowerReviews API error: ${response.status}`);
    }

    const data = await response.json() as {
      results: Array<{
        reviews: Array<{
          details: {
            comments: string;
            headline?: string;
          };
          metrics: {
            rating: number;
          };
          details_created_date?: string;
        }>;
        rollup: {
          rating_histogram: number[];
          average_rating: number;
          review_count: number;
        };
      }>;
    };

    const result = data.results?.[0];
    if (!result?.reviews) break;

    // Extract product info on first request
    if (pageNum === 0 && result.rollup) {
      productInfo = {
        title: '',
        imageUrl: '',
        rating: result.rollup.average_rating || 0,
        reviewCount: result.rollup.review_count || 0,
      };
    }

    // Collect reviews from this batch
    const batchReviews: ScrapedReview[] = [];
    for (const review of result.reviews) {
      if (reviews.length >= limit) break;
      const text = review.details?.comments;
      if (text) {
        const scrapedReview = {
          text: review.details.headline ? `${review.details.headline}. ${text}` : text,
          rating: review.metrics?.rating || 0,
          date: review.details_created_date?.split('T')[0] || '',
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
        estimatedTotal: result.rollup?.review_count,
      });
    }

    if (result.reviews.length < pageSize) break;
    pageNum++;
    await politeDelay(500);
  }

  return { reviews, product: productInfo };
}

export const powerReviewsScraper: ReviewScraper = {
  name: 'powerreviews',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return PR_DOMAINS.some((d) => hostname.includes(d));
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const config = await discoverPRConfig(url);
    const { reviews, product } = await fetchPRReviews(config, 200, onBatch);

    // Try to get product title from page if API didn't provide it
    let title = product.title;
    let imageUrl = product.imageUrl;

    if (!title || !imageUrl) {
      const page = await createPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const pageInfo = await page.evaluate(() => {
          const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
          const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
          const h1 = document.querySelector('h1')?.textContent?.trim();
          return {
            title: ogTitle || h1 || document.title || '',
            imageUrl: ogImage || '',
          };
        });
        title = title || pageInfo.title;
        imageUrl = imageUrl || pageInfo.imageUrl;
      } finally {
        await closePage(page);
      }
    }

    if (reviews.length === 0) {
      throw new Error('No reviews found for this product');
    }

    return {
      product: {
        title: title || 'Unknown Product',
        imageUrl: imageUrl,
        rating: Math.round(product.rating * 10) / 10,
        reviewCount: product.reviewCount,
      },
      reviews,
      source: 'powerreviews',
    };
  },
};
