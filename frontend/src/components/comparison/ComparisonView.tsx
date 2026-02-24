import type { ProductAnalysis } from '../../types/product';
import ProductHeader from '../analysis/ProductHeader';
import SentimentChart from '../analysis/SentimentChart';
import AttributesChart from '../analysis/AttributesChart';
import TopSellingPoints from '../analysis/TopSellingPoints';
import RatingsDistribution from '../analysis/RatingsDistribution';
import ReviewList from '../reviews/ReviewList';

interface ComparisonViewProps {
  analyses: ProductAnalysis[];
}

export default function ComparisonView({ analyses }: ComparisonViewProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Product Comparison</h2>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {analyses.map((analysis) => (
          <div
            key={analysis.productId}
            className="min-w-[380px] flex-1 space-y-4"
          >
            <ProductHeader
              imageUrl={analysis.imageUrl}
              title={analysis.title}
              overallRating={analysis.overallRating}
              overallReviewCount={analysis.overallReviewCount}
              compact
            />
            <SentimentChart data={analysis.sentimentSummary} compact />
            <AttributesChart data={analysis.attributeCounts} compact />
            <TopSellingPoints points={analysis.topSellingPoints} compact />
            <RatingsDistribution data={analysis.ratingDistribution} compact />
            <ReviewList
              reviews={analysis.reviews}
              title={`Reviews (${analysis.reviews.length})`}
              compact
              showFilters={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
