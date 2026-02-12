import { useState, useCallback } from 'react';
import type { RawReview } from '../types/review';
import type { ScrapedProduct } from '../types/scrape';
import type { VersionInfo, ProductVersionsResponse, VersionedReviewsResponse } from '../types/scrape';

interface UseVersionSelectorReturn {
  versions: VersionInfo[];
  selectedVersion: number | null;
  reviews: RawReview[];
  product: ScrapedProduct | null;
  isLoading: boolean;
  error: string | null;
  fetchVersions: (urlHash: string) => Promise<void>;
  selectVersion: (urlHash: string, version: number) => Promise<void>;
}

export function useVersionSelector(): UseVersionSelectorReturn {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [reviews, setReviews] = useState<RawReview[]>([]);
  const [product, setProduct] = useState<ScrapedProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async (urlHash: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${urlHash}/versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }

      const data: ProductVersionsResponse = await response.json();
      setVersions(data.versions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch versions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectVersion = useCallback(async (urlHash: string, version: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${urlHash}/reviews?upToVersion=${version}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data: VersionedReviewsResponse = await response.json();
      setSelectedVersion(version);
      setReviews(data.reviews);
      setProduct(data.product);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reviews';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    versions,
    selectedVersion,
    reviews,
    product,
    isLoading,
    error,
    fetchVersions,
    selectVersion,
  };
}
