import { useNavigate } from 'react-router-dom';
import { Package, GitCompareArrows, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { AnalysisMode } from '../../types/app';
import ModeCard from './ModeCard';
import ProductCountSelector from './ProductCountSelector';
import Button from '../ui/Button';

const MODES: {
  mode: AnalysisMode;
  icon: typeof Package;
  title: string;
  description: string;
}[] = [
  {
    mode: 'single',
    icon: Package,
    title: 'Single Product',
    description:
      'Deep dive into one product — identify top selling points, key complaints, and improvement suggestions.',
  },
  {
    mode: 'comparison',
    icon: GitCompareArrows,
    title: 'Product Comparison',
    description:
      'Compare up to 10 products side-by-side — highlight competitive strengths and weaknesses.',
  },
  {
    mode: 'aggregate',
    icon: Layers,
    title: 'Aggregate Analysis',
    description:
      'Analyze an entire collection — detect recurring issues, common strengths, and macro-level trends.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { mode, productCount, setMode, setProductCount, initProducts } =
    useAppStore();

  const handleContinue = () => {
    if (!mode) return;
    const count = mode === 'single' ? 1 : productCount;
    initProducts(count);
    navigate('/input');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-text-primary mb-3">
          Consumer Sentiment Intelligence
        </h1>
        <p className="text-text-secondary text-lg">
          Transform consumer reviews into actionable product insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {MODES.map((m) => (
          <ModeCard
            key={m.mode}
            icon={m.icon}
            title={m.title}
            description={m.description}
            selected={mode === m.mode}
            onClick={() => setMode(m.mode)}
          />
        ))}
      </div>

      {mode && mode !== 'single' && (
        <div className="mb-8">
          <ProductCountSelector
            value={productCount}
            onChange={setProductCount}
          />
        </div>
      )}

      <div className="flex justify-center">
        <Button size="lg" disabled={!mode} onClick={handleContinue}>
          Continue to Product Input
        </Button>
      </div>
    </div>
  );
}
