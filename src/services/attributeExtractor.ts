import { ATTRIBUTE_KEYWORDS, ATTRIBUTE_LABELS } from '../constants/attributes';
import type { AttributeTag, AnalyzedReview } from '../types/review';
import type { AttributeCount } from '../types/analysis';

// Pre-compile regex patterns for performance
const attributePatterns: Record<AttributeTag, RegExp> = {} as Record<AttributeTag, RegExp>;
for (const [attr, words] of Object.entries(ATTRIBUTE_KEYWORDS)) {
  const escaped = words.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  attributePatterns[attr as AttributeTag] = new RegExp(
    `\\b(${escaped.join('|')})\\b`,
    'i'
  );
}

export function extractAttributes(text: string): AttributeTag[] {
  const found: AttributeTag[] = [];
  for (const [attr, pattern] of Object.entries(attributePatterns)) {
    if (pattern.test(text)) {
      found.push(attr as AttributeTag);
    }
  }
  return found;
}

export function computeAttributeCounts(reviews: AnalyzedReview[]): AttributeCount[] {
  const counts: Record<string, { count: number; positiveCount: number; negativeCount: number }> = {};

  for (const attr of Object.keys(ATTRIBUTE_KEYWORDS)) {
    counts[attr] = { count: 0, positiveCount: 0, negativeCount: 0 };
  }

  for (const review of reviews) {
    for (const attr of review.attributes) {
      counts[attr].count++;
      if (review.sentiment.classification === 'positive') {
        counts[attr].positiveCount++;
      } else if (review.sentiment.classification === 'negative') {
        counts[attr].negativeCount++;
      }
    }
  }

  return Object.entries(counts)
    .map(([attr, data]) => ({
      attribute: ATTRIBUTE_LABELS[attr as AttributeTag],
      ...data,
    }))
    .sort((a, b) => b.count - a.count);
}
