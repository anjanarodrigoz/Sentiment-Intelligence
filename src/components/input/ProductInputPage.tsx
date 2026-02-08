import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAnalysis } from '../../hooks/useAnalysis';
import ProductInputCard from './ProductInputCard';
import Button from '../ui/Button';
import { Loader2 } from 'lucide-react';

export default function ProductInputPage() {
  const navigate = useNavigate();
  const { mode, products, isProcessing, processingProgress, updateProduct } =
    useAppStore();
  const { runAnalysis } = useAnalysis();

  const allValid = products.every((p) =>
    p.title && (
      (p.inputMode === 'file' && p.reviewFile) ||
      (p.inputMode === 'url' && p.scrapedReviews && p.scrapedReviews.length > 0)
    )
  );

  const handleAnalyze = async () => {
    await runAnalysis();
    navigate('/dashboard');
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {mode === 'single'
            ? 'Enter Product Details'
            : mode === 'comparison'
            ? 'Enter Products to Compare'
            : 'Enter Collection Products'}
        </h2>
        <p className="text-text-secondary">
          {mode === 'single'
            ? 'Upload your review data and product information for analysis.'
            : mode === 'comparison'
            ? 'Add the products you want to compare side-by-side.'
            : 'Add all products in the collection for aggregate analysis.'}
        </p>
      </div>

      <div className={products.length > 1 ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'max-w-2xl'}>
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

      <div className="mt-8 flex justify-center">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Analyzing reviews...</span>
            </div>
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <Button size="lg" disabled={!allValid} onClick={handleAnalyze}>
            Analyze Reviews
          </Button>
        )}
      </div>
    </div>
  );
}
