import { useState, useCallback } from 'react';
import { scrapeProductUrl } from '../services/scrapeService';
import type { ScrapeResponse } from '../types/scrape';

interface UseScrapeReturn {
  isLoading: boolean;
  error: string | null;
  scrape: (url: string, brand: string) => Promise<ScrapeResponse | null>;
}

export function useScrape(): UseScrapeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrape = useCallback(async (url: string, brand: string): Promise<ScrapeResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await scrapeProductUrl(url, brand);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scrape reviews';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, scrape };
}
