import { useEffect } from 'react';
import { Clock, Loader2, ChevronRight } from 'lucide-react';
import { useVersionSelector } from '../../hooks/useVersionSelector';
import type { RawReview } from '../../types/review';
import type { ScrapedProduct } from '../../types/scrape';

interface VersionSelectorProps {
  urlHash: string;
  currentVersion: number;
  onVersionSelect: (data: {
    reviews: RawReview[];
    product: ScrapedProduct;
    version: number;
  }) => void;
}

export default function VersionSelector({
  urlHash,
  currentVersion,
  onVersionSelect,
}: VersionSelectorProps) {
  const {
    versions,
    selectedVersion,
    reviews,
    product,
    isLoading,
    error,
    fetchVersions,
    selectVersion,
  } = useVersionSelector();

  useEffect(() => {
    if (urlHash) {
      fetchVersions(urlHash);
    }
  }, [urlHash, fetchVersions]);

  // Notify parent when version reviews are loaded
  useEffect(() => {
    if (reviews.length > 0 && product && selectedVersion !== null) {
      onVersionSelect({
        reviews,
        product,
        version: selectedVersion,
      });
    }
  }, [reviews, product, selectedVersion, onVersionSelect]);

  if (versions.length <= 1) {
    return null;
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-gray-50 border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <Clock className="w-4 h-4" />
        Version History
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />}
      </div>

      {error && (
        <div className="text-xs text-sentiment-negative">{error}</div>
      )}

      <div className="space-y-1">
        {versions.map((v) => {
          const isSelected = (selectedVersion ?? currentVersion) === v.version;
          const isBaseline = v.version === 1;

          return (
            <button
              key={v.version}
              onClick={() => selectVersion(urlHash, v.version)}
              disabled={isLoading}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                isSelected
                  ? 'bg-primary/10 border border-primary/30 text-primary'
                  : 'hover:bg-gray-100 text-text-secondary'
              }`}
            >
              <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                isSelected ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-text-secondary'
              }`}>
                v{v.version}
              </span>

              <span className="flex-1">
                <span className="text-text-primary text-xs">{formatDate(v.scrapedAt)}</span>
                <span className="text-text-secondary text-xs ml-2">
                  {isBaseline
                    ? `${v.newReviewCount || v.reviewCount} reviews`
                    : `+${v.newReviewCount || v.reviewCount} new`}
                </span>
              </span>

              <span className="text-xs text-text-secondary">
                {v.cumulativeReviewCount || v.reviewCount} total
              </span>

              {isSelected && (
                <ChevronRight className="w-3 h-3 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-text-secondary pt-1 border-t border-border">
        Select a version to view cumulative reviews up to that point
      </div>
    </div>
  );
}
