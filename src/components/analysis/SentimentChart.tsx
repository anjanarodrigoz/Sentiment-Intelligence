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

function renderPercentageLabel(props: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

export default function SentimentChart({ data, compact }: SentimentChartProps) {
  const chartData = [
    { name: 'Positive', value: data.positive, fill: COLORS.positive },
    { name: 'Negative', value: data.negative, fill: COLORS.negative },
    { name: 'Mixed', value: data.mixed, fill: COLORS.mixed },
  ].filter((d) => d.value > 0);

  const size = compact ? 140 : 180;

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3 text-center', compact ? 'text-sm' : 'text-base')}>
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
                innerRadius={compact ? 30 : 45}
                outerRadius={compact ? 55 : 80}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
                label={renderPercentageLabel}
                labelLine={false}
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
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sentiment-positive" />
            <span className="text-xs text-text-secondary">
              Positive: {data.positive.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sentiment-negative" />
            <span className="text-xs text-text-secondary">
              Negative: {data.negative.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sentiment-mixed" />
            <span className="text-xs text-text-secondary">
              Mixed: {data.mixed.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
