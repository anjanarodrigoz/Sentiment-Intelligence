import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Package, Star, Clock, Trash2, Plus } from 'lucide-react';
import { useExistingProducts } from '../../hooks/useExistingProducts';
import { useAppStore } from '../../store/useAppStore';
import ConfirmDialog from '../ui/ConfirmDialog';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import type { RawReview } from '../../types/review';

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

interface ExistingProductsTableProps {
  onProductSelect: (data: ProductData) => void;
  selectedUrlHashes: string[];
  onScrapeNew: () => void;
  refreshTrigger?: number;
}

export default function ExistingProductsTable({
  onProductSelect,
  selectedUrlHashes,
  onScrapeNew,
  refreshTrigger = 0,
}: ExistingProductsTableProps) {
  const [productToDelete, setProductToDelete] = useState<{ urlHash: string; title: string } | null>(null);
  
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
  } = useExistingProducts();

  useEffect(() => {
    if (selectedBrand) {
      fetchProducts(selectedBrand);
    }
  }, [selectedBrand, fetchProducts, refreshTrigger]);

  useEffect(() => {
    if (selectedBrand) {
      const timer = setTimeout(() => {
        fetchProducts(selectedBrand, searchQuery || undefined);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedBrand, fetchProducts]);

  const handleSelect = useCallback(async (urlHash: string, url: string) => {
    const result = await selectProduct(urlHash);
    if (result) {
      onProductSelect({
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
  }, [selectProduct, onProductSelect]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="bg-white border text-left border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Header & Search */}
      <div className="p-4 border-b border-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold text-text-primary">Database Products</h3>
            <p className="text-sm text-text-secondary">Select previously scraped items to add to your analysis.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white shadow-sm transition-shadow"
            />
          </div>
          <Button onClick={onScrapeNew} className="shrink-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Scrape New</span>
          </Button>
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary" />
          <span className="font-medium">Loading database...</span>
        </div>
      )}

      {error && (
        <div className="p-6 text-center text-red-600 bg-red-50/50">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-text-primary">No Products Found</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No items matched your search query.'
              : 'Your database is empty for this brand. Use the URL scraper below to add your first product!'}
          </p>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && products.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left align-middle">
            <thead className="bg-gray-50/80 text-xs uppercase text-text-secondary border-b border-border font-semibold">
              <tr>
                <th className="px-5 py-3 rounded-tl-xl whitespace-nowrap">Product</th>
                <th className="px-5 py-3 min-w-[120px]">Rating</th>
                <th className="px-5 py-3 whitespace-nowrap">Last Scraped</th>
                <th className="px-5 py-3 rounded-tr-xl text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {products.map((product) => {
                const isSelected = selectedUrlHashes.includes(product.urlHash);

                return (
                  <tr 
                    key={product.urlHash} 
                    onClick={() => handleSelect(product.urlHash, product.url)}
                    className={cn(
                      "group transition-colors hover:bg-gray-50/80 cursor-pointer",
                      isSelected && "bg-blue-50/50 hover:bg-blue-50/80"
                    )}
                  >
                    <td className="px-5 py-3 max-w-[280px]">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-10 h-10 rounded-md object-contain bg-white border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center shrink-0 border border-border">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary truncate" title={product.title}>
                            {product.title}
                          </p>
                          <p className="text-xs text-text-secondary truncate mt-0.5 font-mono">
                            v{product.currentVersion} • Database
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-md font-medium text-xs border border-orange-100">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{product.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-text-secondary font-medium">
                          {product.reviewCount} reviews
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(product.updatedAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete({ urlHash: product.urlHash, title: product.title });
                          }}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                          title="Delete from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
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
