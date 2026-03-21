import { useState, useCallback } from 'react';
import type { RawReview } from '../types/review';
import type { ScrapedProduct } from '../types/scrape';
import type { VersionInfo, ProductVersionsResponse, VersionedReviewsResponse } from '../types/scrape';

interface VersionSelectResult {
  reviews: RawReview[];
  product: ScrapedProduct;
  version: number;
}

interface UseVersionSelectorReturn {
  versions: VersionInfo[];
  selectedVersion: number | null;
  isLoading: boolean;
  error: string | null;
  fetchVersions: (urlHash: string) => Promise<void>;
  selectVersion: (urlHash: string, version: number) => Promise<VersionSelectResult | null>;
}

export function useVersionSelector(): UseVersionSelectorReturn {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
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

  const selectVersion = useCallback(async (urlHash: string, version: number): Promise<VersionSelectResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${urlHash}/reviews?upToVersion=${version}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data: VersionedReviewsResponse = await response.json();
      setSelectedVersion(version);

      return {
        reviews: data.reviews,
        product: data.product,
        version,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reviews';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    versions,
    selectedVersion,
    isLoading,
    error,
    fetchVersions,
    selectVersion,
  };
}
