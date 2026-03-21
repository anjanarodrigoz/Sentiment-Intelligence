import { Star } from 'lucide-react';
import type { RatingDistribution } from '../../types/analysis';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface RatingsDistributionProps {
  data: RatingDistribution;
  compact?: boolean;
}

const LABELS: {
  key: keyof RatingDistribution;
  label: string;
  stars: number;
  color: string;
}[] = [
  { key: 'fiveStar', label: 'Awesome', stars: 5, color: '#22c55e' },
  { key: 'fourStar', label: 'Good', stars: 4, color: '#84cc16' },
  { key: 'threeStar', label: 'Average', stars: 3, color: '#eab308' },
  { key: 'twoStar', label: 'Poor', stars: 2, color: '#f97316' },
  { key: 'oneStar', label: 'Bad', stars: 1, color: '#ef4444' },
];

export default function RatingsDistribution({ data, compact }: RatingsDistributionProps) {
  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-4 text-center', compact ? 'text-sm' : 'text-base')}>
        Ratings
      </h4>
      <div className="space-y-3">
        {LABELS.map(({ key, label, stars, color }) => {
          const count = data[key];
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-text-primary whitespace-nowrap">
                {label} ({count.toLocaleString()})
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: stars }, (_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    style={{ fill: color, color }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
