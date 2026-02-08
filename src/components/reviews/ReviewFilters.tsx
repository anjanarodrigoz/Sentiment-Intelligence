import { Search, X } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import { ATTRIBUTE_LABELS } from '../../constants/attributes';
import type { AttributeTag } from '../../types/review';
import { cn } from '../../lib/utils';

export default function ReviewFilters() {
  const {
    sentimentFilter,
    attributeFilter,
    ratingFilter,
    keywordSearch,
    toggleSentiment,
    toggleAttribute,
    toggleRating,
    setKeywordSearch,
    resetFilters,
  } = useFilterStore();

  const hasFilters =
    sentimentFilter.length > 0 ||
    attributeFilter.length > 0 ||
    ratingFilter.length > 0 ||
    keywordSearch.length > 0;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          value={keywordSearch}
          onChange={(e) => setKeywordSearch(e.target.value)}
          placeholder="Search for keywords..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-4">
        {/* Sentiments */}
        <div>
          <span className="text-xs font-medium text-text-secondary block mb-1">
            Sentiments:
          </span>
          <div className="flex gap-1">
            {(['positive', 'negative', 'mixed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => toggleSentiment(s)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border transition-colors capitalize',
                  sentimentFilter.includes(s)
                    ? s === 'positive'
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : s === 'negative'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-orange-100 border-orange-300 text-orange-700'
                    : 'bg-white border-border text-text-secondary hover:border-gray-300'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Attributes */}
        <div>
          <span className="text-xs font-medium text-text-secondary block mb-1">
            Attributes:
          </span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(ATTRIBUTE_LABELS) as AttributeTag[]).map((attr) => (
              <button
                key={attr}
                onClick={() => toggleAttribute(attr)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border transition-colors',
                  attributeFilter.includes(attr)
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-border text-text-secondary hover:border-gray-300'
                )}
              >
                {ATTRIBUTE_LABELS[attr]}
              </button>
            ))}
          </div>
        </div>

        {/* Ratings */}
        <div>
          <span className="text-xs font-medium text-text-secondary block mb-1">
            Ratings:
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => toggleRating(r)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md border transition-colors',
                  ratingFilter.includes(r)
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                    : 'bg-white border-border text-text-secondary hover:border-gray-300'
                )}
              >
                {r} Star
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <X className="w-3 h-3" />
          Clear Filters
        </button>
      )}
    </div>
  );
}
