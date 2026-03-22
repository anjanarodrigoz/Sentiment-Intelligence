import { useEffect, useRef } from 'react';
import type { ProductInput } from '../../types/product';
import { Download, Star, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { exportReviewsToCsv } from '../../lib/exportCsv';
import VersionSelector from './VersionSelector';
import Button from '../ui/Button';
import { useScrapeStream } from '../../hooks/useScrapeStream';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

interface ProductInputCardProps {
  product: ProductInput;
  index: number;
  showIndex: boolean;
  onUpdate: (updates: Partial<ProductInput>) => void;
}

export default function ProductInputCard({
  product,
  index,
  showIndex,
  onUpdate,
}: ProductInputCardProps) {
  const { selectedBrand } = useAppStore();
  const {
    isStreaming,
    progress,
    allReviews: streamReviews,
    product: streamProduct,
    isComplete: streamComplete,
    version: streamVersion,
    scrapedAt: streamScrapedAt,
    urlHash: streamUrlHash,
    startStream,
  } = useScrapeStream();

  const completedRef = useRef(false);

  useEffect(() => {
    if (streamComplete && streamProduct && streamReviews.length > 0 && streamUrlHash && !completedRef.current) {
      completedRef.current = true;
      onUpdate({
        title: streamProduct.title,
        imageUrl: streamProduct.imageUrl,
        overallRating: streamProduct.rating,
        overallReviewCount: streamProduct.reviewCount,
        scrapedReviews: streamReviews,
        urlHash: streamUrlHash,
        scrapeMetadata: {
          cached: false,
          version: streamVersion || 1,
          scrapedAt: streamScrapedAt || new Date(),
        },
      });
    }
  }, [streamComplete, streamProduct, streamReviews, streamUrlHash, streamVersion, streamScrapedAt, onUpdate]);

  const handleRescrape = () => {
    if (product.productUrl && selectedBrand) {
      if (window.confirm("Are you sure you want to re-scrape this product? This will fetch the latest reviews.")) {
        completedRef.current = false;
        startStream(product.productUrl, selectedBrand, true);
      }
    }
  };

  const hasData = Boolean(product.title || product.scrapedReviews);

  return (
    <div className={cn("h-full flex flex-col bg-white border border-border hover:border-primary/30 transition-colors rounded-[1.25rem] p-5 relative overflow-hidden shadow-sm", isStreaming && "opacity-80 pointer-events-none")}>
      {/* Streaming Progress Overlay */}
      {isStreaming && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <h4 className="font-bold text-text-primary mb-1">Re-fetching latest data...</h4>
          <p className="text-sm text-text-secondary font-mono mb-4">
            {progress.current} reviews fetched
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage || 100}%` }}
            />
          </div>
        </div>
      )}

      {showIndex && (
        <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">
          Analysis Slot {index + 1}
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center">
        {!hasData ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-gray-400 font-semibold text-xl">{index + 1}</span>
            </div>
            <h4 className="text-text-primary font-medium mb-1">Slot Available</h4>
            <p className="text-sm text-text-secondary">Select a product from the database or scrape a new one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            <div className="flex gap-4 items-start relative group">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-24 h-24 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                  <span className="text-gray-400 text-xs">No Image</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0 pr-16 bg-transparent">
                <h4 className="font-semibold text-text-primary text-base line-clamp-2 leading-tight mb-2">
                  {product.title || 'Unknown Product'}
                </h4>
                
                <div className="flex items-center gap-4 text-sm mt-1">
                  <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{product.overallRating?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="text-text-secondary font-medium">
                    {product.overallReviewCount?.toLocaleString() || '0'} Total Ratings
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="text-xs font-semibold text-sentiment-positive bg-green-50 px-2 py-1.5 rounded-md inline-flex items-center border border-green-100">
                    {product.scrapedReviews?.length || 0} Reviews Fetched
                  </div>

                  {product.productUrl && (
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={handleRescrape}
                      className="h-8 px-3 text-xs font-medium text-text-secondary hover:text-primary flex items-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-scrape
                    </Button>
                  )}

                  {product.productUrl && (
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium bg-white border border-border text-text-secondary hover:text-primary hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Product
                    </a>
                  )}

                  {product.urlHash && product.scrapeMetadata?.version && (
                    <VersionSelector
                      urlHash={product.urlHash}
                      currentVersion={product.scrapeMetadata.version}
                      onVersionSelect={(data) => onUpdate({
                        title: data.product.title,
                        imageUrl: data.product.imageUrl,
                        overallRating: data.product.rating,
                        overallReviewCount: data.product.reviewCount,
                        scrapedReviews: data.reviews,
                        scrapeMetadata: {
                          cached: true,
                          version: data.version,
                          scrapedAt: new Date()
                        }
                      })}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* REVIEW DATA TABLE PREVIEW */}
            {product.scrapedReviews && product.scrapedReviews.length > 0 && (
              <div className="border border-border rounded-xl bg-white overflow-hidden flex flex-col max-h-[400px] shadow-sm">
                <div className="px-4 py-3 bg-gray-50/80 border-b border-border flex justify-between items-center sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <h5 className="text-sm font-bold text-text-primary">Raw Review Data</h5>
                    <span className="text-xs font-semibold text-text-secondary bg-gray-200/50 px-2 py-1 rounded-md">
                      Showing {Math.min(product.scrapedReviews.length, 100)} of {product.scrapedReviews.length}
                    </span>
                  </div>
                  
                  <Button
                      size="sm"
                      onClick={() => exportReviewsToCsv(product.scrapedReviews!, `reviews-${product.id}.csv`)}
                      className="h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm border-transparent"
                  >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                      <span className="sm:hidden">Export</span>
                  </Button>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white border-b border-border sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold text-text-secondary w-16 text-center">Rating</th>
                        <th className="px-4 py-2.5 font-semibold text-text-secondary w-28">Date</th>
                        <th className="px-4 py-2.5 font-semibold text-text-secondary w-full">Review Content</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {product.scrapedReviews.slice(0, 100).map((review, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-center text-orange-500 font-medium whitespace-nowrap">★ {review.rating}</td>
                          <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{review.date || 'Unknown'}</td>
                          <td className="px-4 py-3 whitespace-normal">
                            <div className="max-w-md xl:max-w-2xl text-text-primary line-clamp-2" title={review.text}>
                              {review.text}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
