import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import StarRating from '../ui/StarRating';
import Badge from '../ui/Badge';
import type { AnalyzedReview } from '../../types/review';
import { cn } from '../../lib/utils';

interface ReviewCardProps {
  review: AnalyzedReview;
  showProductBadge?: string;
}

const SENTIMENT_STYLES = {
  positive: 'border-l-4 border-l-sentiment-positive bg-green-50/50',
  negative: 'border-l-4 border-l-sentiment-negative bg-red-50/50',
  mixed: 'border-l-4 border-l-sentiment-mixed bg-orange-50/50',
};

export default function ReviewCard({ review, showProductBadge }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 200;

  return (
    <div
      className={cn(
        'rounded-lg p-4 transition-colors',
        SENTIMENT_STYLES[review.sentiment.classification]
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
          {showProductBadge && (
            <Badge>{showProductBadge}</Badge>
          )}
        </div>
        {review.date && (
          <span className="text-xs text-text-secondary">{review.date}</span>
        )}
      </div>
      <p className="text-sm text-text-primary leading-relaxed">
        {isLong && !expanded ? review.text.slice(0, 200) + '...' : review.text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
      {review.attributes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {review.attributes.map((attr) => (
            <span
              key={attr}
              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary capitalize"
            >
              {attr}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
