import { useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Settings, Play, Trash2 } from 'lucide-react';
import ExistingProductsTable from './ExistingProductsTable';
import ProductSetupDialog from './ProductSetupDialog';
import ScrapeDialog from './ScrapeDialog';
import type { RawReview } from '../../types/review';
import Button from '../ui/Button';

interface ProductData {
  title: string;
  imageUrl: string;
  overallRating: number;
  overallReviewCount: number;
  scrapedReviews: RawReview[];
  productUrl: string;
  urlHash: string;
  scrapeMetadata: {
    cached: boolean;
    version: number;
    scrapedAt: Date;
  };
}

export default function ProductInputPage() {
  const { mode, products, updateProduct } = useAppStore();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isScrapeOpen, setIsScrapeOpen] = useState(false);
  const [tableRefresh, setTableRefresh] = useState(0);

  const filledSlotsCount = products.filter(p => Boolean(p.title)).length;
  const isReadyForAnalysis = products.every((p) => p.title && p.scrapedReviews && p.scrapedReviews.length > 0);

  const handleProductSelect = useCallback((data: ProductData) => {
    const emptySlot = products.find(p => !p.title && !p.scrapedReviews);
    if (emptySlot) {
      updateProduct(emptySlot.id, data);
    } else {
      if (products.length > 0) {
        updateProduct(products[products.length - 1].id, data);
      }
    }

    // Auto-open modal if single mode, or if this action fills the required slots
    if (mode === 'single' || filledSlotsCount + 1 >= products.length) {
      setIsScrapeOpen(false); // Close scrape modal if it was open
      setIsSetupOpen(true);
    }
  }, [products, updateProduct, mode, filledSlotsCount]);

  const handleClearAll = () => {
    products.forEach(p => {
      updateProduct(p.id, {
        title: '',
        overallRating: 0,
        overallReviewCount: 0,
        imageUrl: '',
        imageFile: null,
        reviewFile: null,
        reviewFileName: '',
        reviewCount: 0,
        productUrl: '',
        scrapedReviews: null,
        urlHash: undefined,
        scrapeMetadata: undefined,
      });
    });
  };

  const selectedUrlHashes = products.map(p => p.urlHash).filter(Boolean) as string[];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-32">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-indigo-600 tracking-tight pb-2">
          {mode === 'single'
            ? 'Select a Product for Analysis'
            : mode === 'comparison'
            ? 'Select Products to Compare'
            : 'Select Collection Products'}
        </h2>
        <p className="text-text-secondary mt-1 text-lg max-w-2xl mx-auto">
          {mode === 'comparison' 
            ? `Select ${products.length} products to compare their sentiment side-by-side.`
            : 'Choose previously scraped products from your database or scrape a completely new link.'}
        </p>
      </div>

      <div className="space-y-8 relative">
        
        {/* Table Section */}
        <section className="animate-slide-up" style={{ animationDelay: '0ms' }}>
          <ExistingProductsTable 
            onProductSelect={handleProductSelect} 
            selectedUrlHashes={selectedUrlHashes} 
            onScrapeNew={() => setIsScrapeOpen(true)}
            refreshTrigger={tableRefresh}
          />
        </section>

      </div>

      {/* Floating Action/Status Bar for Multi-Product Mode */}
      {filledSlotsCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs ring-1 ring-blue-500/50">
                {filledSlotsCount}
              </span>
              <span className="text-sm font-medium text-gray-200">
                of {products.length} Selected
              </span>
            </div>

            <div className="h-6 w-px bg-gray-700" />

            <div className="flex items-center gap-3">
              <button
                onClick={handleClearAll}
                className="text-gray-400 hover:text-red-400 text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>

              <Button
                onClick={() => setIsSetupOpen(true)}
                className={`
                  rounded-full shadow-lg transition-all pl-4 pr-5 h-9 text-sm
                  ${isReadyForAnalysis 
                    ? 'bg-gradient-to-r from-primary to-blue-500 hover:shadow-primary/30 border-none' 
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                {isReadyForAnalysis ? (
                  <>
                    <Play className="w-4 h-4 mr-1.5 fill-current" />
                    Configure Analysis
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-1.5" />
                    View Selection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scrape Target Modal */}
      <ScrapeDialog 
        isOpen={isScrapeOpen}
        onClose={() => setIsScrapeOpen(false)}
        onScrapeComplete={(data) => {
          setTableRefresh(prev => prev + 1);
          handleProductSelect(data as ProductData);
        }}
      />

      {/* The Configuration Modal */}
      <ProductSetupDialog 
        isOpen={isSetupOpen} 
        onClose={() => {
          setIsSetupOpen(false);
          handleClearAll();
        }} 
      />
    </div>
  );
}
