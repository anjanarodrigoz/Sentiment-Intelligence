import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import Card from '../ui/Card';
import { useFilteredReviews } from '../../hooks/useFilteredReviews';
import type { AnalyzedReview } from '../../types/review';
import { cn } from '../../lib/utils';

interface ReviewListProps {
  reviews: AnalyzedReview[];
  title?: string;
  showFilters?: boolean;
  compact?: boolean;
  productTitleMap?: Record<string, string>;
}

export default function ReviewList({
  reviews,
  title,
  showFilters = true,
  compact,
  productTitleMap,
}: ReviewListProps) {
  const filtered = useFilteredReviews(reviews);

  return (
    <Card className={cn(compact && 'p-4')}>
      <div className="flex items-center justify-between mb-4">
        <h4 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
          {title || `Reviews (${filtered.length})`}
        </h4>
      </div>

      {showFilters && <ReviewFilters />}

      <div className={cn('mt-4 space-y-3', compact ? 'max-h-96' : 'max-h-[600px]', 'overflow-y-auto')}>
        {filtered.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            No reviews match the current filters.
          </p>
        ) : (
          filtered.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showProductBadge={
                productTitleMap ? productTitleMap[review.id] : undefined
              }
            />
          ))
        )}
      </div>
    </Card>
  );
}
