import crypto from 'crypto';
import type { ScrapedReview } from '../scrapers/types.js';

/**
 * Generates a SHA-256 hash for a review based on normalized text + rating.
 * Date is excluded because it can change between scrapes (e.g., "2 days ago" vs "Jan 10").
 */
export function hashReview(text: string, rating: number): string {
  const normalizedText = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const input = `${normalizedText}|${rating}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Hashes a batch of reviews and returns a Map of hash -> review.
 * Duplicate reviews within the same batch are deduplicated (last one wins).
 */
export function hashReviews(reviews: ScrapedReview[]): Map<string, ScrapedReview> {
  const map = new Map<string, ScrapedReview>();
  for (const review of reviews) {
    const hash = hashReview(review.text, review.rating);
    map.set(hash, review);
  }
  return map;
}
