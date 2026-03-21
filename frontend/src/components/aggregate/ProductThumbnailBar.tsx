import type { ProductAnalysis } from '../../types/product';
import StarRating from '../ui/StarRating';

interface ProductThumbnailBarProps {
  analyses: ProductAnalysis[];
}

export default function ProductThumbnailBar({ analyses }: ProductThumbnailBarProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {analyses.map((a) => (
        <div
          key={a.productId}
          className="flex items-center gap-3 min-w-[200px] bg-white rounded-lg border border-border p-3"
        >
          {a.imageUrl && (
            <img
              src={a.imageUrl}
              alt={a.title}
              className="w-12 h-12 rounded object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{a.title}</p>
            <StarRating rating={a.overallRating} size="sm" />
            <p className="text-xs text-text-secondary">
              {a.reviews.length} reviews
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
