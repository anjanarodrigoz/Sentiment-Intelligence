import { useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
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

  const handleVersionClick = async (version: number) => {
    const result = await selectVersion(urlHash, version);
    if (result) {
      onVersionSelect(result);
    }
  };

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
    <div className="bg-gray-50/80 border border-border rounded-lg p-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-text-primary flex items-center gap-2 whitespace-nowrap">
          <Clock className="w-4 h-4 text-text-secondary" />
          Version History:
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />}
        </label>

        {error ? (
          <div className="text-xs text-sentiment-negative">{error}</div>
        ) : (
          <div className="relative flex-1 w-full">
            <select
              value={selectedVersion ?? currentVersion}
              onChange={(e) => handleVersionClick(Number(e.target.value))}
              disabled={isLoading}
              className="w-full appearance-none bg-white border border-border hover:border-border/80 rounded-md pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer shadow-sm transition-all"
            >
              {versions.map((v) => {
                const isBaseline = v.version === 1;
                const newRv = isBaseline
                  ? `${v.newReviewCount || v.reviewCount} total`
                  : `+${v.newReviewCount || v.reviewCount} new`;
                const cumRv = `${v.cumulativeReviewCount || v.reviewCount} total reviews`;

                return (
                  <option key={v.version} value={v.version}>
                    v{v.version} — {formatDate(v.scrapedAt)} ({newRv}) | {cumRv}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
