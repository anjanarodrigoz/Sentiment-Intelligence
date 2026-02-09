import { useState } from 'react';
import { Globe, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { useScrape } from '../../hooks/useScrape';
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
  const { isLoading, error, scrape } = useScrape();
  const [source, setSource] = useState<string>('');
  const [scrapeMetadata, setScrapeMetadata] = useState<{
    cached: boolean;
    version: number;
    scrapedAt: Date;
  } | null>(null);

  const handleFetch = async (forceRescrape = false) => {
    if (!productUrl || !selectedBrand) return;

    const result = await scrape(productUrl, selectedBrand, forceRescrape);
    if (result) {
      setSource(result.source);

      const metadata =
        result.cached !== undefined && result.version !== undefined && result.scrapedAt
          ? {
              cached: result.cached,
              version: result.version,
              scrapedAt: new Date(result.scrapedAt),
            }
          : null;

      setScrapeMetadata(metadata);

      onScrapeComplete({
        title: result.product.title,
        imageUrl: result.product.imageUrl,
        overallRating: result.product.rating,
        overallReviewCount: result.product.reviewCount,
        scrapedReviews: result.reviews,
        productUrl,
        scrapeMetadata: metadata || undefined,
      });
    }
  };

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

  const isValidUrl = (() => {
    try {
      new URL(productUrl);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-primary">
        Product URL
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="url"
            value={productUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Paste the product URL..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <Button
          onClick={() => handleFetch()}
          disabled={!isValidUrl || isLoading}
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching...
            </>
          ) : (
            'Fetch Reviews'
          )}
        </Button>
      </div>

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
              Fetched {scrapedReviews.length} reviews via {source || 'scraper'}
            </div>
            {scrapeMetadata && (
              <div className="text-gray-600 text-xs mt-1">
                {scrapeMetadata.cached ? (
                  <>
                    Cached (version {scrapeMetadata.version}) •{' '}
                    {formatTimestamp(scrapeMetadata.scrapedAt)}
                  </>
                ) : (
                  <>Freshly scraped • Just now</>
                )}
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => handleFetch(true)} disabled={isLoading}>
            <RefreshCw className="w-3 h-3" />
            Re-scrape
          </Button>
        </div>
      )}
    </div>
  );
}
