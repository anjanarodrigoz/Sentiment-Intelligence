import { useState, useEffect } from 'react';
import { X, Loader2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { useAnalysis } from '../../hooks/useAnalysis';
import ProductInputCard from './ProductInputCard';
import AnalysisMethodSelector from './AnalysisMethodSelector';

interface ProductSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductSetupDialog({ isOpen, onClose }: ProductSetupDialogProps) {
  const navigate = useNavigate();
  const { mode, products, isProcessing, processingProgress, updateProduct } = useAppStore();
  const { runAnalysis } = useAnalysis();
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Reset local state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAnalysisError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allValid = products.every((p) =>
    p.title && p.scrapedReviews && p.scrapedReviews.length > 0
  );

  const handleAnalyze = async () => {
    setAnalysisError(null);
    try {
      await runAnalysis();
      onClose();
      navigate('/dashboard');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-white border border-border shadow-2xl rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-text-primary">
              {mode === 'single' ? 'Analyze Product' : 'Configure Analysis'}
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Review details, choose an AI model, and generate sentiment insights.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* Active Product Preview Section */}
          <section>
            <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">
              Selected {products.length > 1 ? 'Products' : 'Product'} Data
            </h4>
            <div className="flex flex-col gap-6 w-full">
              {products.map((product, i) => (
                <ProductInputCard
                  key={product.id}
                  product={product}
                  index={i}
                  showIndex={products.length > 1}
                  onUpdate={(updates) => updateProduct(product.id, updates)}
                />
              ))}
            </div>
          </section>

          {/* Configurator Section - Always rendered at bottom */}
          <section className="w-full bg-gray-50/50 border border-border rounded-xl p-6 sm:p-8 animate-fade-in space-y-8 mt-8">
              <div>
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">
                  Analysis Options
                </h4>
                <AnalysisMethodSelector />
              </div>

              <div className="flex flex-col items-center pt-2">
                {analysisError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-6 py-3 rounded-xl max-w-md text-center shadow-sm w-full mb-4">
                    {analysisError}
                  </div>
                )}
                
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4 bg-white/50 p-6 rounded-2xl w-full max-w-md">
                    <div className="flex items-center gap-3 text-primary">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="font-semibold text-lg">Analyzing sentiment...</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-300 relative overflow-hidden"
                        style={{ width: `${processingProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button 
                    disabled={!allValid} 
                    onClick={handleAnalyze}
                    size="lg"
                    className="w-full max-w-md shadow-md hover:shadow-lg transition-all"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Analysis
                  </Button>
                )}
              </div>
            </section>

        </div>
      </div>
    </div>
  );
}
