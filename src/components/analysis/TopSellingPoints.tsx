import { TrendingUp, TrendingDown } from 'lucide-react';
import type { SellingPoint } from '../../types/analysis';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../../lib/utils';

interface TopSellingPointsProps {
  points: SellingPoint[];
  compact?: boolean;
}

export default function TopSellingPoints({ points, compact }: TopSellingPointsProps) {
  const positivePoints = points.filter((p) => p.sentiment === 'positive');
  const negativePoints = points.filter((p) => p.sentiment === 'negative');

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3 text-center', compact ? 'text-sm' : 'text-base')}>
        Top Selling Points
      </h4>

      {positivePoints.length > 0 && (
        <div className="space-y-3 mb-4">
          {positivePoints.slice(0, compact ? 3 : 5).map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{point.theme}</span>
                  <Badge variant="positive">{point.percentage}%</Badge>
                </div>
                {!compact && (
                  <p className="text-xs text-text-secondary">{point.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {negativePoints.length > 0 && (
        <>
          <h5 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
            Key Concerns
          </h5>
          <div className="space-y-3">
            {negativePoints.slice(0, compact ? 2 : 3).map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{point.theme}</span>
                    <Badge variant="negative">{point.percentage}%</Badge>
                  </div>
                  {!compact && (
                    <p className="text-xs text-text-secondary">{point.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {points.length === 0 && (
        <p className="text-sm text-text-secondary">Not enough data to generate selling points.</p>
      )}
    </Card>
  );
}
