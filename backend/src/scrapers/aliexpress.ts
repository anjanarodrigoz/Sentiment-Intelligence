import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createStealthPage, closePage } from './baseScraper.js';
import { delay, politeDelay } from '../utils/rateLimit.js';

/**
 * AliExpress scraper – extracts reviews from AliExpress product pages.
 * AliExpress renders reviews via JavaScript with a tabbed interface.
 *
 * NOTE: All page.evaluate() calls use string expressions
 * to avoid esbuild/tsx __name() decorator injection which breaks in browser context.
 */

const EXTRACT_PAGE_META_JS = `(() => {
  var title = '';
  var imageUrl = '';
  var rating = 0;
  var reviewCount = 0;

  // Title
  var titleEl = document.querySelector('h1[data-pl="product-title"], h1.product-title-text, h1');
  if (titleEl) title = titleEl.textContent.trim();
  if (!title) {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) title = ogTitle.getAttribute('content') || '';
  }

  // Image
  var imgEl = document.querySelector('.magnifier-image, img[class*="product-img"], .image-view-magnifier-wrap img');
  if (imgEl) imageUrl = imgEl.getAttribute('src') || '';
  if (!imageUrl) {
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) imageUrl = ogImage.getAttribute('content') || '';
  }

  // Rating
  var ratingEl = document.querySelector('[class*="overview-rating"], .overview-rating-average, [class*="product-rating"]');
  if (ratingEl) {
    var m = (ratingEl.textContent || '').match(/(\\d(?:\\.\\d)?)\\s*/);
    if (m) rating = parseFloat(m[1]);
  }

  // Review count
  var countEl = document.querySelector('[class*="product-reviewer-reviews"], [class*="reviews-count"], [class*="product-review-count"]');
  if (countEl) {
    var cm = (countEl.textContent || '').match(/([\\d,]+)/);
    if (cm) reviewCount = parseInt(cm[1].replace(/,/g, ''));
  }

  // Try JSON-LD
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var script of scripts) {
    try {
      var data = JSON.parse(script.textContent || '');
      if (data.aggregateRating) {
        if (!rating) rating = parseFloat(data.aggregateRating.ratingValue) || 0;
        if (!reviewCount) reviewCount = parseInt(data.aggregateRating.reviewCount) || 0;
      }
    } catch (e) {}
  }

  return { title: title, imageUrl: imageUrl, rating: rating, reviewCount: reviewCount };
})()`;

const CLICK_REVIEWS_TAB_JS = `(() => {
  // Click the "Reviews" tab on AliExpress product pages
  var tabs = document.querySelectorAll('[class*="tab"], [role="tab"], .product-tabs a, .product-tabs li');
  for (var tab of tabs) {
    var text = (tab.textContent || '').trim().toLowerCase();
    if (text.includes('review') || text.includes('feedback')) {
      tab.click();
      return 'clicked tab: ' + text.substring(0, 40);
    }
  }
  // Scroll to reviews section
  var section = document.querySelector('[id*="review"], [class*="review-list"], [class*="feedback"]');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return 'scrolled to section';
  }
  return 'nothing found';
})()`;

const EXTRACT_REVIEWS_JS = `(() => {
  var reviews = [];

  // Strategy 1: Modern AliExpress review cards
  var reviewEls = document.querySelectorAll(
    '[class*="review-item"], [class*="feedback-item"], ' +
    '[class*="review--wrap"], [class*="list--item"], ' +
    '.buyer-review, .feedback-list-wrap .feedback-item'
  );

  for (var el of reviewEls) {
    var rating = 0;
    var text = '';
    var date = '';

    // Rating from stars
    var starEl = el.querySelector('[class*="star-rate"], [class*="rating"], [style*="width"]');
    if (starEl) {
      var style = starEl.getAttribute('style') || '';
      var wm = style.match(/width:\\s*(\\d+(?:\\.\\d+)?)%/);
      if (wm) {
        rating = Math.round((parseFloat(wm[1]) / 100) * 5);
      }
    }
    if (!rating) {
      var filled = el.querySelectorAll('[class*="star"][class*="full"], [class*="star"][class*="active"], svg[class*="star"]');
      if (filled.length > 0 && filled.length <= 5) rating = filled.length;
    }
    if (!rating) {
      var ratingText = el.querySelector('[class*="star-score"], [class*="rating-value"]');
      if (ratingText) {
        var rm = (ratingText.textContent || '').match(/(\\d(?:\\.\\d)?)/);
        if (rm) rating = parseFloat(rm[1]);
      }
    }

    // Text
    var bodyEl = el.querySelector(
      '[class*="review-content"], [class*="feedback-text"], ' +
      '[class*="review-text"], [class*="buyer-feedback"] span, dt'
    );
    if (bodyEl) text = bodyEl.textContent.trim();

    // Fallback: longest text block
    if (!text) {
      var spans = el.querySelectorAll('span, p, div, dt');
      var longest = '';
      for (var s of spans) {
        var t = (s.textContent || '').trim();
        if (t.length > longest.length && t.length > 20 && t.length < 3000) longest = t;
      }
      text = longest;
    }

    if (!text || text.length < 10) continue;

    // Date
    var dateEl = el.querySelector('[class*="review-time"], [class*="feedback-time"], time, [class*="date"]');
    if (dateEl) {
      var dateText = dateEl.getAttribute('datetime') || (dateEl.textContent || '').trim();
      if (dateText) {
        try { date = new Date(dateText).toISOString().split('T')[0]; } catch(e) { date = ''; }
      }
    }

    reviews.push({ text: text, rating: rating, date: date });
  }

  return { reviews: reviews };
})()`;

const CLICK_NEXT_PAGE_JS = `(() => {
  // AliExpress pagination
  var nextBtn = document.querySelector(
    '[class*="pagination"] [class*="next"]:not([class*="disabled"]), ' +
    '.comet-pagination-next:not(.comet-pagination-disabled), ' +
    'button[class*="next-page"]:not([disabled])'
  );
  if (nextBtn) {
    nextBtn.click();
    return true;
  }
  // Try numbered pagination
  var active = document.querySelector('[class*="pagination"] .active, [class*="pagination"] [class*="current"]');
  if (active && active.nextElementSibling) {
    var nextA = active.nextElementSibling.querySelector('a, button') || active.nextElementSibling;
    if (nextA && nextA.click) {
      nextA.click();
      return true;
    }
  }
  return false;
})()`;

export const aliexpressScraper: ReviewScraper = {
  name: 'aliexpress',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('aliexpress.com') || hostname.includes('aliexpress.');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const page = await createStealthPage();

    try {
      console.log('  AliExpress: Loading product page...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(5000);

      // Extract product metadata
      const pageMeta = await page.evaluate(EXTRACT_PAGE_META_JS) as {
        title: string; imageUrl: string; rating: number; reviewCount: number;
      };
      console.log(`  AliExpress: Product "${pageMeta.title}", ${pageMeta.reviewCount} reviews`);

      // Scroll down and click reviews tab
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.5)');
      await delay(2000);

      const tabResult = await page.evaluate(CLICK_REVIEWS_TAB_JS) as string;
      console.log('  AliExpress: Reviews tab:', tabResult);
      await delay(3000);

      // Extract reviews with pagination
      const allReviews: ScrapedReview[] = [];
      let batchNumber = 1;
      let maxPages = 50;

      while (maxPages-- > 0) {
        const result = await page.evaluate(EXTRACT_REVIEWS_JS) as {
          reviews: ScrapedReview[];
        };

        // Deduplicate
        const existingTexts = new Set(allReviews.map((r) => r.text));
        const newReviews = result.reviews.filter((r) => !existingTexts.has(r.text));

        if (newReviews.length === 0 && allReviews.length > 0) break;

        allReviews.push(...newReviews);

        if (onBatch && newReviews.length > 0) {
          onBatch({
            batchNumber: batchNumber++,
            reviews: newReviews,
            totalFetched: allReviews.length,
            estimatedTotal: pageMeta.reviewCount || undefined,
          });
        }

        // Try next page
        const hasMore = await page.evaluate(CLICK_NEXT_PAGE_JS) as boolean;
        if (!hasMore) break;
        await politeDelay(3000);
      }

      if (allReviews.length === 0) {
        throw new Error(
          'No reviews found for this AliExpress product. The page may require login or the product has no reviews.'
        );
      }

      console.log(`  AliExpress: Fetched ${allReviews.length} reviews`);

      return {
        product: {
          title: pageMeta.title || 'Unknown Product',
          imageUrl: pageMeta.imageUrl,
          rating: Math.round(pageMeta.rating * 10) / 10,
          reviewCount: pageMeta.reviewCount || allReviews.length,
        },
        reviews: allReviews,
        source: 'aliexpress',
      };
    } finally {
      await closePage(page);
    }
  },
};
