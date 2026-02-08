import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { parseReviewFile } from '../services/fileParser';
import { analyzeAllReviews, computeSentimentSummary } from '../services/sentimentAnalyzer';
import { computeAttributeCounts } from '../services/attributeExtractor';
import { extractKeywords } from '../services/keywordExtractor';
import { generateSellingPoints } from '../services/sellingPointsGenerator';
import { aggregateAnalyses } from '../services/aggregator';
import type { ProductAnalysis } from '../types/product';
import type { RatingDistribution } from '../types/analysis';

function computeRatingDistribution(reviews: { rating: number }[]): RatingDistribution {
  const dist: RatingDistribution = {
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  };
  for (const r of reviews) {
    const rounded = Math.round(r.rating);
    if (rounded >= 5) dist.fiveStar++;
    else if (rounded === 4) dist.fourStar++;
    else if (rounded === 3) dist.threeStar++;
    else if (rounded === 2) dist.twoStar++;
    else dist.oneStar++;
  }
  return dist;
}

export function useAnalysis() {
  const { products, mode, setAnalyses, setAggregateAnalysis, setProcessing } =
    useAppStore();

  const runAnalysis = useCallback(async () => {
    setProcessing(true, 0);

    const analyses: ProductAnalysis[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      setProcessing(true, Math.round(((i + 0.3) / products.length) * 100));

      // 1. Parse file
      const rawReviews = await parseReviewFile(product.reviewFile!);
      setProcessing(true, Math.round(((i + 0.5) / products.length) * 100));

      // 2. Analyze reviews
      const analyzedReviews = analyzeAllReviews(rawReviews);
      setProcessing(true, Math.round(((i + 0.8) / products.length) * 100));

      // 3. Compute summaries
      const sentimentSummary = computeSentimentSummary(analyzedReviews);
      const attributeCounts = computeAttributeCounts(analyzedReviews);
      const topKeywords = extractKeywords(analyzedReviews);
      const topSellingPoints = generateSellingPoints(analyzedReviews);
      const ratingDistribution = computeRatingDistribution(analyzedReviews);

      // Resolve image URL
      let imageUrl = product.imageUrl;
      if (product.imageFile) {
        imageUrl = URL.createObjectURL(product.imageFile);
      }

      analyses.push({
        productId: product.id,
        title: product.title,
        imageUrl,
        overallRating: product.overallRating,
        overallReviewCount: product.overallReviewCount,
        reviews: analyzedReviews,
        sentimentSummary,
        attributeCounts,
        ratingDistribution,
        topSellingPoints,
        topKeywords,
      });
    }

    setAnalyses(analyses);

    if (mode === 'aggregate') {
      setAggregateAnalysis(aggregateAnalyses(analyses));
    }

    setProcessing(false);
  }, [products, mode, setAnalyses, setAggregateAnalysis, setProcessing]);

  return { runAnalysis };
}
