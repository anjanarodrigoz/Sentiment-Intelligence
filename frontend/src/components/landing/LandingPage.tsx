import { useNavigate } from 'react-router-dom';
import { Package, GitCompareArrows, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { AnalysisMode } from '../../types/app';
import ModeCard from './ModeCard';
import ProductCountSelector from './ProductCountSelector';
import FeaturesSection from './FeaturesSection';
import Button from '../ui/Button';

const MODES: {
  mode: AnalysisMode;
  icon: typeof Package;
  title: string;
  description: string;
  disabled?: boolean;
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
    disabled: true,
  },
  {
    mode: 'aggregate',
    icon: Layers,
    title: 'Aggregate Analysis',
    description:
      'Analyze an entire collection — detect recurring issues, common strengths, and macro-level trends.',
    disabled: true,
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
    navigate('/brand');
  };

  return (
    <div className="max-w-5xl mx-auto relative px-4">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-64 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 -right-64 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="text-center mb-16 relative pt-10">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm animate-float">
          ✨ The most advanced API for Product Analysis
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text text-gradient mb-6 tracking-tight">
          Consumer Sentiment Intelligence
        </h1>
        <p className="text-text-secondary text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed">
          Transform thousands of consumer reviews into actionable product insights in seconds.
        </p>
      </div>

      <FeaturesSection />

      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Select Analysis Mode</h2>
        <p className="text-text-secondary">Choose how you want to analyze your data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        {MODES.map((m) => (
          <ModeCard
            key={m.mode}
            icon={m.icon}
            title={m.title}
            description={m.description}
            selected={mode === m.mode}
            onClick={() => setMode(m.mode)}
            disabled={m.disabled}
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

      <div className="flex justify-center pb-8">
        <Button size="lg" disabled={!mode} onClick={handleContinue}>
          Select a Brand to Continue
        </Button>
      </div>
    </div>
  );
}
