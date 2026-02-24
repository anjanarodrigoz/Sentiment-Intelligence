import type { AnalyzedReview, AttributeTag } from '../types/review';
import type { SellingPoint } from '../types/analysis';
import { ATTRIBUTE_LABELS } from '../constants/attributes';

export function generateSellingPoints(reviews: AnalyzedReview[]): SellingPoint[] {
  const positiveReviews = reviews.filter((r) => r.sentiment.classification === 'positive');
  const negativeReviews = reviews.filter((r) => r.sentiment.classification === 'negative');
  const points: SellingPoint[] = [];

  // Positive selling points
  const posAttrCounts: Record<string, number> = {};
  for (const review of positiveReviews) {
    for (const attr of review.attributes) {
      posAttrCounts[attr] = (posAttrCounts[attr] || 0) + 1;
    }
  }

  const sortedPosAttrs = Object.entries(posAttrCounts).sort((a, b) => b[1] - a[1]);
  for (const [attr, count] of sortedPosAttrs.slice(0, 5)) {
    const percentage =
      positiveReviews.length > 0
        ? Math.round((count / positiveReviews.length) * 100)
        : 0;

    // Collect common positive words for this attribute
    const attrReviews = positiveReviews.filter((r) =>
      r.attributes.includes(attr as AttributeTag)
    );
    const wordFreq: Record<string, number> = {};
    for (const r of attrReviews) {
      for (const w of r.sentiment.positiveWords) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w]) => w);

    const label = ATTRIBUTE_LABELS[attr as AttributeTag] || attr;
    points.push({
      theme: label,
      description: topWords.length > 0
        ? `Customers appreciate the ${label.toLowerCase()} — commonly described as "${topWords.join('", "')}".`
        : `Customers frequently praise the ${label.toLowerCase()}.`,
      percentage,
      sentiment: 'positive',
    });
  }

  // Negative concerns
  const negAttrCounts: Record<string, number> = {};
  for (const review of negativeReviews) {
    for (const attr of review.attributes) {
      negAttrCounts[attr] = (negAttrCounts[attr] || 0) + 1;
    }
  }

  const sortedNegAttrs = Object.entries(negAttrCounts).sort((a, b) => b[1] - a[1]);
  for (const [attr, count] of sortedNegAttrs.slice(0, 3)) {
    const percentage =
      negativeReviews.length > 0
        ? Math.round((count / negativeReviews.length) * 100)
        : 0;

    const attrReviews = negativeReviews.filter((r) =>
      r.attributes.includes(attr as AttributeTag)
    );
    const wordFreq: Record<string, number> = {};
    for (const r of attrReviews) {
      for (const w of r.sentiment.negativeWords) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w]) => w);

    const label = ATTRIBUTE_LABELS[attr as AttributeTag] || attr;
    points.push({
      theme: label,
      description: topWords.length > 0
        ? `Concerns about ${label.toLowerCase()} — terms like "${topWords.join('", "')}".`
        : `Customers express concerns about the ${label.toLowerCase()}.`,
      percentage,
      sentiment: 'negative',
    });
  }

  return points;
}
