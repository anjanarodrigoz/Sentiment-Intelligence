import { Star } from 'lucide-react';
import type { RatingDistribution } from '../../types/analysis';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface RatingsDistributionProps {
  data: RatingDistribution;
  compact?: boolean;
}

const LABELS = [
  { key: 'fiveStar' as const, label: 'Awesome', stars: 5 },
  { key: 'fourStar' as const, label: 'Good', stars: 4 },
  { key: 'threeStar' as const, label: 'Average', stars: 3 },
  { key: 'twoStar' as const, label: 'Poor', stars: 2 },
  { key: 'oneStar' as const, label: 'Bad', stars: 1 },
];

export default function RatingsDistribution({ data, compact }: RatingsDistributionProps) {
  const total =
    data.fiveStar + data.fourStar + data.threeStar + data.twoStar + data.oneStar;

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3', compact ? 'text-sm' : 'text-base')}>
        Ratings
      </h4>
      <div className="space-y-2.5">
        {LABELS.map(({ key, label, stars }) => {
          const count = data[key];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              {!compact && (
                <span className="text-xs text-text-secondary w-14 shrink-0">
                  {label}
                </span>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: stars }, (_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary w-8 text-right shrink-0">
                {Math.round(pct)}%
              </span>
              <span className="text-xs font-medium w-10 text-right shrink-0">
                ({count})
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
