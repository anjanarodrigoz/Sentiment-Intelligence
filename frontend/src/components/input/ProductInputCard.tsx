import Card from '../ui/Card';
import ProductImageUpload from './ProductImageUpload';
import ReviewFileUpload from './ReviewFileUpload';
import ReviewSourceToggle from './ReviewSourceToggle';
import UrlReviewInput from './UrlReviewInput';
import ExistingProductSelector from './ExistingProductSelector';
import type { ProductInput } from '../../types/product';

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
  return (
    <Card>
      {showIndex && (
        <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-4">
          Product {index + 1}
        </div>
      )}

      <div className="space-y-4">
        <ReviewSourceToggle
          mode={product.inputMode}
          onChange={(mode) => onUpdate({ inputMode: mode })}
        />

        {product.inputMode === 'url' ? (
          <>
            <UrlReviewInput
              productUrl={product.productUrl}
              scrapedReviews={product.scrapedReviews}
              onUrlChange={(url) => onUpdate({ productUrl: url })}
              onScrapeComplete={(data) => onUpdate(data)}
            />

            {product.scrapedReviews && (
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={product.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Overall Rating
                    </label>
                    <input
                      type="number"
                      value={product.overallRating || ''}
                      onChange={(e) =>
                        onUpdate({ overallRating: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      max={5}
                      step={0.1}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Total Review Count
                    </label>
                    <input
                      type="number"
                      value={product.overallReviewCount || ''}
                      onChange={(e) =>
                        onUpdate({
                          overallReviewCount: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                {product.imageUrl && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Product Image
                    </label>
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-20 h-20 rounded-lg object-cover border border-border"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : product.inputMode === 'existing' ? (
          <>
            <ExistingProductSelector
              onProductSelect={(data) => onUpdate({
                title: data.title,
                imageUrl: data.imageUrl,
                overallRating: data.overallRating,
                overallReviewCount: data.overallReviewCount,
                scrapedReviews: data.scrapedReviews,
                productUrl: data.productUrl,
                urlHash: data.urlHash,
                scrapeMetadata: data.scrapeMetadata,
              })}
              selectedUrlHash={product.urlHash}
              selectedVersion={product.scrapeMetadata?.version}
              scrapedReviews={product.scrapedReviews}
              productUrl={product.productUrl}
            />

            {product.scrapedReviews && product.scrapedReviews.length > 0 && (
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={product.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Overall Rating
                    </label>
                    <input
                      type="number"
                      value={product.overallRating || ''}
                      onChange={(e) =>
                        onUpdate({ overallRating: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      max={5}
                      step={0.1}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Total Review Count
                    </label>
                    <input
                      type="number"
                      value={product.overallReviewCount || ''}
                      onChange={(e) =>
                        onUpdate({
                          overallReviewCount: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                {product.imageUrl && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Product Image
                    </label>
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-20 h-20 rounded-lg object-cover border border-border"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Product Title
              </label>
              <input
                type="text"
                value={product.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="e.g., Lululemon Align High-Rise Pant 28"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Overall Rating
                </label>
                <input
                  type="number"
                  value={product.overallRating || ''}
                  onChange={(e) =>
                    onUpdate({ overallRating: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="4.5"
                  min={0}
                  max={5}
                  step={0.1}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Total Review Count
                </label>
                <input
                  type="number"
                  value={product.overallReviewCount || ''}
                  onChange={(e) =>
                    onUpdate({
                      overallReviewCount: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="1250"
                  min={0}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <ProductImageUpload
              imageUrl={product.imageUrl}
              imageFile={product.imageFile}
              onImageFileChange={(file) => onUpdate({ imageFile: file })}
              onImageUrlChange={(url) => onUpdate({ imageUrl: url })}
            />

            <ReviewFileUpload
              reviewFile={product.reviewFile}
              reviewFileName={product.reviewFileName}
              reviewCount={product.reviewCount}
              onFileChange={(file, name, count) =>
                onUpdate({ reviewFile: file, reviewFileName: name, reviewCount: count })
              }
            />
          </>
        )}
      </div>
    </Card>
  );
}
