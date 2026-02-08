import { FileSpreadsheet, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReviewSourceToggleProps {
  mode: 'file' | 'url';
  onChange: (mode: 'file' | 'url') => void;
}

export default function ReviewSourceToggle({ mode, onChange }: ReviewSourceToggleProps) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => onChange('file')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium flex-1 justify-center transition-colors',
          mode === 'file'
            ? 'bg-primary text-white'
            : 'bg-white text-text-secondary hover:bg-gray-50'
        )}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Upload File
      </button>
      <button
        type="button"
        onClick={() => onChange('url')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium flex-1 justify-center transition-colors',
          mode === 'url'
            ? 'bg-primary text-white'
            : 'bg-white text-text-secondary hover:bg-gray-50'
        )}
      >
        <Globe className="w-4 h-4" />
        Product URL
      </button>
    </div>
  );
}
