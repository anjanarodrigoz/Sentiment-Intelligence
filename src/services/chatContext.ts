import type { ProductAnalysis } from '../types/product';

export function buildContextSummary(analyses: ProductAnalysis[]): string {
  return analyses
    .map((a) => {
      const sentimentPct = {
        positive: ((a.sentimentSummary.positive / a.sentimentSummary.total) * 100).toFixed(1),
        negative: ((a.sentimentSummary.negative / a.sentimentSummary.total) * 100).toFixed(1),
        mixed: ((a.sentimentSummary.mixed / a.sentimentSummary.total) * 100).toFixed(1),
      };

      const topAttrs = a.attributeCounts
        .slice(0, 5)
        .map((attr) => `${attr.attribute}: ${attr.count} mentions (${attr.positiveCount} positive, ${attr.negativeCount} negative)`)
        .join('; ');

      const topKeywords = a.topKeywords
        .slice(0, 15)
        .map((k) => `${k.text}(${k.value})`)
        .join(', ');

      const sellingPoints = a.topSellingPoints
        .map((sp) => `[${sp.sentiment}] ${sp.theme}: ${sp.description} (${sp.percentage}%)`)
        .join('\n  ');

      return `Product: ${a.title}
  Rating: ${a.overallRating}/5 (${a.overallReviewCount} total reviews, ${a.reviews.length} analyzed)
  Sentiment: ${sentimentPct.positive}% positive, ${sentimentPct.negative}% negative, ${sentimentPct.mixed}% mixed
  Top Attributes: ${topAttrs}
  Key Themes:\n  ${sellingPoints}
  Top Keywords: ${topKeywords}`;
    })
    .join('\n\n');
}
