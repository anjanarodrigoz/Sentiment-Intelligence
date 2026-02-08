import { useMemo } from 'react';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface KeywordCloudProps {
  words: { text: string; value: number }[];
  compact?: boolean;
}

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#64748b', '#475569',
];

export default function KeywordCloud({ words, compact }: KeywordCloudProps) {
  const displayWords = useMemo(() => {
    const maxWords = compact ? 30 : 60;
    const sorted = [...words].sort((a, b) => b.value - a.value).slice(0, maxWords);
    if (sorted.length === 0) return [];

    const maxVal = sorted[0].value;
    const minVal = sorted[sorted.length - 1].value;
    const range = maxVal - minVal || 1;

    return sorted.map((w, i) => {
      const normalized = (w.value - minVal) / range;
      const fontSize = compact
        ? 10 + normalized * 14
        : 12 + normalized * 24;

      return {
        ...w,
        fontSize,
        color: COLORS[i % COLORS.length],
        opacity: 0.6 + normalized * 0.4,
      };
    });
  }, [words, compact]);

  // Shuffle for visual variety
  const shuffled = useMemo(() => {
    const arr = [...displayWords];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [displayWords]);

  return (
    <Card className={cn(compact && 'p-4')}>
      <h4 className={cn('font-semibold mb-3', compact ? 'text-sm' : 'text-base')}>
        Keywords
      </h4>
      {shuffled.length === 0 ? (
        <p className="text-sm text-text-secondary">No keywords extracted</p>
      ) : (
        <div className={cn('flex flex-wrap items-center justify-center gap-1', compact ? 'gap-0.5' : 'gap-1.5')}>
          {shuffled.map((word, i) => (
            <span
              key={i}
              className="inline-block px-1 cursor-default transition-transform hover:scale-110"
              style={{
                fontSize: `${word.fontSize}px`,
                color: word.color,
                opacity: word.opacity,
                fontWeight: word.fontSize > 20 ? 700 : word.fontSize > 16 ? 600 : 400,
              }}
              title={`${word.text}: ${word.value} mentions`}
            >
              {word.text}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
