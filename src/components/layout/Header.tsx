import { BarChart3, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

export default function Header() {
  const navigate = useNavigate();
  const { mode, reset } = useAppStore();

  const handleReset = () => {
    reset();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <BarChart3 className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold text-text-primary">
            Sentiment Intelligence
          </span>
        </button>
        <div className="flex items-center gap-4">
          {mode && (
            <span className="text-sm text-text-secondary capitalize">
              {mode === 'single'
                ? 'Single Product'
                : mode === 'comparison'
                ? 'Comparison'
                : 'Aggregate'}{' '}
              Analysis
            </span>
          )}
          {mode && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New Analysis
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
