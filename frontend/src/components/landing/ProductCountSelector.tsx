import { Minus, Plus } from 'lucide-react';

interface ProductCountSelectorProps {
  value: number;
  onChange: (count: number) => void;
  min?: number;
  max?: number;
}

export default function ProductCountSelector({
  value,
  onChange,
  min = 2,
  max = 10,
}: ProductCountSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span className="text-sm text-text-secondary">Number of products:</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-surface-alt disabled:opacity-40 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center font-semibold text-lg">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-surface-alt disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
