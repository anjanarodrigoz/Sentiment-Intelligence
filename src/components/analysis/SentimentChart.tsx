import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SentimentSummary } from '../../types/analysis';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface SentimentChartProps {
  data: SentimentSummary;
  compact?: boolean;
}

const COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  mixed: '#f97316',
};

export default function SentimentChart({ data, compact }: SentimentChartProps) {
  const chartData = [
    { name: 'Positive', value: data.positive, fill: COLORS.positive },
    { name: 'Negative', value: data.negative, fill: COLORS.negative },
    { name: 'Mixed', value: data.mixed, fill: COLORS.mixed },
  ].filter((d) => d.value > 0);

  const size = compact ? 140 : 200;

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3', compact ? 'text-sm' : 'text-base')}>
        Sentiment
      </h4>
      <div className="flex flex-col items-center">
        <div style={{ width: size, height: size }} className="relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={compact ? 35 : 55}
                outerRadius={compact ? 60 : 85}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} reviews`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn('font-bold', compact ? 'text-lg' : 'text-2xl')}>
                {data.total}
              </div>
              <div className="text-xs text-text-secondary">reviews</div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sentiment-positive" />
            <span className="text-xs text-text-secondary">
              Positive {data.positive}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sentiment-negative" />
            <span className="text-xs text-text-secondary">
              Negative {data.negative}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-sentiment-mixed" />
            <span className="text-xs text-text-secondary">
              Mixed {data.mixed}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
