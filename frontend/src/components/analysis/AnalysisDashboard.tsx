import { useAppStore } from '../../store/useAppStore';
import ProductHeader from './ProductHeader';
import SentimentChart from './SentimentChart';
import AttributesChart from './AttributesChart';
import TopSellingPoints from './TopSellingPoints';
import KeywordCloud from './KeywordCloud';
import RatingsDistribution from './RatingsDistribution';
import ReviewList from '../reviews/ReviewList';
import ComparisonView from '../comparison/ComparisonView';
import AggregateView from '../aggregate/AggregateView';

export default function AnalysisDashboard() {
  const { mode, analyses, aggregateAnalysis } = useAppStore();

  if (mode === 'comparison') {
    return <ComparisonView analyses={analyses} />;
  }

  if (mode === 'aggregate') {
    return (
      <AggregateView
        analyses={analyses}
        aggregateAnalysis={aggregateAnalysis!}
      />
    );
  }

  // Single product mode
  const analysis = analyses[0];
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <ProductHeader
        imageUrl={analysis.imageUrl}
        title={analysis.title}
        overallRating={analysis.overallRating}
        overallReviewCount={analysis.overallReviewCount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <SentimentChart data={analysis.sentimentSummary} compact />
        <AttributesChart data={analysis.attributeCounts} compact />
        <TopSellingPoints points={analysis.topSellingPoints} compact />
        <KeywordCloud words={analysis.topKeywords} compact />
        <RatingsDistribution data={analysis.ratingDistribution} compact />
      </div>

      <ReviewList reviews={analysis.reviews} />
    </div>
  );
}
