import { useState } from 'react';
import { Globe, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

  const handleFetch = async () => {
    if (!productUrl || !selectedBrand) return;

    const result = await scrape(productUrl, selectedBrand);
    if (result) {
      setSource(result.source);
      onScrapeComplete({
        title: result.product.title,
        imageUrl: result.product.imageUrl,
        overallRating: result.product.rating,
        overallReviewCount: result.product.reviewCount,
        scrapedReviews: result.reviews,
        productUrl,
      });
    }
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
          onClick={handleFetch}
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
        <div className="flex items-center gap-2 text-sm text-sentiment-positive bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>
            Fetched {scrapedReviews.length} reviews via {source || 'scraper'}
          </span>
        </div>
      )}
    </div>
  );
}
