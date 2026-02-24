import { useState, useCallback } from 'react';
import { fetchExistingProducts } from '../services/scrapeService';
import type { ExistingProduct } from '../types/scrape';
import type { RawReview } from '../types/review';
import type { ScrapedProduct } from '../types/scrape';

interface UseExistingProductsReturn {
  products: ExistingProduct[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  fetchProducts: (brand: string, search?: string) => Promise<void>;
  selectProduct: (urlHash: string) => Promise<{
    reviews: RawReview[];
    product: ScrapedProduct;
    version: number;
  } | null>;
  deleteProduct: (urlHash: string) => Promise<boolean>;
  isSelecting: boolean;
}

export function useExistingProducts(): UseExistingProductsReturn {
  const [products, setProducts] = useState<ExistingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

  const fetchProducts = useCallback(async (brand: string, search?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchExistingProducts(brand, search);
      setProducts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (urlHash: string) => {
    try {
      const response = await fetch(`/api/products/${urlHash}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      setProducts((prev) => prev.filter((p) => p.urlHash !== urlHash));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      setError(message);
      return false;
    }
  }, []);

  const selectProduct = useCallback(async (urlHash: string) => {
    try {
      setIsSelecting(true);
      setError(null);

      const response = await fetch(`/api/products/${urlHash}/reviews`);
      if (!response.ok) {
        throw new Error('Failed to load product reviews');
      }

      const data = await response.json();
      return {
        reviews: data.reviews as RawReview[],
        product: data.product as ScrapedProduct,
        version: data.version as number,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select product';
      setError(message);
      return null;
    } finally {
      setIsSelecting(false);
    }
  }, []);

  return {
    products,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchProducts,
    selectProduct,
    deleteProduct,
    isSelecting,
  };
}
