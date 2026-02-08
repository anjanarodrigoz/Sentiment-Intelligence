import type { ReviewScraper, ScrapeResult, ScrapedReview } from './types.js';
import { createPage, closePage } from './baseScraper.js';
import { politeDelay } from '../utils/rateLimit.js';

const BV_DOMAINS = [
  'underarmour.com',
  'nordstrom.com',
  'thenorthface.com',
  'columbia.com',
  'newbalance.com',
];

interface BVConfig {
  passkey: string;
  productId: string;
}

async function discoverBVConfig(url: string): Promise<BVConfig> {
  const page = await createPage();

  try {
    // Intercept network requests to find BV API calls
    const bvRequests: string[] = [];

    page.on('request', (req) => {
      const reqUrl = req.url();
      if (reqUrl.includes('bazaarvoice.com') || reqUrl.includes('bv-api')) {
        bvRequests.push(reqUrl);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to find BV config from intercepted requests
    for (const reqUrl of bvRequests) {
      const params = new URL(reqUrl).searchParams;
      const passkey = params.get('passkey') || params.get('apikey');
      const productId = params.get('filter') || params.get('productId');
      if (passkey) {
        // Extract productId from filter param like "productId:eq:ABC123"
        let pid = '';
        if (productId?.includes('productId')) {
          pid = productId.split(':').pop() || '';
        } else if (productId) {
          pid = productId;
        }
        if (pid) {
          return { passkey, productId: pid };
        }
      }
    }

    // Fallback: look for BV config in page scripts
    const config = await page.evaluate(() => {
      // Check for BV global config
      const win = window as unknown as Record<string, unknown>;
      const bvConfig = win.$BV || win.BV || win.bvConfig;
      if (bvConfig && typeof bvConfig === 'object') {
        const cfg = bvConfig as Record<string, unknown>;
        return {
          passkey: (cfg.passkey || cfg.apiKey || '') as string,
          productId: (cfg.productId || '') as string,
        };
      }

      // Look in script tags for BV configuration
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        const passkeyMatch = text.match(/passkey['":\s]+['"]([a-zA-Z0-9]+)['"]/);
        const productMatch = text.match(/productId['":\s]+['"]([^'"]+)['"]/);
        if (passkeyMatch) {
          return {
            passkey: passkeyMatch[1],
            productId: productMatch ? productMatch[1] : '',
          };
        }
      }

      // Check meta tags and data attributes
      const bvProduct = document.querySelector('[data-bv-product-id]');
      const pid = bvProduct?.getAttribute('data-bv-product-id') || '';

      return { passkey: '', productId: pid };
    });

    if (config.passkey && config.productId) {
      return config;
    }

    // Last resort: try to extract product ID from URL
    const urlProductId = extractProductIdFromUrl(url);
    if (config.passkey && urlProductId) {
      return { passkey: config.passkey, productId: urlProductId };
    }

    throw new Error('Could not discover BazaarVoice configuration. The product page may not use BazaarVoice for reviews.');
  } finally {
    await closePage(page);
  }
}

function extractProductIdFromUrl(url: string): string {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  // Nike: /t/product-name/PRODUCT_ID
  const nikeMatch = path.match(/\/t\/[^/]+\/([A-Z0-9]+)/);
  if (nikeMatch) return nikeMatch[1];

  // Generic: last path segment
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

async function fetchBVReviews(
  passkey: string,
  productId: string,
  limit = 200
): Promise<{ reviews: ScrapedReview[]; product: { title: string; imageUrl: string; rating: number; reviewCount: number } }> {
  const reviews: ScrapedReview[] = [];
  let offset = 0;
  const batchSize = 100;
  let productInfo = { title: '', imageUrl: '', rating: 0, reviewCount: 0 };

  while (reviews.length < limit) {
    const apiUrl = `https://api.bazaarvoice.com/data/batch.json?passkey=${passkey}&apiversion=5.5&resource.q0=reviews&filter.q0=isratingsonly%3Aeq%3Afalse&filter.q0=productid%3Aeq%3A${productId}&limit.q0=${batchSize}&offset.q0=${offset}&sort.q0=submissiontime%3Adesc&resource.q1=products&filter.q1=id%3Aeq%3A${productId}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`BazaarVoice API error: ${response.status}`);
    }

    const data = await response.json() as {
      BatchedResults: {
        q0: {
          Results: Array<{
            ReviewText: string;
            Rating: number;
            SubmissionTime: string;
          }>;
          TotalResults: number;
        };
        q1?: {
          Results: Array<{
            Name: string;
            ImageUrl: string;
            ReviewStatistics: {
              AverageOverallRating: number;
              TotalReviewCount: number;
            };
          }>;
        };
      };
    };

    const q0 = data.BatchedResults?.q0;
    const q1 = data.BatchedResults?.q1;

    if (!q0?.Results) break;

    // Extract product info on first request
    if (offset === 0 && q1?.Results?.[0]) {
      const prod = q1.Results[0];
      productInfo = {
        title: prod.Name || '',
        imageUrl: prod.ImageUrl || '',
        rating: prod.ReviewStatistics?.AverageOverallRating || 0,
        reviewCount: prod.ReviewStatistics?.TotalReviewCount || 0,
      };
    }

    if (offset === 0 && q0.TotalResults) {
      productInfo.reviewCount = q0.TotalResults;
    }

    for (const review of q0.Results) {
      if (reviews.length >= limit) break;
      if (review.ReviewText) {
        reviews.push({
          text: review.ReviewText,
          rating: review.Rating || 0,
          date: review.SubmissionTime?.split('T')[0] || '',
        });
      }
    }

    if (q0.Results.length < batchSize) break;
    offset += batchSize;
    await politeDelay(500);
  }

  return { reviews, product: productInfo };
}

export const bazaarVoiceScraper: ReviewScraper = {
  name: 'bazaarvoice',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return BV_DOMAINS.some((d) => hostname.includes(d));
    } catch {
      return false;
    }
  },

  async scrape(url: string): Promise<ScrapeResult> {
    const config = await discoverBVConfig(url);
    const { reviews, product } = await fetchBVReviews(config.passkey, config.productId);

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
      source: 'bazaarvoice',
    };
  },
};
