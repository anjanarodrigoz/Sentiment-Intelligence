import { Globe, Database } from 'lucide-react';
import { cn } from '../../lib/utils';

type InputMode = 'url' | 'existing';

interface ReviewSourceToggleProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

const modes: { value: InputMode; label: string; icon: typeof Globe }[] = [
  { value: 'url', label: 'Product URL', icon: Globe },
  { value: 'existing', label: 'Previously Scraped', icon: Database },
];

export default function ReviewSourceToggle({ mode, onChange }: ReviewSourceToggleProps) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {modes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium flex-1 justify-center transition-colors',
            mode === value
              ? 'bg-primary text-white'
              : 'bg-white text-text-secondary hover:bg-gray-50'
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
