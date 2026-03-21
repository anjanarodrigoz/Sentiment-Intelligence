import type { ProductAnalysis } from '../types/product';
import type { AnalyzedReview } from '../types/review';
import { computeSentimentSummary } from './sentimentAnalyzer';
import { computeAttributeCounts } from './attributeExtractor';
import { extractKeywords } from './keywordExtractor';
import { generateSellingPoints } from './sellingPointsGenerator';
import type { RatingDistribution } from '../types/analysis';

function mergeRatings(analyses: ProductAnalysis[]): RatingDistribution {
  return analyses.reduce(
    (acc, a) => ({
      fiveStar: acc.fiveStar + a.ratingDistribution.fiveStar,
      fourStar: acc.fourStar + a.ratingDistribution.fourStar,
      threeStar: acc.threeStar + a.ratingDistribution.threeStar,
      twoStar: acc.twoStar + a.ratingDistribution.twoStar,
      oneStar: acc.oneStar + a.ratingDistribution.oneStar,
    }),
    { fiveStar: 0, fourStar: 0, threeStar: 0, twoStar: 0, oneStar: 0 }
  );
}

export function aggregateAnalyses(analyses: ProductAnalysis[]): ProductAnalysis {
  const allReviews: AnalyzedReview[] = analyses.flatMap((a) => a.reviews);
  const totalReviewCount = analyses.reduce((sum, a) => sum + a.overallReviewCount, 0);
  const avgRating =
    analyses.reduce((sum, a) => sum + a.overallRating, 0) / analyses.length;

  return {
    productId: 'aggregate',
    title: `Aggregate Analysis (${analyses.length} products)`,
    imageUrl: analyses[0]?.imageUrl || '',
    overallRating: Math.round(avgRating * 10) / 10,
    overallReviewCount: totalReviewCount,
    reviews: allReviews,
    sentimentSummary: computeSentimentSummary(allReviews),
    attributeCounts: computeAttributeCounts(allReviews),
    ratingDistribution: mergeRatings(analyses),
    topSellingPoints: generateSellingPoints(allReviews),
    topKeywords: extractKeywords(allReviews),
  };
}
