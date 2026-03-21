import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createPage, closePage } from './baseScraper.js';

export const genericScraper: ReviewScraper = {
  name: 'generic',

  canHandle(_url: string): boolean {
    // Generic scraper is the fallback — always returns true
    return true;
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const page = await createPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const result = await page.evaluate(() => {
        const reviews: Array<{ text: string; rating: number; date: string }> = [];

        // Strategy 1: JSON-LD structured data
        const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of ldScripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            const items = Array.isArray(data) ? data : [data];

            for (const item of items) {
              // Look for Product with reviews
              if (item['@type'] === 'Product' && item.review) {
                const revs = Array.isArray(item.review) ? item.review : [item.review];
                for (const r of revs) {
                  const text = r.reviewBody || r.description || '';
                  const rating = r.reviewRating?.ratingValue
                    || r.ratingValue || 0;
                  const date = r.datePublished || '';
                  if (text) {
                    reviews.push({
                      text,
                      rating: Number(rating) || 0,
                      date: typeof date === 'string' ? date.split('T')[0] : '',
                    });
                  }
                }
              }
            }
          } catch {
            // Skip invalid JSON-LD
          }
        }

        // Strategy 2: Common review DOM patterns
        if (reviews.length === 0) {
          const selectors = [
            '[data-review-text]',
            '.review-text',
            '.review-body',
            '.review-content',
            '[itemprop="reviewBody"]',
            '.bv-content-summary-body-text',
            '.pr-rd-description-text',
          ];

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              elements.forEach((el) => {
                const text = el.textContent?.trim() || '';
                if (text && text.length > 20) {
                  // Try to find associated rating
                  const parent = el.closest('[data-review], .review, .review-item, [itemprop="review"]');
                  const ratingEl = parent?.querySelector('[data-rating], [itemprop="ratingValue"], .star-rating, .rating-value');
                  const ratingStr = ratingEl?.getAttribute('data-rating')
                    || ratingEl?.getAttribute('content')
                    || ratingEl?.textContent?.match(/(\d(?:\.\d)?)/)?.[1] || '';
                  const dateEl = parent?.querySelector('[itemprop="datePublished"], .review-date, time');
                  const dateStr = dateEl?.getAttribute('datetime')
                    || dateEl?.getAttribute('content')
                    || dateEl?.textContent?.trim() || '';

                  reviews.push({
                    text,
                    rating: Number(ratingStr) || 0,
                    date: dateStr.split('T')[0] || '',
                  });
                }
              });
              break;
            }
          }
        }

        // Get product info
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        const h1 = document.querySelector('h1')?.textContent?.trim();

        // Try to get rating from structured data or meta
        let rating = 0;
        let reviewCount = 0;
        for (const script of ldScripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item.aggregateRating) {
                rating = Number(item.aggregateRating.ratingValue) || 0;
                reviewCount = Number(item.aggregateRating.reviewCount) || 0;
              }
            }
          } catch {
            // Skip
          }
        }

        return {
          product: {
            title: ogTitle || h1 || document.title || 'Unknown Product',
            imageUrl: ogImage || '',
            rating,
            reviewCount: reviewCount || reviews.length,
          },
          reviews,
        };
      });

      if (result.reviews.length === 0) {
        throw new Error(
          'Could not find reviews on this page. The site may require a specific scraper or load reviews dynamically.'
        );
      }

      return {
        product: result.product,
        reviews: result.reviews,
        source: 'generic',
      };
    } finally {
      await closePage(page);
    }
  },
};
