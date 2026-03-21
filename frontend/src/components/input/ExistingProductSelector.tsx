import { useEffect, useCallback, useState, useRef } from 'react';
import { Search, Loader2, Package, AlertCircle, Star, Clock, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useExistingProducts } from '../../hooks/useExistingProducts';
import { useAppStore } from '../../store/useAppStore';
import { useScrapeStream } from '../../hooks/useScrapeStream';
import VersionSelector from './VersionSelector';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { cn } from '../../lib/utils';
import type { RawReview } from '../../types/review';

interface ExistingProductSelectorProps {
  onProductSelect: (data: {
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
  }) => void;
  selectedUrlHash?: string;
  selectedVersion?: number;
  scrapedReviews: RawReview[] | null;
  productUrl: string;
}

export default function ExistingProductSelector({
  onProductSelect,
  selectedUrlHash,
  selectedVersion,
  scrapedReviews,
  productUrl,
}: ExistingProductSelectorProps) {
  const [productToDelete, setProductToDelete] = useState<{ urlHash: string; title: string } | null>(null);
  const onProductSelectRef = useRef(onProductSelect);
  useEffect(() => { onProductSelectRef.current = onProductSelect; });
  const { selectedBrand } = useAppStore();
  const {
    products,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchProducts,
    selectProduct,
    deleteProduct,
    isSelecting,
  } = useExistingProducts();

  const {
    isStreaming,
    allReviews: streamReviews,
    product: streamProduct,
    isComplete: streamComplete,
    version: streamVersion,
    scrapedAt: streamScrapedAt,
    urlHash: streamUrlHash,
    startStream,
  } = useScrapeStream();

  // Fetch products when component mounts or brand changes
  useEffect(() => {
    if (selectedBrand) {
      fetchProducts(selectedBrand);
    }
  }, [selectedBrand, fetchProducts]);

  // Re-fetch when search changes (debounced)
  useEffect(() => {
    if (selectedBrand) {
      const timer = setTimeout(() => {
        fetchProducts(selectedBrand, searchQuery || undefined);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedBrand, fetchProducts]);

  // Handle re-scrape stream completion
  useEffect(() => {
    if (streamComplete && streamProduct && streamReviews.length > 0 && streamUrlHash) {
      onProductSelectRef.current({
        title: streamProduct.title,
        imageUrl: streamProduct.imageUrl,
        overallRating: streamProduct.rating,
        overallReviewCount: streamProduct.reviewCount,
        scrapedReviews: streamReviews,
        productUrl,
        urlHash: streamUrlHash,
        scrapeMetadata: {
          cached: false,
          version: streamVersion || 1,
          scrapedAt: streamScrapedAt || new Date(),
        },
      });
    }
  }, [streamComplete, streamProduct, streamReviews, streamUrlHash, streamVersion, streamScrapedAt, productUrl]);

  const handleSelect = useCallback(async (urlHash: string, url: string) => {
    const result = await selectProduct(urlHash);
    if (result) {
      onProductSelectRef.current({
        title: result.product.title,
        imageUrl: result.product.imageUrl,
        overallRating: result.product.rating,
        overallReviewCount: result.product.reviewCount,
        scrapedReviews: result.reviews,
        productUrl: url,
        urlHash,
        scrapeMetadata: {
          cached: true,
          version: result.version,
          scrapedAt: new Date(),
        },
      });
    }
  }, [selectProduct]);

  const handleRescrape = useCallback(() => {
    if (productUrl && selectedBrand) {
      startStream(productUrl, selectedBrand, true);
    }
  }, [productUrl, selectedBrand, startStream]);

  const handleVersionSelect = useCallback((data: {
    reviews: RawReview[];
    product: { title: string; imageUrl: string; rating: number; reviewCount: number };
    version: number;
  }) => {
    if (!selectedUrlHash) return;
    onProductSelectRef.current({
      title: data.product.title,
      imageUrl: data.product.imageUrl,
      overallRating: data.product.rating,
      overallReviewCount: data.product.reviewCount,
      scrapedReviews: data.reviews,
      productUrl,
      urlHash: selectedUrlHash,
      scrapeMetadata: {
        cached: true,
        version: data.version,
        scrapedAt: new Date(),
      },
    });
  }, [selectedUrlHash, productUrl]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // If a product is already selected and loaded, show success state
  if (selectedUrlHash && scrapedReviews && scrapedReviews.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 text-sm bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-sentiment-positive" />
          <div className="flex-1">
            <div className="text-sentiment-positive font-medium">
              Loaded {scrapedReviews.length} reviews from database
            </div>
            {selectedVersion && (
              <div className="text-gray-600 text-xs mt-1">
                Version {selectedVersion}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRescrape}
              disabled={isStreaming}
            >
              <RefreshCw className={cn('w-3 h-3', isStreaming && 'animate-spin')} />
              Re-scrape
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onProductSelectRef.current({
                title: '',
                imageUrl: '',
                overallRating: 0,
                overallReviewCount: 0,
                scrapedReviews: [],
                productUrl: '',
                urlHash: '',
                scrapeMetadata: { cached: false, version: 0, scrapedAt: new Date() },
              })}
            >
              Change
            </Button>
          </div>
        </div>

        {selectedUrlHash && selectedVersion && (
          <VersionSelector
            urlHash={selectedUrlHash}
            currentVersion={selectedVersion}
            onVersionSelect={handleVersionSelect}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-primary">
        Select a Previously Scraped Product
      </label>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product name..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading products...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-sentiment-negative bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && products.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {searchQuery
              ? 'No products match your search.'
              : 'No previously scraped products found for this brand.'}
          </p>
        </div>
      )}

      {/* Product list */}
      {!isLoading && products.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
          {products.map((product) => (
            <div
              key={product.urlHash}
              className="flex items-center gap-1"
            >
              <button
                onClick={() => handleSelect(product.urlHash, product.url)}
                disabled={isSelecting}
                className="flex-1 flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-gray-50 border border-transparent"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-10 h-10 rounded-md object-cover border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {product.title}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {product.rating.toFixed(1)}
                    </span>
                    <span>{product.reviewCount} reviews</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(product.updatedAt)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-text-secondary font-mono">
                  v{product.currentVersion}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProductToDelete({ urlHash: product.urlHash, title: product.title });
                }}
                className="p-2 rounded-lg text-text-secondary hover:text-sentiment-negative hover:bg-red-50 transition-colors shrink-0"
                title="Delete product"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading overlay for selection */}
      {isSelecting && (
        <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading product reviews...
        </div>
      )}

      <ConfirmDialog
        open={!!productToDelete}
        title={`Delete "${productToDelete?.title}"?`}
        description="This will permanently remove the following data:"
        items={[
          'All scraped reviews for this product',
          'All version history and snapshots',
          'The product record itself',
        ]}
        confirmLabel="Delete Product"
        variant="danger"
        onConfirm={() => {
          if (productToDelete) {
            deleteProduct(productToDelete.urlHash);
            setProductToDelete(null);
          }
        }}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
