import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { politeDelay } from '../utils/rateLimit.js';

const PR_MERCHANT_ID = '957729';
const PR_API_KEY = 'dc148023-20d1-4554-864d-fec4a6902345';

async function fetchProductImage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) return '';
    const html = await response.text();
    // Extract og:image meta tag
    const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
      || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
    if (ogMatch?.[1]) return ogMatch[1];
    return '';
  } catch {
    return '';
  }
}

function extractProductIdFromUrl(url: string): string {
  const path = new URL(url).pathname;
  // TNF URL pattern: /en-us/p/.../product-name-NF0AXXXX
  // The style code is the last segment (e.g., NF0A8DPZ, nf0a7ur2)
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  // Remove query params and extract style code
  // Style codes look like: NF0A8DPZ, nf0a7ur2, NF0A52SH
  const match = last.match(/(NF0[A-Z0-9]+)/i);
  if (match) return match[1].toUpperCase();
  // Fallback: return last segment as-is
  return last.toUpperCase();
}

interface PRReview {
  details: {
    comments: string;
    headline?: string;
    nickname?: string;
    created_date: number;
    product_name?: string;
  };
  metrics: {
    rating: number;
    helpful_votes?: number;
    not_helpful_votes?: number;
  };
  badges?: {
    is_verified_buyer?: boolean;
  };
}

interface PRResponse {
  paging: {
    total_results: number;
    pages_total: number;
    page_size: number;
    current_page_number: number;
    next_page_url?: string;
  };
  results: Array<{
    rollup: {
      average_rating: number;
      review_count: number;
      rating_count: number;
    };
    reviews: PRReview[];
  }>;
}

async function fetchTNFReviews(
  productId: string,
  limit = Infinity,
  onBatch?: BatchCallback
): Promise<{ reviews: ScrapedReview[]; product: { title: string; imageUrl: string; rating: number; reviewCount: number } }> {
  const reviews: ScrapedReview[] = [];
  let offset = 0;
  const batchSize = 25;
  let productInfo = { title: '', imageUrl: '', rating: 0, reviewCount: 0 };
  let batchNumber = 1;

  while (reviews.length < limit) {
    const apiUrl = `https://readservices-b2c.powerreviews.com/m/${PR_MERCHANT_ID}/l/en_US/product/${productId}/reviews?apikey=${PR_API_KEY}&_noconfig=true&paging.from=${offset}&paging.size=${batchSize}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`The North Face PowerReviews API error: ${response.status}`);
    }

    const data = await response.json() as PRResponse;
    const result = data.results?.[0];
    if (!result) break;

    // Extract product info on first request
    if (offset === 0 && result.rollup) {
      productInfo = {
        title: result.reviews?.[0]?.details?.product_name || '',
        imageUrl: '',
        rating: result.rollup.average_rating || 0,
        reviewCount: result.rollup.review_count || 0,
      };
    }

    if (!result.reviews || result.reviews.length === 0) break;

    // Collect reviews from this batch
    const batchReviews: ScrapedReview[] = [];
    for (const review of result.reviews) {
      if (reviews.length >= limit) break;
      const headline = review.details?.headline || '';
      const comments = review.details?.comments || '';
      const text = headline ? `${headline}. ${comments}` : comments;
      if (text) {
        const date = review.details?.created_date
          ? new Date(review.details.created_date).toISOString().split('T')[0]
          : '';
        const scrapedReview: ScrapedReview = {
          text,
          rating: review.metrics?.rating || 0,
          date,
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
        estimatedTotal: productInfo.reviewCount || data.paging.total_results,
      });
    }

    if (result.reviews.length < batchSize) break;
    if (!data.paging.next_page_url) break;
    offset += batchSize;
    await politeDelay(500);
  }

  return { reviews, product: productInfo };
}

export const theNorthFaceScraper: ReviewScraper = {
  name: 'the-north-face',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('thenorthface.com');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const productId = extractProductIdFromUrl(url);
    if (!productId) {
      throw new Error('Could not extract product ID from The North Face URL');
    }

    console.log(`  The North Face Product ID: ${productId}`);

    // Fetch product image from the page (PowerReviews API doesn't include images)
    const imageUrl = await fetchProductImage(url);

    const { reviews, product } = await fetchTNFReviews(productId, Infinity, onBatch);

    if (reviews.length === 0) {
      throw new Error(
        'No reviews found for this The North Face product. The product may be too new or the product ID may be incorrect.'
      );
    }

    console.log(`  Fetched ${reviews.length} reviews via PowerReviews API`);

    return {
      product: {
        title: product.title || 'Unknown Product',
        imageUrl: imageUrl || product.imageUrl,
        rating: Math.round(product.rating * 10) / 10,
        reviewCount: product.reviewCount || reviews.length,
      },
      reviews,
      source: 'the-north-face',
    };
  },
};
