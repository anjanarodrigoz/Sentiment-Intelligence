import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { politeDelay } from '../utils/rateLimit.js';

const BV_PASSKEY = 'caNcZjVkX1Gk7UMLWxnq0OlhTFyIorng8qNroUp16nHgU';

function extractProductIdFromUrl(url: string): string {
  const path = new URL(url).pathname;
  // UA URL pattern: /en-us/p/product-name/PRODUCT_ID.html
  const match = path.match(/\/p\/[^/]+\/(\d+)(?:\.html)?/i);
  if (match) return match[1];
  // Fallback: last path segment without extension
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  return last.replace(/\.html$/, '');
}

async function fetchUAReviews(
  productId: string,
  limit = 200,
  onBatch?: BatchCallback
): Promise<{ reviews: ScrapedReview[]; product: { title: string; imageUrl: string; rating: number; reviewCount: number } }> {
  const reviews: ScrapedReview[] = [];
  let offset = 0;
  const batchSize = 100;
  let productInfo = { title: '', imageUrl: '', rating: 0, reviewCount: 0 };
  let batchNumber = 1;

  while (reviews.length < limit) {
    const apiUrl = `https://api.bazaarvoice.com/data/batch.json?passkey=${BV_PASSKEY}&apiversion=5.5&resource.q0=reviews&filter.q0=isratingsonly%3Aeq%3Afalse&filter.q0=productid%3Aeq%3A${productId}&limit.q0=${batchSize}&offset.q0=${offset}&sort.q0=submissiontime%3Adesc&resource.q1=products&filter.q1=id%3Aeq%3A${productId}&Stats.q1=Reviews`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Under Armour BazaarVoice API error: ${response.status}`);
    }

    const data = await response.json() as {
      BatchedResults: {
        q0: {
          Results: Array<{
            ReviewText: string;
            Rating: number;
            SubmissionTime: string;
            Title?: string;
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

    if (offset === 0 && !productInfo.reviewCount && q0.TotalResults) {
      productInfo.reviewCount = q0.TotalResults;
    }

    // Collect reviews from this batch
    const batchReviews: ScrapedReview[] = [];
    for (const review of q0.Results) {
      if (reviews.length >= limit) break;
      const text = review.Title
        ? `${review.Title}. ${review.ReviewText}`
        : review.ReviewText;
      if (text) {
        const scrapedReview = {
          text,
          rating: review.Rating || 0,
          date: review.SubmissionTime?.split('T')[0] || '',
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
        estimatedTotal: q0.TotalResults,
      });
    }

    if (q0.Results.length < batchSize) break;
    offset += batchSize;
    await politeDelay(500);
  }

  return { reviews, product: productInfo };
}

export const underArmourScraper: ReviewScraper = {
  name: 'under-armour',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('underarmour.com');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const productId = extractProductIdFromUrl(url);
    if (!productId) {
      throw new Error('Could not extract product ID from Under Armour URL');
    }

    console.log(`  Under Armour Product ID: ${productId}`);

    const { reviews, product } = await fetchUAReviews(productId, Infinity, onBatch);

    if (reviews.length === 0) {
      throw new Error(
        'No reviews found for this Under Armour product. The product may be too new or the product ID may be incorrect.'
      );
    }

    console.log(`  Fetched ${reviews.length} reviews via BazaarVoice API`);

    return {
      product: {
        title: product.title || 'Unknown Product',
        imageUrl: product.imageUrl,
        rating: Math.round(product.rating * 10) / 10,
        reviewCount: product.reviewCount || reviews.length,
      },
      reviews,
      source: 'under-armour',
    };
  },
};
