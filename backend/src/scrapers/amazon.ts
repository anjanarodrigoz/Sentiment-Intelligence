import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createStealthPage, closePage } from './baseScraper.js';
import { delay, politeDelay } from '../utils/rateLimit.js';

/**
 * Amazon scraper – extracts reviews directly from the product page.
 *
 * Amazon's /product-reviews/ page redirects to sign-in for headless browsers,
 * so we stay on the product page and extract reviews from the inline review
 * section (#cm-cr-dp-review-list / #reviewsMedley).
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
  var titleEl = document.getElementById('productTitle')
    || document.getElementById('title')
    || document.querySelector('#title_feature_div span');
  if (titleEl) title = (titleEl.textContent || '').trim();
  if (!title) {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) title = ogTitle.getAttribute('content') || '';
  }
  if (!title) {
    var h1 = document.querySelector('h1');
    if (h1) title = (h1.textContent || '').trim();
  }

  // Image
  var imgEl = document.getElementById('landingImage')
    || document.getElementById('imgBlkFront')
    || document.querySelector('#main-image-container img');
  if (imgEl) imageUrl = imgEl.getAttribute('data-old-hires') || imgEl.getAttribute('src') || '';
  if (!imageUrl) {
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) imageUrl = ogImage.getAttribute('content') || '';
  }

  // Rating
  var ratingEl = document.querySelector('#acrPopover .a-icon-alt, [data-hook="rating-out-of-text"], .a-icon-alt');
  if (ratingEl) {
    var m = (ratingEl.textContent || '').match(/(\\d(?:\\.\\d)?)\\s*out of/i);
    if (m) rating = parseFloat(m[1]);
  }

  // Review count
  var countEl = document.getElementById('acrCustomerReviewCount')
    || document.querySelector('[data-hook="total-review-count"]')
    || document.querySelector('#acrCustomerReviewLink span');
  if (countEl) {
    var cm = (countEl.textContent || '').match(/([\\d,]+)/);
    if (cm) reviewCount = parseInt(cm[1].replace(/,/g, ''));
  }

  // Try JSON-LD structured data
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

const SCROLL_TO_REVIEWS_JS = `(() => {
  // Scroll to the reviews section on the product page
  var section = document.getElementById('reviewsMedley')
    || document.getElementById('cm-cr-dp-review-list')
    || document.getElementById('reviews-medley-footer')
    || document.querySelector('[data-hook="top-customer-reviews-widget"]')
    || document.querySelector('#customer_review_link');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return 'scrolled to: ' + (section.id || section.className || '').substring(0, 60);
  }
  // Fallback: scroll to bottom area
  window.scrollTo(0, document.body.scrollHeight * 0.75);
  return 'scrolled to 75%';
})()`;

const EXTRACT_REVIEWS_JS = `(() => {
  var reviews = [];
  var debug = { selectors: [], totalFound: 0, bodyText: '' };

  // Strategy 1: data-hook="review" (works on product page review section)
  var reviewEls = document.querySelectorAll('[data-hook="review"]');
  debug.selectors.push('data-hook-review:' + reviewEls.length);

  // Strategy 2: customer review divs by ID pattern
  if (reviewEls.length === 0) {
    reviewEls = document.querySelectorAll('div[id^="customer_review-"]');
    debug.selectors.push('customer_review-id:' + reviewEls.length);
  }

  // Strategy 3: review list container children
  if (reviewEls.length === 0) {
    var container = document.getElementById('cm-cr-dp-review-list');
    if (container) {
      reviewEls = container.querySelectorAll('.a-section.celwidget');
      debug.selectors.push('cm-cr-dp-celwidget:' + reviewEls.length);
    }
  }

  // Strategy 4: reviewsMedley section
  if (reviewEls.length === 0) {
    var medley = document.getElementById('reviewsMedley');
    if (medley) {
      reviewEls = medley.querySelectorAll('.a-section.review');
      debug.selectors.push('medley-review:' + reviewEls.length);
      if (reviewEls.length === 0) {
        // Try any section with a star rating inside the medley
        var candidates = medley.querySelectorAll('.a-section');
        var filtered = [];
        for (var c of candidates) {
          var hasRating = c.querySelector('.a-icon-alt, i[class*="a-star-"]');
          var textLen = (c.textContent || '').length;
          if (hasRating && textLen > 50 && textLen < 5000) filtered.push(c);
        }
        if (filtered.length > 0) reviewEls = filtered;
        debug.selectors.push('medley-heuristic:' + filtered.length);
      }
    }
  }

  debug.totalFound = reviewEls.length;

  for (var el of reviewEls) {
    var rating = 0;
    var text = '';
    var date = '';

    // Rating from .a-icon-alt text like "5.0 out of 5 stars"
    var starEl = el.querySelector('.a-icon-alt');
    if (starEl) {
      var m = (starEl.textContent || '').match(/(\\d(?:\\.\\d)?)\\s*out of/i);
      if (m) rating = parseFloat(m[1]);
    }
    // Fallback: a-star-N class on the <i> icon
    if (!rating) {
      var starIcon = el.querySelector('i[class*="a-star-"]');
      if (starIcon) {
        var cls = starIcon.className || '';
        var sm = cls.match(/a-star-(\\d)/);
        if (sm) rating = parseInt(sm[1]);
      }
    }

    // Title – Amazon nests the title in a span after the star rating span
    var title = '';
    var titleContainer = el.querySelector('[data-hook="review-title"], .review-title');
    if (titleContainer) {
      var spans = titleContainer.querySelectorAll('span');
      for (var sp of spans) {
        var spText = (sp.textContent || '').trim();
        if (spText && !spText.match(/out of.*star/i) && spText.length > 2) {
          title = spText;
          break;
        }
      }
    }

    // Body
    var bodyEl = el.querySelector('[data-hook="review-body"] span, .review-text-content span, .review-text span');
    var body = '';
    if (bodyEl) {
      body = (bodyEl.textContent || '').trim();
    }

    // Fallback: longest text block that looks like review content
    if (!body) {
      var spans2 = el.querySelectorAll('span, p');
      var longest = '';
      for (var s of spans2) {
        var t = (s.textContent || '').trim();
        if (t.length > longest.length && t.length > 30 && t.length < 5000
            && !t.match(/out of.*star/i) && !t.match(/Reviewed in/i)
            && !t.match(/Verified Purchase/i) && !t.match(/helpful$/i)) {
          longest = t;
        }
      }
      body = longest;
    }

    text = (title && body && title !== body) ? title + '. ' + body : (body || title);
    if (!text || text.length < 10) continue;

    // Date — "Reviewed in the United States on January 15, 2024"
    var dateEl = el.querySelector('[data-hook="review-date"], .review-date');
    if (dateEl) {
      var dateText = (dateEl.textContent || '').trim();
      var dm = dateText.match(/on\\s+(.+)$/i);
      if (dm) {
        try { date = new Date(dm[1]).toISOString().split('T')[0]; } catch(e) { date = ''; }
      }
    }

    reviews.push({ text: text, rating: rating, date: date });
  }

  // If nothing found, capture page state for debugging
  if (reviews.length === 0) {
    debug.bodyText = document.body.innerText.substring(0, 2000);
  }

  return { reviews: reviews, debug: debug };
})()`;

const CLICK_SEE_MORE_JS = `(() => {
  // Look for "See more reviews" link on the product page
  var seeMore = document.querySelector('[data-hook="see-all-reviews-link-foot"]')
    || document.querySelector('#reviews-medley-footer a');
  if (seeMore) {
    // Don't navigate – it will redirect to sign-in. Instead, return the URL
    // so we can check if it's a same-page anchor
    var href = seeMore.getAttribute('href') || '';
    if (href.startsWith('#') || href === '') {
      seeMore.click();
      return 'clicked';
    }
    return 'link:' + href;
  }
  return 'none';
})()`;

export const amazonScraper: ReviewScraper = {
  name: 'amazon',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('amazon.com') || hostname.includes('amazon.co.');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const page = await createStealthPage();

    try {
      console.log('  Amazon: Loading product page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(3000);

      // Extract product metadata
      const pageMeta = await page.evaluate(EXTRACT_PAGE_META_JS) as {
        title: string; imageUrl: string; rating: number; reviewCount: number;
      };
      console.log(`  Amazon: Product "${pageMeta.title}", ${pageMeta.reviewCount} reviews`);

      // Scroll down progressively to trigger lazy-loaded content
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.4)');
      await delay(1500);
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.6)');
      await delay(1500);

      // Scroll to the reviews section
      const scrollResult = await page.evaluate(SCROLL_TO_REVIEWS_JS) as string;
      console.log('  Amazon: Scroll result:', scrollResult);
      await delay(3000);

      // First extraction attempt from the product page
      let result = await page.evaluate(EXTRACT_REVIEWS_JS) as {
        reviews: ScrapedReview[];
        debug: { selectors: string[]; totalFound: number; bodyText: string };
      };

      console.log('  Amazon: Extract debug:', JSON.stringify({
        selectors: result.debug.selectors,
        totalFound: result.debug.totalFound,
      }));

      // If nothing found, scroll more and retry
      if (result.reviews.length === 0) {
        console.log('  Amazon: No reviews on first attempt, scrolling further...');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.9)');
        await delay(3000);

        // Check the "See more" link status
        const seeMoreResult = await page.evaluate(CLICK_SEE_MORE_JS) as string;
        console.log('  Amazon: See more result:', seeMoreResult);
        if (seeMoreResult === 'clicked') {
          await delay(3000);
        }

        result = await page.evaluate(EXTRACT_REVIEWS_JS) as {
          reviews: ScrapedReview[];
          debug: { selectors: string[]; totalFound: number; bodyText: string };
        };
        console.log('  Amazon: Retry debug:', JSON.stringify({
          selectors: result.debug.selectors,
          totalFound: result.debug.totalFound,
        }));
      }

      const allReviews: ScrapedReview[] = [...result.reviews];

      if (allReviews.length > 0 && onBatch) {
        onBatch({
          batchNumber: 1,
          reviews: allReviews,
          totalFetched: allReviews.length,
          estimatedTotal: pageMeta.reviewCount || undefined,
        });
      }

      if (result.debug.bodyText) {
        const snippet = result.debug.bodyText;
        if (snippet.includes('captcha') || snippet.includes('robot') || snippet.includes('automated')
            || snippet.includes('Sign in')) {
          console.log('  Amazon: Bot detection or sign-in wall detected');
          console.log('  Amazon: Page preview:', snippet.substring(0, 300));
        }
      }

      if (allReviews.length === 0) {
        throw new Error(
          'No reviews found for this Amazon product. Amazon may be showing a CAPTCHA/sign-in wall, or the product has no reviews.'
        );
      }

      console.log(`  Amazon: Fetched ${allReviews.length} reviews from product page`);

      return {
        product: {
          title: pageMeta.title || 'Unknown Product',
          imageUrl: pageMeta.imageUrl,
          rating: Math.round(pageMeta.rating * 10) / 10,
          reviewCount: pageMeta.reviewCount || allReviews.length,
        },
        reviews: allReviews,
        source: 'amazon',
      };
    } finally {
      await closePage(page);
    }
  },
};
