import type { HTTPResponse } from 'puppeteer';
import type { ReviewScraper, ScrapeResult, ScrapedReview } from './types.js';
import { createFullPage, closePage } from './baseScraper.js';
import { delay, politeDelay } from '../utils/rateLimit.js';

/**
 * Victoria's Secret uses a BazaarVoice-like API at:
 *   https://api.victoriassecret.com/ratings-and-reviews/v5/reviews
 *
 * Query params:
 *   filter=productid:<id>  — the product ID (discovered from network intercept)
 *   include=products,authors
 *   stats=reviews
 *   limit=100              — page size (max 100)
 *   offset=0               — pagination offset
 *   sort=submissiontime:desc
 *   activeCountry=US|LK    — locale
 *
 * Response shape (BazaarVoice Conversations API):
 *   { Limit, Offset, TotalResults, Results: [...], Includes: { Products: {...} } }
 */

const VS_REVIEWS_BASE = 'https://api.victoriassecret.com/ratings-and-reviews/v5/reviews';
const PAGE_SIZE = 100;

interface VSReviewResponse {
  Limit: number;
  Offset: number;
  TotalResults: number;
  Results: Array<{
    Id: string;
    Rating: number;
    ReviewText: string;
    Title?: string;
    SubmissionTime: string;
  }>;
  Includes?: {
    Products?: Record<string, {
      Name?: string;
      ImageUrl?: string;
      ReviewStatistics?: {
        AverageOverallRating?: number;
        TotalReviewCount?: number;
      };
    }>;
  };
  HasErrors: boolean;
}

function parseVSReviews(data: VSReviewResponse): ScrapedReview[] {
  if (!data.Results || !Array.isArray(data.Results)) return [];

  return data.Results
    .filter((r) => r.ReviewText && r.ReviewText.length >= 10)
    .map((r) => ({
      text: r.Title ? `${r.Title}. ${r.ReviewText}` : r.ReviewText,
      rating: r.Rating || 0,
      date: r.SubmissionTime ? r.SubmissionTime.split('T')[0] : '',
    }));
}

function extractProductInfo(data: VSReviewResponse): { title: string; imageUrl: string; rating: number; reviewCount: number } {
  let title = '';
  let imageUrl = '';
  let rating = 0;
  let reviewCount = data.TotalResults || 0;

  if (data.Includes?.Products) {
    const product = Object.values(data.Includes.Products)[0];
    if (product) {
      title = product.Name || '';
      imageUrl = product.ImageUrl || '';
      rating = product.ReviewStatistics?.AverageOverallRating || 0;
      reviewCount = product.ReviewStatistics?.TotalReviewCount || reviewCount;
    }
  }

  return { title, imageUrl, rating: Math.round(rating * 10) / 10, reviewCount };
}

async function fetchVSReviews(
  productId: string,
  activeCountry: string,
): Promise<ScrapeResult> {
  const allReviews: ScrapedReview[] = [];
  let productInfo = { title: '', imageUrl: '', rating: 0, reviewCount: 0 };
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      'filter': `productid:${productId}`,
      'include': 'products,authors',
      'stats': 'reviews',
      'limit': String(PAGE_SIZE),
      'offset': String(offset),
      'sort': 'submissiontime:desc',
      'activeCountry': activeCountry,
    });

    const url = `${VS_REVIEWS_BASE}?${params}`;
    console.log(`  VS: Fetching reviews offset=${offset}...`);

    const resp = await fetch(url);
    if (!resp.ok) {
      console.log(`  VS: API returned status ${resp.status}`);
      break;
    }

    const data = (await resp.json()) as VSReviewResponse;

    if (data.HasErrors) {
      console.log(`  VS: API returned errors`);
      break;
    }

    // Extract product info from first page
    if (offset === 0) {
      productInfo = extractProductInfo(data);
      console.log(`  VS: Product: "${productInfo.title}", Total reviews: ${productInfo.reviewCount}`);
    }

    const pageReviews = parseVSReviews(data);
    if (pageReviews.length === 0) break;

    allReviews.push(...pageReviews);
    console.log(`  VS: Collected ${allReviews.length}/${productInfo.reviewCount}`);

    if (allReviews.length >= data.TotalResults) break;
    if (data.Results.length < PAGE_SIZE) break;

    offset += PAGE_SIZE;
    await politeDelay(300);
  }

  return {
    product: productInfo,
    reviews: allReviews,
    source: 'victorias-secret',
  };
}

export const victoriaSecretScraper: ReviewScraper = {
  name: 'victorias-secret',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('victoriassecret.com');
    } catch {
      return false;
    }
  },

  async scrape(url: string): Promise<ScrapeResult> {
    const page = await createFullPage();

    // Intercept network requests to discover the VS product ID
    const captured: {
      productId: string | null;
      activeCountry: string;
    } = { productId: null, activeCountry: 'US' };

    const responseHandler = async (response: HTTPResponse) => {
      const responseUrl = response.url();

      // Look for the reviews API call to discover productid
      if (!responseUrl.includes('ratings-and-reviews') || !responseUrl.includes('reviews')) return;

      const match = responseUrl.match(/filter=productid(?:%3A|:)(\d+)/i);
      if (match && !captured.productId) {
        captured.productId = match[1];
        console.log(`  VS: Discovered productId: ${captured.productId}`);
      }

      const countryMatch = responseUrl.match(/activeCountry=([A-Z]{2})/i);
      if (countryMatch) {
        captured.activeCountry = countryMatch[1];
      }
    };

    page.on('response', responseHandler);

    try {
      console.log(`  VS: Loading product page to discover product ID...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

      await delay(3000);

      // Scroll to trigger review section loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight * 0.5);
      });
      await delay(2000);

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight * 0.8);
      });
      await delay(2000);

      // Click "Reviews" tab if present
      await page.evaluate(() => {
        const clickTargets = document.querySelectorAll(
          'a, button, [role="tab"], [data-testid*="review"], [class*="review"], [class*="Review"]'
        );
        for (const el of clickTargets) {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('review') && !text.includes('write')) {
            (el as HTMLElement).click();
            break;
          }
        }
      });
      await delay(3000);

      // Get fallback product info from page meta tags
      const pageMeta = await page.evaluate(() => {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        const h1 = document.querySelector('h1')?.textContent?.trim();
        return {
          title: ogTitle || h1 || document.title || 'Unknown Product',
          imageUrl: ogImage || '',
        };
      });

      // Done with Puppeteer — close the page
      page.off('response', responseHandler);
      await closePage(page);

      if (!captured.productId) {
        throw new Error(
          'Could not discover Victoria\'s Secret product ID. ' +
          'The page may not have reviews or the review section did not load.'
        );
      }

      // Now fetch all reviews directly via the API
      console.log(`  VS: Fetching all reviews for productId ${captured.productId} (country: ${captured.activeCountry})...`);
      const result = await fetchVSReviews(captured.productId, captured.activeCountry);

      // Use page meta as fallback for product info
      if (!result.product.title || result.product.title === 'Unknown Product') {
        result.product.title = pageMeta.title;
      }
      if (!result.product.imageUrl) {
        result.product.imageUrl = pageMeta.imageUrl;
      }

      if (result.reviews.length === 0) {
        throw new Error('No reviews found for this Victoria\'s Secret product.');
      }

      console.log(`  VS: Done! Fetched ${result.reviews.length} total reviews`);
      return result;
    } finally {
      page.off('response', responseHandler);
      await closePage(page);
    }
  },
};
