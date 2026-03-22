import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Loader2, CheckCircle, AlertCircle, RefreshCw, GitCompareArrows } from 'lucide-react';
import Button from '../ui/Button';
import { useScrape } from '../../hooks/useScrape';
import { useScrapeStream } from '../../hooks/useScrapeStream';
import ProgressBar from '../ui/ProgressBar';
import VersionSelector from './VersionSelector';
import { useAppStore } from '../../store/useAppStore';
import type { RawReview } from '../../types/review';

interface UrlReviewInputProps {
  productUrl: string;
  scrapedReviews: RawReview[] | null;
  onUrlChange: (url: string) => void;
  onScrapeComplete: (data: {
    title: string;
    imageUrl: string;
    overallRating: number;
    overallReviewCount: number;
    scrapedReviews: RawReview[];
    productUrl: string;
    scrapeMetadata?: {
      cached: boolean;
      version: number;
      scrapedAt: Date;
    };
  }) => void;
}

export default function UrlReviewInput({
  productUrl,
  scrapedReviews,
  onUrlChange,
  onScrapeComplete,
}: UrlReviewInputProps) {
  const { selectedBrand } = useAppStore();
  const { isLoading, error: fetchError } = useScrape();
  const {
    isStreaming,
    progress,
    allReviews,
    product,
    error: streamError,
    isComplete,
    isCached,
    source: streamSource,
    scrapedAt,
    version: streamVersion,
    newReviewCount,
    duplicateCount,
    isNewVersion,
    urlHash: streamUrlHash,
    dedupMessage,
    startStream,
    cancelStream: _cancelStream,
  } = useScrapeStream();

  const [source, setSource] = useState<string>('');
  const [scrapeMetadata, setScrapeMetadata] = useState<{
    cached: boolean;
    version: number;
    scrapedAt: Date;
  } | null>(null);
  const [currentUrlHash, setCurrentUrlHash] = useState<string | null>(null);

  // Track if we've already completed this scrape to prevent infinite loops
  const completedRef = useRef(false);

  // Handle completion of streaming
  useEffect(() => {
    console.log('[UrlReviewInput] useEffect triggered:', {
      isComplete,
      hasProduct: !!product,
      reviewsLength: allReviews.length,
      completedRefCurrent: completedRef.current,
    });

    if (isComplete && product && allReviews.length > 0 && !completedRef.current) {
      console.log('[UrlReviewInput] Calling onScrapeComplete with:', {
        title: product.title,
        reviewCount: allReviews.length,
        rating: product.rating,
      });

      completedRef.current = true;
      setSource(streamSource || '');
      setCurrentUrlHash(streamUrlHash);

      const metadata = scrapedAt && streamVersion
        ? {
            cached: isCached,
            version: streamVersion,
            scrapedAt: scrapedAt,
          }
        : null;

      setScrapeMetadata(metadata);

      onScrapeComplete({
        title: product.title,
        imageUrl: product.imageUrl,
        overallRating: product.rating,
        overallReviewCount: product.reviewCount,
        scrapedReviews: allReviews,
        productUrl,
        scrapeMetadata: metadata || undefined,
      });

      console.log('[UrlReviewInput] onScrapeComplete called successfully');
    }
  }, [isComplete, product, allReviews, streamSource, scrapedAt, isCached, streamVersion, streamUrlHash, productUrl, onScrapeComplete]);

  const handleFetch = async (forceRescrape = false) => {
    if (!productUrl || !selectedBrand) return;

    // Reset completion flag when starting a new scrape
    completedRef.current = false;

    // Use streaming for progressive loading
    startStream(productUrl, selectedBrand, forceRescrape);
  };

  const handleVersionSelect = useCallback((data: {
    reviews: RawReview[];
    product: { title: string; imageUrl: string; rating: number; reviewCount: number };
    version: number;
  }) => {
    onScrapeComplete({
      title: data.product.title,
      imageUrl: data.product.imageUrl,
      overallRating: data.product.rating,
      overallReviewCount: data.product.reviewCount,
      scrapedReviews: data.reviews,
      productUrl,
      scrapeMetadata: {
        cached: true,
        version: data.version,
        scrapedAt: new Date(),
      },
    });
  }, [onScrapeComplete, productUrl]);

  // Format timestamp for display
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const error = fetchError || streamError;
  const isBusy = isLoading || isStreaming;

  const isValidUrl = (() => {
    try {
      new URL(productUrl);
      return true;
    } catch {
      return false;
    }
  })();

  // Build success message with delta info
  const getSuccessMessage = () => {
    if (!scrapedReviews || scrapedReviews.length === 0) return '';

    const base = `Fetched ${scrapedReviews.length} reviews via ${source || 'scraper'}`;

    if (newReviewCount !== null && duplicateCount !== null && duplicateCount > 0) {
      return `${base} (${newReviewCount} new, ${duplicateCount} already tracked)`;
    }

    return base;
  };

  return (
    <div className="space-y-4 pt-2">
      <label className="block text-sm font-semibold text-text-primary mb-1">
        Product URL
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            type="url"
            value={productUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Paste Amazon, Sephora, or Shopify product link..."
            className="w-full pl-11 pr-4 py-3.5 text-base bg-white border-2 border-border/60 hover:border-border rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
          />
        </div>
        <Button
          onClick={() => handleFetch()}
          disabled={!isValidUrl || isBusy}
          size="lg"
          className="rounded-xl px-6 font-medium shadow-sm"
        >
          {isBusy ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{dedupMessage ? 'Comparing' : 'Fetching'}</span>
            </div>
          ) : (
            'Scrape Details'
          )}
        </Button>
      </div>

      {/* Streaming progress */}
      {isStreaming && !isCached && (
        <div className="bg-blue-50 p-3 rounded-lg space-y-3">
          {/* Step indicators */}
          <div className="flex items-center gap-4 text-xs">
            <div className={`flex items-center gap-1.5 ${dedupMessage ? 'text-sentiment-positive' : 'text-primary font-medium'}`}>
              {dedupMessage ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>1. Fetching reviews</span>
            </div>
            <div className={`flex items-center gap-1.5 ${dedupMessage ? 'text-primary font-medium' : 'text-text-secondary/50'}`}>
              {dedupMessage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitCompareArrows className="w-3.5 h-3.5" />
              )}
              <span>2. Checking for new reviews</span>
            </div>
          </div>

          {/* Phase content */}
          {dedupMessage ? (
            <div className="flex items-center gap-2.5 py-1">
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-primary/60 rounded-full animate-pulse" />
              </div>
            </div>
          ) : (
            <ProgressBar
              current={progress.current}
              estimated={progress.estimated}
              percentage={progress.percentage}
            />
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-sentiment-negative bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {scrapedReviews && scrapedReviews.length > 0 && !error && (
        <div className="flex items-start gap-3 text-sm bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-sentiment-positive" />
          <div className="flex-1">
            <div className="text-sentiment-positive font-medium">
              {getSuccessMessage()}
            </div>
            {scrapeMetadata && (
              <div className="text-gray-600 text-xs mt-1">
                {scrapeMetadata.cached ? (
                  <>
                    Cached (version {scrapeMetadata.version}) •{' '}
                    {formatTimestamp(scrapeMetadata.scrapedAt)}
                  </>
                ) : isNewVersion ? (
                  <>Version {scrapeMetadata.version} created • Just now</>
                ) : (
                  <>No new reviews found • Version {scrapeMetadata.version}</>
                )}
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => handleFetch(true)} disabled={isBusy}>
            <RefreshCw className="w-3 h-3" />
            Re-scrape
          </Button>
        </div>
      )}

      {/* Version selector - shown when product has multiple versions */}
      {currentUrlHash && scrapeMetadata && !error && (
        <VersionSelector
          urlHash={currentUrlHash}
          currentVersion={scrapeMetadata.version}
          onVersionSelect={handleVersionSelect}
        />
      )}
    </div>
  );
}
