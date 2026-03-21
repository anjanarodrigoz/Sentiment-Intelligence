import StarRating from '../ui/StarRating';
import { MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProductHeaderProps {
  imageUrl: string;
  title: string;
  overallRating: number;
  overallReviewCount: number;
  compact?: boolean;
}

export default function ProductHeader({
  imageUrl,
  title,
  overallRating,
  overallReviewCount,
  compact,
}: ProductHeaderProps) {
  return (
    <div className={cn('flex items-center gap-4', compact && 'gap-3')}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className={cn(
            'rounded-lg object-cover border border-border',
            compact ? 'w-16 h-16' : 'w-24 h-24'
          )}
        />
      )}
      <div>
        <h3
          className={cn(
            'font-semibold text-text-primary',
            compact ? 'text-sm' : 'text-lg'
          )}
        >
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <StarRating rating={overallRating} size={compact ? 'sm' : 'md'} />
          <span className="text-sm text-text-secondary">
            {overallRating.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1 text-text-secondary">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-xs">
            {overallReviewCount.toLocaleString()} reviews
          </span>
        </div>
      </div>
    </div>
  );
}
