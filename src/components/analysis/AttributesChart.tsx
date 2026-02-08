import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import type { AttributeCount } from '../../types/analysis';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface AttributesChartProps {
  data: AttributeCount[];
  compact?: boolean;
}

export default function AttributesChart({ data, compact }: AttributesChartProps) {
  const chartData = data.filter((d) => d.count > 0);

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3', compact ? 'text-sm' : 'text-base')}>
        Attributes
      </h4>
      {chartData.length === 0 ? (
        <p className="text-sm text-text-secondary">No attributes detected</p>
      ) : (
        <div style={{ height: compact ? 200 : Math.max(250, chartData.length * 32) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="attribute"
                width={compact ? 70 : 90}
                tick={{ fontSize: compact ? 11 : 12, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(value, _name, props) => {
                  const item = props.payload as AttributeCount;
                  return [
                    `${value} total (${item.positiveCount} positive, ${item.negativeCount} negative)`,
                    item.attribute,
                  ];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={compact ? 14 : 18}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.positiveCount > entry.negativeCount
                        ? '#3b82f6'
                        : entry.negativeCount > entry.positiveCount
                        ? '#ef4444'
                        : '#94a3b8'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-2 space-y-1">
        {chartData.slice(0, compact ? 5 : 10).map((attr) => (
          <div key={attr.attribute} className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">{attr.attribute}</span>
            <span className="font-medium">{attr.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
