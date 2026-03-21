import type { ReviewScraper, ScrapeResult, ScrapedReview, BatchCallback } from './types.js';
import { createStealthPage, closePage } from './baseScraper.js';
import { delay, politeDelay } from '../utils/rateLimit.js';

/**
 * eBay scraper – extracts reviews from eBay product pages (/p/ URLs).
 *
 * eBay product pages render reviews inline. The scraper stays on the
 * product page, scrolls to the reviews section, and extracts from there.
 * Reviews may also live inside JSON-LD structured data.
 *
 * NOTE: All page.evaluate() calls use string expressions
 * to avoid esbuild/tsx __name() decorator injection which breaks in browser context.
 */

const EXTRACT_PAGE_META_JS = `(() => {
  var title = '';
  var imageUrl = '';
  var rating = 0;
  var reviewCount = 0;

  // Title – eBay product pages vs listing pages
  var titleEl = document.querySelector('h1.x-item-title__mainTitle span, h1[itemprop="name"], .product-title, h1');
  if (titleEl) title = (titleEl.textContent || '').trim();
  if (!title) {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) title = ogTitle.getAttribute('content') || '';
  }

  // Image
  var imgEl = document.querySelector('#icImg, .ux-image-carousel-item img, img[itemprop="image"], .vi-image-gallery__image img');
  if (imgEl) imageUrl = imgEl.getAttribute('src') || '';
  if (!imageUrl) {
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) imageUrl = ogImage.getAttribute('content') || '';
  }

  // Helper: clamp rating to 0-5 scale
  var normalizeRating = function(val) {
    var n = parseFloat(val);
    if (isNaN(n) || n <= 0) return 0;
    if (n <= 5) return Math.round(n * 10) / 10;
    if (n <= 10) return Math.round((n / 2) * 10) / 10; // 0-10 scale -> 0-5
    if (n <= 100) return Math.round((n / 20) * 10) / 10; // percentage -> 0-5
    return 0;
  };

  // Try JSON-LD first — most reliable source
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var script of scripts) {
    try {
      var data = JSON.parse(script.textContent || '');
      var items = Array.isArray(data) ? data : [data];
      for (var item of items) {
        if (item['@type'] === 'Product' && item.aggregateRating) {
          var bestScale = parseFloat(item.aggregateRating.bestRating) || 5;
          var rawRating = parseFloat(item.aggregateRating.ratingValue) || 0;
          if (!rating && rawRating > 0) {
            rating = bestScale !== 5 ? Math.round((rawRating / bestScale) * 5 * 10) / 10 : normalizeRating(rawRating);
          }
          if (!reviewCount) reviewCount = parseInt(item.aggregateRating.reviewCount) || 0;
        }
        if (item['@graph']) {
          for (var g of item['@graph']) {
            if (g.aggregateRating) {
              var gBestScale = parseFloat(g.aggregateRating.bestRating) || 5;
              var gRawRating = parseFloat(g.aggregateRating.ratingValue) || 0;
              if (!rating && gRawRating > 0) {
                rating = gBestScale !== 5 ? Math.round((gRawRating / gBestScale) * 5 * 10) / 10 : normalizeRating(gRawRating);
              }
              if (!reviewCount) reviewCount = parseInt(g.aggregateRating.reviewCount) || 0;
            }
          }
        }
      }
    } catch (e) {}
  }

  // Fallback rating from DOM
  if (!rating) {
    var ratingEl = document.querySelector('[itemprop="ratingValue"], [class*="star-rating"] [class*="value"]');
    if (ratingEl) {
      var content = ratingEl.getAttribute('content') || (ratingEl.textContent || '').trim();
      var m = content.match(/(\\d+(?:\\.\\d+)?)/);
      if (m) rating = normalizeRating(m[1]);
    }
  }
  if (!rating) {
    var starEl = document.querySelector('[aria-label*="out of 5 stars"]');
    if (starEl) {
      var m2 = (starEl.getAttribute('aria-label') || '').match(/(\\d+(?:\\.\\d+)?)\\s*out of/i);
      if (m2) rating = normalizeRating(m2[1]);
    }
  }

  // Fallback review count from DOM
  if (!reviewCount) {
    var countEl = document.querySelector('[itemprop="reviewCount"], [class*="review-count"], [class*="reviews-total"]');
    if (countEl) {
      var content2 = countEl.getAttribute('content') || (countEl.textContent || '').trim();
      var cm = content2.match(/([\\d,]+)/);
      if (cm) reviewCount = parseInt(cm[1].replace(/,/g, ''));
    }
  }

  return { title: title, imageUrl: imageUrl, rating: rating, reviewCount: reviewCount };
})()`;

const EXTRACT_JSONLD_REVIEWS_JS = `(() => {
  var reviews = [];

  // eBay embeds reviews in JSON-LD structured data on product pages
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var script of scripts) {
    try {
      var data = JSON.parse(script.textContent || '');
      var items = Array.isArray(data) ? data : [data];
      for (var item of items) {
        var revs = item.review || (item['@type'] === 'Product' && item.review) || [];
        if (!Array.isArray(revs)) revs = [revs];
        for (var r of revs) {
          var text = r.reviewBody || r.description || '';
          var title = r.name || '';
          var fullText = (title && text && title !== text) ? title + '. ' + text : (text || title);
          if (!fullText || fullText.length < 10) continue;

          var rating = 0;
          if (r.reviewRating) {
            rating = parseFloat(r.reviewRating.ratingValue) || 0;
          }

          var date = '';
          if (r.datePublished) {
            try { date = new Date(r.datePublished).toISOString().split('T')[0]; } catch(e) {}
          }

          reviews.push({ text: fullText, rating: rating, date: date });
        }

        // Also check @graph
        if (item['@graph']) {
          for (var g of item['@graph']) {
            var gRevs = g.review || [];
            if (!Array.isArray(gRevs)) gRevs = [gRevs];
            for (var r2 of gRevs) {
              var text2 = r2.reviewBody || r2.description || '';
              var title2 = r2.name || '';
              var fullText2 = (title2 && text2 && title2 !== text2) ? title2 + '. ' + text2 : (text2 || title2);
              if (!fullText2 || fullText2.length < 10) continue;

              var rating2 = 0;
              if (r2.reviewRating) {
                rating2 = parseFloat(r2.reviewRating.ratingValue) || 0;
              }

              var date2 = '';
              if (r2.datePublished) {
                try { date2 = new Date(r2.datePublished).toISOString().split('T')[0]; } catch(e) {}
              }

              reviews.push({ text: fullText2, rating: rating2, date: date2 });
            }
          }
        }
      }
    } catch (e) {}
  }

  return { reviews: reviews, source: 'json-ld' };
})()`;

const SCROLL_TO_REVIEWS_JS = `(() => {
  // Try to find and scroll to the reviews section
  var section = document.querySelector(
    '#reviews-container, #product-reviews, [class*="review-section"], ' +
    '[class*="reviews-container"], [data-testid*="review"], ' +
    '[id*="review"], [class*="rvw"]'
  );
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return 'scrolled to: ' + (section.id || section.className || '').substring(0, 80);
  }
  // Click reviews tab/link if present
  var links = document.querySelectorAll('a, button, [role="tab"]');
  for (var link of links) {
    var text = (link.textContent || '').trim().toLowerCase();
    if ((text.includes('review') || text.includes('rating')) && text.length < 50) {
      var href = link.getAttribute('href') || '';
      if (href.startsWith('#') || href === '' || href === 'javascript:void(0)') {
        link.click();
        return 'clicked tab: ' + text.substring(0, 40);
      }
    }
  }
  window.scrollTo(0, document.body.scrollHeight * 0.7);
  return 'scrolled to 70%';
})()`;

// Inspect the UserReviews container structure for debugging
const INSPECT_REVIEWS_SECTION_JS = `(() => {
  var result = { containerFound: false, containerId: '', containerClass: '', containerTag: '',
                 childCount: 0, children: [], htmlSnippet: '', iframeFound: false, textPreview: '' };

  // Find the reviews container - including 'UserReviews' which eBay uses
  var container = document.getElementById('UserReviews')
    || document.querySelector('[class*="UserReviews"]')
    || document.querySelector('#reviews-container, [class*="review-section"], [class*="reviews-container"]');

  if (!container) {
    // Broader search for anything with "review" in id/class that has substantial content
    var candidates = document.querySelectorAll('[id*="eview"], [class*="eview"]');
    for (var c of candidates) {
      if ((c.textContent || '').length > 200 && c.children.length > 1) {
        container = c;
        break;
      }
    }
  }

  if (!container) return result;

  result.containerFound = true;
  result.containerId = container.id || '';
  result.containerClass = (container.className || '').substring(0, 200);
  result.containerTag = container.tagName;
  result.childCount = container.children.length;
  result.textPreview = (container.textContent || '').trim().substring(0, 1000);

  // Check for iframes inside the reviews section
  var iframes = container.querySelectorAll('iframe');
  if (iframes.length > 0) result.iframeFound = true;

  // Map direct children structure
  for (var i = 0; i < Math.min(container.children.length, 15); i++) {
    var child = container.children[i];
    result.children.push({
      tag: child.tagName,
      id: (child.id || '').substring(0, 60),
      cls: (child.className || '').substring(0, 120),
      childCount: child.children.length,
      textLen: (child.textContent || '').length
    });
  }

  // Grab first 3000 chars of inner HTML for analysis
  result.htmlSnippet = container.innerHTML.substring(0, 3000);

  return result;
})()`;

const EXTRACT_DOM_REVIEWS_JS = `(() => {
  var reviews = [];
  var debug = { selectors: [], totalFound: 0, bodySnippet: '' };

  // Find the reviews container — include eBay's 'UserReviews' section
  var reviewContainer = document.getElementById('UserReviews')
    || document.querySelector('[class*="UserReviews"]')
    || document.querySelector('#reviews-container, [class*="review-section"], [class*="reviews-container"]')
    || document.body;

  // Strategy 1: itemprop="review" elements
  var reviewEls = reviewContainer.querySelectorAll('[itemprop="review"]');
  debug.selectors.push('itemprop-review:' + reviewEls.length);

  // Strategy 2: ebay-specific review containers
  if (reviewEls.length === 0) {
    reviewEls = reviewContainer.querySelectorAll(
      '[class*="review-item"], [class*="ebay-review"], ' +
      '[class*="review-card"], [data-review-id], ' +
      '[class*="rvw-c"], [class*="review__item"], ' +
      '[class*="Reviews__ReviewCard"], [class*="ReviewCard"]'
    );
    debug.selectors.push('ebay-classes:' + reviewEls.length);
  }

  // Strategy 3: look for repeating sibling elements with star ratings inside UserReviews
  if (reviewEls.length === 0 && reviewContainer !== document.body) {
    // Find all elements that contain both a star/rating indicator and text > 30 chars
    var candidates = reviewContainer.querySelectorAll('div, li, article, section, span');
    var filtered = [];
    for (var c of candidates) {
      var hasRating = c.querySelector(
        '[class*="star"], [aria-label*="star" i], [aria-label*="rating" i], ' +
        'svg, [class*="rating"], [class*="Score"]'
      );
      var textLen = (c.textContent || '').trim().length;
      if (hasRating && textLen > 30 && textLen < 5000) filtered.push(c);
    }
    // Keep leaf-most only (remove parents)
    var leaves = [];
    for (var f of filtered) {
      var isParent = false;
      for (var other of filtered) {
        if (other !== f && f.contains(other)) { isParent = true; break; }
      }
      if (!isParent) leaves.push(f);
    }
    if (leaves.length > 0) reviewEls = leaves;
    debug.selectors.push('heuristic-leaves:' + leaves.length);
  }

  // Strategy 4: if container has direct children that look like review cards
  if (reviewEls.length === 0 && reviewContainer !== document.body) {
    var directKids = reviewContainer.children;
    var cardLike = [];
    for (var k = 0; k < directKids.length; k++) {
      var kid = directKids[k];
      var kidText = (kid.textContent || '').trim();
      if (kidText.length > 30 && kidText.length < 5000 && kid.children.length > 0) {
        cardLike.push(kid);
      }
    }
    // If there are multiple similar-sized children, they're likely review cards
    if (cardLike.length >= 2) {
      reviewEls = cardLike;
      debug.selectors.push('direct-children:' + cardLike.length);
    }
  }

  debug.totalFound = reviewEls.length;

  for (var el of reviewEls) {
    var rating = 0;
    var text = '';
    var date = '';

    // Rating from aria-label
    var starEl = el.querySelector('[aria-label*="star" i], [aria-label*="rating" i], [aria-label*="Score" i]');
    if (starEl) {
      var label = starEl.getAttribute('aria-label') || '';
      var m = label.match(/(\\d(?:\\.\\d)?)\\s*(?:out of|of|[/])\\s*5/i);
      if (m) rating = parseFloat(m[1]);
      if (!rating) {
        m = label.match(/(\\d(?:\\.\\d)?)/);
        if (m && parseFloat(m[1]) <= 5) rating = parseFloat(m[1]);
      }
    }
    // Rating from itemprop
    if (!rating) {
      var ratingEl = el.querySelector('[itemprop="ratingValue"]');
      if (ratingEl) {
        var rv = ratingEl.getAttribute('content') || (ratingEl.textContent || '').trim();
        var rm = rv.match(/(\\d(?:\\.\\d)?)/);
        if (rm) rating = parseFloat(rm[1]);
      }
    }
    // Rating from filled stars count
    if (!rating) {
      var filled = el.querySelectorAll(
        '[class*="star"][class*="full"], [class*="star"][class*="active"], ' +
        '[class*="star-icon"], [class*="StarFilled"], [class*="star--on"]'
      );
      if (filled.length > 0 && filled.length <= 5) rating = filled.length;
    }
    // Rating from star width percentage
    if (!rating) {
      var starBar = el.querySelector('[style*="width"]');
      if (starBar && starBar.closest('[class*="star" i], [class*="rating" i]')) {
        var pct = parseFloat(starBar.style.width);
        if (pct > 0 && pct <= 100) rating = Math.round((pct / 100) * 5);
      }
    }

    // Title
    var titleEl = el.querySelector('[itemprop="name"], [class*="review-title" i], [class*="ReviewTitle"], h3, h4');
    var title = titleEl ? (titleEl.textContent || '').trim() : '';

    // Body
    var bodyEl = el.querySelector(
      '[itemprop="reviewBody"], [class*="review-text" i], ' +
      '[class*="review-content" i], [class*="review-body" i], ' +
      '[class*="review-comment" i], [class*="ReviewText"], [class*="ReviewBody"]'
    );
    var body = bodyEl ? (bodyEl.textContent || '').trim() : '';

    // Fallback: longest text block
    if (!body) {
      var spans = el.querySelectorAll('span, p, div');
      var longest = '';
      for (var s of spans) {
        var t = (s.textContent || '').trim();
        if (t.length > longest.length && t.length > 20 && t.length < 3000) longest = t;
      }
      body = longest;
    }

    text = (title && body && title !== body) ? title + '. ' + body : (body || title);
    if (!text || text.length < 10) continue;

    // Skip rating distribution/histogram text (e.g. "2 users rated this 5 out of 5 stars")
    if (/\\d+\\s*users?\\s*rated\\s*this/i.test(text)) continue;
    if (/^\\d+\\s*out of\\s*\\d+\\s*stars?$/i.test(text.trim())) continue;
    // Skip if the entire text is just a short rating snippet
    if (/^\\d+(\\.\\d+)?\\s*(out of|stars|star)/i.test(text.trim()) && text.length < 40) continue;

    // Date
    var dateEl = el.querySelector('[itemprop="datePublished"], [class*="review-date" i], [class*="ReviewDate"], time, [class*="date" i]');
    if (dateEl) {
      var dateText = dateEl.getAttribute('datetime') || dateEl.getAttribute('content') || (dateEl.textContent || '').trim();
      if (dateText) {
        try { date = new Date(dateText).toISOString().split('T')[0]; } catch(e) { date = ''; }
      }
    }

    reviews.push({ text: text, rating: rating, date: date });
  }

  if (reviews.length === 0) {
    // Get text specifically from the reviews container, not document.body
    var rc = document.getElementById('UserReviews') || document.querySelector('[class*="UserReviews"]');
    debug.bodySnippet = rc ? (rc.textContent || '').trim().substring(0, 2000) : document.body.innerText.substring(0, 2000);
  }

  return { reviews: reviews, debug: debug };
})()`;

const CLICK_NEXT_PAGE_JS = `(() => {
  var nextBtn = document.querySelector(
    '[class*="pagination"] [class*="next"]:not([class*="disabled"]):not([aria-disabled="true"]), ' +
    'a.pagination__next:not([aria-disabled="true"]), ' +
    '[aria-label="Next page"]:not([disabled])'
  );
  if (nextBtn) {
    nextBtn.click();
    return true;
  }
  return false;
})()`;

export const ebayScraper: ReviewScraper = {
  name: 'ebay',

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('ebay.com') || hostname.includes('ebay.co.');
    } catch {
      return false;
    }
  },

  async scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult> {
    const page = await createStealthPage();

    try {
      console.log('  eBay: Loading product page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(3000);

      // Extract product metadata
      const pageMeta = await page.evaluate(EXTRACT_PAGE_META_JS) as {
        title: string; imageUrl: string; rating: number; reviewCount: number;
      };
      console.log(`  eBay: Product "${pageMeta.title}", rating: ${pageMeta.rating}, ${pageMeta.reviewCount} reviews`);

      // Try JSON-LD extraction first (most reliable on eBay)
      const jsonLdResult = await page.evaluate(EXTRACT_JSONLD_REVIEWS_JS) as {
        reviews: ScrapedReview[];
        source: string;
      };
      console.log(`  eBay: JSON-LD reviews found: ${jsonLdResult.reviews.length}`);

      const allReviews: ScrapedReview[] = [...jsonLdResult.reviews];

      // If JSON-LD didn't have reviews, try DOM extraction
      if (allReviews.length === 0) {
        // Scroll progressively to trigger lazy loading
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.4)');
        await delay(1500);
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.6)');
        await delay(1500);

        const scrollResult = await page.evaluate(SCROLL_TO_REVIEWS_JS) as string;
        console.log('  eBay: Scroll result:', scrollResult);
        await delay(3000);

        // Extract from DOM
        let domResult = await page.evaluate(EXTRACT_DOM_REVIEWS_JS) as {
          reviews: ScrapedReview[];
          debug: { selectors: string[]; totalFound: number; bodySnippet: string };
        };

        console.log('  eBay: DOM extract debug:', JSON.stringify({
          selectors: domResult.debug.selectors,
          totalFound: domResult.debug.totalFound,
        }));

        if (domResult.reviews.length === 0) {
          // Retry after scrolling further
          await page.evaluate('window.scrollTo(0, document.body.scrollHeight * 0.9)');
          await delay(3000);
          domResult = await page.evaluate(EXTRACT_DOM_REVIEWS_JS) as {
            reviews: ScrapedReview[];
            debug: { selectors: string[]; totalFound: number; bodySnippet: string };
          };
          console.log('  eBay: DOM retry debug:', JSON.stringify({
            selectors: domResult.debug.selectors,
            totalFound: domResult.debug.totalFound,
          }));
        }

        if (domResult.reviews.length > 0) {
          allReviews.push(...domResult.reviews);
        } else {
          // Run detailed DOM inspection for debugging
          const inspection = await page.evaluate(INSPECT_REVIEWS_SECTION_JS) as Record<string, unknown>;
          console.log('  eBay: Reviews section inspection:', JSON.stringify(inspection, null, 2));
        }
      }

      // Report first batch
      if (allReviews.length > 0 && onBatch) {
        onBatch({
          batchNumber: 1,
          reviews: allReviews,
          totalFetched: allReviews.length,
          estimatedTotal: pageMeta.reviewCount || undefined,
        });
      }

      // Try pagination for DOM reviews
      if (allReviews.length > 0) {
        let batchNumber = 2;
        let maxPages = 20;
        while (maxPages-- > 0) {
          const hasMore = await page.evaluate(CLICK_NEXT_PAGE_JS) as boolean;
          if (!hasMore) break;
          await politeDelay(3000);

          const nextResult = await page.evaluate(EXTRACT_DOM_REVIEWS_JS) as {
            reviews: ScrapedReview[];
            debug: { selectors: string[]; totalFound: number; bodySnippet: string };
          };

          const existingTexts = new Set(allReviews.map((r) => r.text));
          const newReviews = nextResult.reviews.filter((r) => !existingTexts.has(r.text));
          if (newReviews.length === 0) break;

          allReviews.push(...newReviews);
          if (onBatch) {
            onBatch({
              batchNumber: batchNumber++,
              reviews: newReviews,
              totalFetched: allReviews.length,
              estimatedTotal: pageMeta.reviewCount || undefined,
            });
          }
        }
      }

      if (allReviews.length === 0) {
        throw new Error(
          'No reviews found for this eBay product. The listing may not have product reviews, or eBay may be blocking the request.'
        );
      }

      console.log(`  eBay: Fetched ${allReviews.length} reviews`);

      return {
        product: {
          title: pageMeta.title || 'Unknown Product',
          imageUrl: pageMeta.imageUrl,
          rating: Math.round(pageMeta.rating * 10) / 10,
          reviewCount: pageMeta.reviewCount || allReviews.length,
        },
        reviews: allReviews,
        source: 'ebay',
      };
    } finally {
      await closePage(page);
    }
  },
};
