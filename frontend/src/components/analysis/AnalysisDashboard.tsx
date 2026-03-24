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
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import { exportToHTML } from '../../services/htmlExporter';

export default function AnalysisDashboard() {
  const { mode, analyses, aggregateAnalysis, chatMessages } = useAppStore();

  const handleExport = () => {
    exportToHTML(analyses, aggregateAnalysis, (mode || 'single') as 'single' | 'comparison' | 'aggregate', chatMessages);
  };

  const dashboardHeader = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-border shadow-sm">
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold text-text-primary">
          {mode === 'aggregate' ? 'Aggregate Analysis' : mode === 'comparison' ? 'Product Comparison' : 'Analysis Dashboard'}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          {analyses.length} {analyses.length === 1 ? 'product' : 'products'} analyzed
        </p>
      </div>
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={handleExport}
        className="shrink-0 text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all font-semibold"
      >
        <Download className="w-4 h-4 mr-2" />
        Download HTML Report
      </Button>
    </div>
  );

  if (mode === 'comparison') {
    return (
      <div className="space-y-6">
        {dashboardHeader}
        <ComparisonView analyses={analyses} />
      </div>
    );
  }

  if (mode === 'aggregate') {
    return (
      <div className="space-y-6">
        {dashboardHeader}
        <AggregateView
          analyses={analyses}
          aggregateAnalysis={aggregateAnalysis!}
        />
      </div>
    );
  }

  // Single product mode
  const analysis = analyses[0];
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {dashboardHeader}
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
