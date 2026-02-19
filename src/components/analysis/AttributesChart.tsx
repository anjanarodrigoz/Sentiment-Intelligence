import type { AttributeCount } from '../../types/analysis';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface AttributesChartProps {
  data: AttributeCount[];
  compact?: boolean;
}

function AttributeRow({ attr, maxCount }: { attr: AttributeCount; maxCount: number }) {
  const barWidth = maxCount > 0 ? (attr.count / maxCount) * 100 : 0;
  const positivePct = attr.count > 0 ? (attr.positiveCount / attr.count) * 100 : 0;
  const negativePct = attr.count > 0 ? (attr.negativeCount / attr.count) * 100 : 0;
  const mixedPct = 100 - positivePct - negativePct;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-text-primary truncate">
          {attr.attribute}
        </span>
        <span className="text-xs text-text-secondary ml-1 tabular-nums">
          {attr.count.toLocaleString()}
        </span>
      </div>
      <div
        className="h-3 rounded-sm overflow-hidden flex"
        style={{ width: `${barWidth}%`, minWidth: '8px' }}
      >
        {positivePct > 0 && (
          <div className="h-full bg-green-500" style={{ width: `${positivePct}%` }} />
        )}
        {mixedPct > 0 && (
          <div className="h-full bg-orange-400" style={{ width: `${mixedPct}%` }} />
        )}
        {negativePct > 0 && (
          <div className="h-full bg-red-500" style={{ width: `${negativePct}%` }} />
        )}
      </div>
    </div>
  );
}

export default function AttributesChart({ data, compact }: AttributesChartProps) {
  const chartData = data.filter((d) => d.count > 0);
  const maxCount = chartData.length > 0 ? Math.max(...chartData.map((d) => d.count)) : 0;

  // Split into two columns
  const midpoint = Math.ceil(chartData.length / 2);
  const leftCol = chartData.slice(0, midpoint);
  const rightCol = chartData.slice(midpoint);

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3 text-center', compact ? 'text-sm' : 'text-base')}>
        Attributes
      </h4>
      {chartData.length === 0 ? (
        <p className="text-sm text-text-secondary">No attributes detected</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div className="space-y-2.5">
            {leftCol.map((attr) => (
              <AttributeRow key={attr.attribute} attr={attr} maxCount={maxCount} />
            ))}
          </div>
          <div className="space-y-2.5">
            {rightCol.map((attr) => (
              <AttributeRow key={attr.attribute} attr={attr} maxCount={maxCount} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
