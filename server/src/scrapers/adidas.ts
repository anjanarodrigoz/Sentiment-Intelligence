import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createStealthPage, closePage } from './baseScraper.js';
import { delay, politeDelay } from '../utils/rateLimit.js';

/**
 * Adidas scraper – targets Adidas's native React review components.
 * Adidas does NOT use BazaarVoice; reviews are standard DOM elements
 * with CSS-module hashed class names (e.g. ratings-reviews_content-wrapper__hash).
 *
 * NOTE: All page.evaluate() calls use string expressions
 * to avoid esbuild/tsx __name() decorator injection which breaks in browser context.
 */

// Browser-side JS passed as strings to page.evaluate() to bypass bundler transforms.

const EXTRACT_PAGE_META_JS = `(() => {
  var ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  var ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  var h1 = document.querySelector('h1')?.textContent?.trim() || '';
  var rating = 0;
  var reviewCount = 0;
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var script of scripts) {
    try {
      var data = JSON.parse(script.textContent || '');
      if (data.aggregateRating) {
        rating = parseFloat(data.aggregateRating.ratingValue) || 0;
        reviewCount = parseInt(data.aggregateRating.reviewCount) || 0;
      }
      if (data['@graph']) {
        for (var item of data['@graph']) {
          if (item.aggregateRating) {
            rating = parseFloat(item.aggregateRating.ratingValue) || 0;
            reviewCount = parseInt(item.aggregateRating.reviewCount) || 0;
          }
        }
      }
    } catch (e) {}
  }
  return { title: ogTitle || h1 || document.title || '', imageUrl: ogImage || '', rating: rating, reviewCount: reviewCount };
})()`;

const EXPAND_REVIEWS_JS = `(() => {
  // Click the reviews accordion header to expand the section
  var accordion = document.querySelector('[class*="accordion-title_reviews-header"], [class*="reviews-header"], [class*="ReviewsHeader"]');
  if (accordion) {
    accordion.click();
    return 'clicked accordion: ' + (accordion.className || '').substring(0, 80);
  }
  // Try any clickable element containing "Reviews" text
  var clickables = document.querySelectorAll('button, a, [role="tab"], [role="button"], h2, h3, div[class*="accordion"]');
  for (var el of clickables) {
    var text = (el.textContent || '').trim();
    if (/^reviews/i.test(text) || /reviews\\s*\\(/i.test(text)) {
      el.click();
      return 'clicked: ' + text.substring(0, 60);
    }
  }
  // Scroll to reviews section as fallback
  var section = document.querySelector('#navigation-target-reviews, [id*="reviews"], [class*="ratings-reviews"]');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return 'scrolled to section';
  }
  return 'nothing found';
})()`;

const EXTRACT_REVIEWS_JS = `(() => {
  var reviews = [];
  var debug = { strategy: 'none', candidateCount: 0, containerFound: false };

  // Find the reviews container using known Adidas CSS module class patterns
  var container = document.querySelector('[class*="ratings-reviews_content-wrapper"]')
    || document.querySelector('[class*="ratings-reviews-layout"]')
    || document.querySelector('[class*="ratings-reviews"]');

  if (!container) {
    return { reviews: reviews, debug: debug };
  }
  debug.containerFound = true;

  var extractReview = function(el) {
    var rating = 0;

    // Rating from aria-label (e.g. "4 out of 5 stars")
    var starEl = el.querySelector('[aria-label*="star" i], [aria-label*="rating" i], [aria-label*="Star"]');
    if (starEl) {
      var label = starEl.getAttribute('aria-label') || '';
      var m = label.match(/(\\d(?:\\.\\d)?)\\s*(?:out of|of|[/])\\s*5/i);
      if (m) rating = parseFloat(m[1]);
      if (!rating) {
        m = label.match(/(\\d)\\s*star/i);
        if (m) rating = parseInt(m[1]);
      }
    }

    // Rating from filled star count
    if (!rating) {
      var filled = el.querySelectorAll('[class*="filled" i], [class*="Full"], [class*="active" i], [data-testid*="filled"]');
      if (filled.length > 0 && filled.length <= 5) rating = filled.length;
    }

    // Rating from star width percentage
    if (!rating) {
      var starBar = el.querySelector('[class*="star" i] [style*="width"], [class*="rating" i] [style*="width"]');
      if (starBar && starBar.style && starBar.style.width) {
        var pct = parseFloat(starBar.style.width);
        if (pct > 0 && pct <= 100) rating = Math.round((pct / 100) * 5);
      }
    }

    // Text extraction
    var body = '';
    var bodyEl = el.querySelector(
      '[class*="review-body" i], [class*="review-text" i], [class*="reviewBody"], ' +
      '[class*="review_body"], [class*="description_body"], [class*="ReviewText"]'
    );
    if (bodyEl) body = (bodyEl.textContent || '').trim();

    var title = '';
    var titleEl = el.querySelector(
      '[class*="review-title" i], [class*="ReviewTitle"], [class*="headline" i], ' +
      '[class*="review_title"], h3, h4'
    );
    if (titleEl) title = (titleEl.textContent || '').trim();

    // Fallback: use the longest paragraph-like text
    if (!body) {
      var paras = el.querySelectorAll('p, div, span');
      var longest = '';
      for (var p of paras) {
        var t = (p.textContent || '').trim();
        if (t.length > longest.length && t.length > 20 && t.length < 2000) longest = t;
      }
      body = longest;
    }

    var text = (title && body && title !== body) ? title + '. ' + body : (body || title);
    if (!text || text.length < 10) return null;

    // Date extraction
    var date = '';
    var dateEl = el.querySelector('time, [datetime], [class*="date" i], [class*="Date"]');
    if (dateEl) date = dateEl.getAttribute('datetime') || (dateEl.textContent || '').trim();
    if (date && !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) {
      try { date = new Date(date).toISOString().split('T')[0]; } catch(e) { date = ''; }
    }

    return { text: text, rating: rating, date: date };
  };

  // Strategy 1: CSS module class patterns for individual review cards
  var cards = container.querySelectorAll(
    '[class*="review-card" i], [class*="review_card" i], ' +
    '[class*="review-item" i], [class*="review_item" i], ' +
    '[class*="individual-review" i], [class*="single-review" i], ' +
    '[class*="review-entry" i], [class*="review_container" i], ' +
    '[data-auto-id*="review-card"], [data-testid*="review-card"]'
  );

  if (cards.length > 0) {
    debug.strategy = 'css-module-cards';
    debug.candidateCount = cards.length;
    for (var el of cards) {
      var r = extractReview(el);
      if (r) reviews.push(r);
    }
  }

  // Strategy 2: List items or articles within the reviews container
  if (reviews.length === 0) {
    cards = container.querySelectorAll('li, article, [role="listitem"]');
    var filtered = [];
    for (var el of cards) {
      var textLen = (el.textContent || '').trim().length;
      if (textLen > 30 && textLen < 5000) filtered.push(el);
    }
    if (filtered.length > 0) {
      debug.strategy = 'list-items';
      debug.candidateCount = filtered.length;
      for (var el of filtered) {
        var r = extractReview(el);
        if (r) reviews.push(r);
      }
    }
  }

  // Strategy 3: Heuristic - find leaf-most divs containing star/rating elements
  if (reviews.length === 0) {
    var allDivs = container.querySelectorAll('div, section');
    var candidates = [];
    for (var d of allDivs) {
      var txtLen = (d.textContent || '').trim().length;
      if (txtLen < 30 || txtLen > 5000) continue;
      var hasRating = d.querySelector(
        '[class*="star" i], [class*="rating" i], [aria-label*="star" i], svg'
      );
      if (!hasRating) continue;
      candidates.push(d);
    }
    // Keep only leaf-most candidates (remove parents that contain other candidates)
    var leafCards = [];
    for (var c of candidates) {
      var isParent = false;
      for (var other of candidates) {
        if (other !== c && c.contains(other)) { isParent = true; break; }
      }
      if (!isParent) leafCards.push(c);
    }
    if (leafCards.length > 0) {
      debug.strategy = 'heuristic-leaf-divs';
      debug.candidateCount = leafCards.length;
      for (var el of leafCards) {
        var r = extractReview(el);
        if (r) reviews.push(r);
      }
    }
  }

  return { reviews: reviews, debug: debug };
})()`;

const CLICK_SHOW_MORE_JS = `(() => {
  var container = document.querySelector('[class*="ratings-reviews_content-wrapper"]')
    || document.querySelector('[class*="ratings-reviews-layout"]')
    || document.querySelector('[class*="ratings-reviews"]')
    || document.body;

  // Look for "Show More", "Load More", "Next" buttons
  var buttons = container.querySelectorAll('button, a, [role="button"]');
  for (var btn of buttons) {
    var text = (btn.textContent || '').trim().toLowerCase();
    if ((text.includes('show more') || text.includes('load more') || text.includes('more reviews')
        || text === 'next' || text === '>') && !btn.hasAttribute('disabled')) {
      btn.click();
      return true;
    }
  }

  // Look for pagination next button by class
  var nextBtn = container.querySelector(
    '[class*="next-page" i], [class*="NextPage"], [class*="pagination-next" i], ' +
    '[aria-label*="Next" i]:not([disabled])'
  );
  if (nextBtn && !nextBtn.hasAttribute('disabled')) {
    nextBtn.click();
    return true;
  }

  return false;
})()`;

// Detailed DOM inspection for debugging when extraction fails
const INSPECT_REVIEWS_JS = `(() => {
  var result = { wrapperFound: false, wrapperClass: '', childStructure: [], uniqueClassPrefixes: [], htmlSnippet: '' };

  var wrapper = document.querySelector('[class*="ratings-reviews_content-wrapper"]')
    || document.querySelector('[class*="ratings-reviews-layout"]')
    || document.querySelector('[class*="ratings-reviews"]')
    || (document.getElementById('navigation-target-reviews') || {}).parentElement;

  if (!wrapper) {
    var candidates = document.querySelectorAll('[class*="review"]');
    for (var c of candidates) {
      if ((c.textContent || '').length > 500 && c.children.length > 2) {
        wrapper = c;
        break;
      }
    }
  }

  if (!wrapper) return result;

  result.wrapperFound = true;
  result.wrapperClass = (wrapper.className || '').substring(0, 200);

  // Direct children structure
  for (var i = 0; i < Math.min(wrapper.children.length, 20); i++) {
    var child = wrapper.children[i];
    result.childStructure.push({
      tag: child.tagName,
      cls: (child.className || '').substring(0, 120),
      children: child.children.length,
      textLen: (child.textContent || '').length
    });
  }

  // Unique CSS module class prefixes (strip __hash suffix)
  var prefixSet = {};
  var allEls = wrapper.querySelectorAll('*');
  for (var el of allEls) {
    var cls = el.className;
    if (typeof cls !== 'string' || !cls) continue;
    var parts = cls.split(' ');
    for (var p of parts) {
      var prefix = p.replace(/__[A-Za-z0-9_-]+$/, '');
      if (prefix.length > 3) prefixSet[prefix] = true;
    }
  }
  result.uniqueClassPrefixes = Object.keys(prefixSet).slice(0, 80);

  // HTML snippet of the first 5000 chars
  result.htmlSnippet = wrapper.innerHTML.substring(0, 5000);

  return result;
})()`;

export const adidasScraper: ReviewScraper = {
  name: 'adidas',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('adidas.com');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const page = await createStealthPage();

    try {
      console.log('  Adidas: Loading product page...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(5000);

      // Extract product metadata
      const pageMeta = await page.evaluate(EXTRACT_PAGE_META_JS) as {
        title: string; imageUrl: string; rating: number; reviewCount: number;
      };
      console.log(`  Adidas: Product "${pageMeta.title}", ${pageMeta.reviewCount} reviews`);

      // Scroll down to trigger lazy loading
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.5)');
      await delay(2000);
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.7)');
      await delay(2000);

      // Expand reviews accordion/section
      const expandResult = await page.evaluate(EXPAND_REVIEWS_JS) as string;
      console.log('  Adidas: Expand reviews:', expandResult);
      await delay(3000);

      // Scroll to reviews area
      await page.evaluate(`(() => {
        var section = document.querySelector('#navigation-target-reviews, [class*="ratings-reviews"]');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo(0, document.body.scrollHeight * 0.9);
      })()`);
      await delay(3000);

      // Extract reviews with pagination
      const allReviews: ScrapedReview[] = [];
      let batchNumber = 1;
      let maxPages = 50;

      while (maxPages-- > 0) {
        const result = await page.evaluate(EXTRACT_REVIEWS_JS) as {
          reviews: ScrapedReview[];
          debug: { strategy: string; candidateCount: number; containerFound: boolean };
        };

        if (allReviews.length === 0) {
          console.log('  Adidas: Extract debug:', JSON.stringify(result.debug));
        }

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

        // Try to load more reviews
        const hasMore = await page.evaluate(CLICK_SHOW_MORE_JS) as boolean;
        if (!hasMore) break;
        await politeDelay(3000);
      }

      if (allReviews.length === 0) {
        // Run detailed DOM inspection for debugging
        const inspection = await page.evaluate(INSPECT_REVIEWS_JS) as Record<string, unknown>;
        console.log('  Adidas: DOM inspection:', JSON.stringify(inspection, null, 2));

        throw new Error(
          'No reviews found for this Adidas product. DOM inspection logged above for debugging.'
        );
      }

      console.log(`  Adidas: Fetched ${allReviews.length} reviews`);

      return {
        product: {
          title: pageMeta.title || 'Unknown Product',
          imageUrl: pageMeta.imageUrl,
          rating: Math.round(pageMeta.rating * 10) / 10,
          reviewCount: pageMeta.reviewCount || allReviews.length,
        },
        reviews: allReviews,
        source: 'adidas',
      };
    } finally {
      await closePage(page);
    }
  },
};
