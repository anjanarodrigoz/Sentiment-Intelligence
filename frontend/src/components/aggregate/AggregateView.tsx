import { useMemo } from 'react';
import type { ProductAnalysis } from '../../types/product';
import ProductThumbnailBar from './ProductThumbnailBar';
import SentimentChart from '../analysis/SentimentChart';
import AttributesChart from '../analysis/AttributesChart';
import TopSellingPoints from '../analysis/TopSellingPoints';
import KeywordCloud from '../analysis/KeywordCloud';
import RatingsDistribution from '../analysis/RatingsDistribution';
import ReviewList from '../reviews/ReviewList';

interface AggregateViewProps {
  analyses: ProductAnalysis[];
  aggregateAnalysis: ProductAnalysis;
}

export default function AggregateView({
  analyses,
  aggregateAnalysis,
}: AggregateViewProps) {
  // Map review IDs to product titles for badge display
  const productTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const analysis of analyses) {
      for (const review of analysis.reviews) {
        map[review.id] = analysis.title;
      }
    }
    return map;
  }, [analyses]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Aggregate Analysis</h2>
        <p className="text-sm text-text-secondary">
          {analyses.length} Products — {aggregateAnalysis.reviews.length} total reviews analyzed
        </p>
      </div>

      <ProductThumbnailBar analyses={analyses} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <SentimentChart data={aggregateAnalysis.sentimentSummary} />
          <RatingsDistribution data={aggregateAnalysis.ratingDistribution} />
        </div>
        <div className="space-y-6">
          <TopSellingPoints points={aggregateAnalysis.topSellingPoints} />
          <KeywordCloud words={aggregateAnalysis.topKeywords} />
        </div>
        <div>
          <AttributesChart data={aggregateAnalysis.attributeCounts} />
        </div>
      </div>

      <ReviewList
        reviews={aggregateAnalysis.reviews}
        productTitleMap={productTitleMap}
      />
    </div>
  );
}
