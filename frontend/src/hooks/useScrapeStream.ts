import { useState, useCallback, useRef, useEffect } from 'react';
import type { RawReview } from '../types/review';
import type { ScrapedProduct } from '../types/scrape';

interface ProgressState {
  current: number;
  estimated: number | null;
  percentage: number;
}

interface UseScrapeStreamReturn {
  isStreaming: boolean;
  progress: ProgressState;
  allReviews: RawReview[];
  product: ScrapedProduct | null;
  error: string | null;
  isComplete: boolean;
  isCached: boolean;
  source: string | null;
  scrapedAt: Date | null;
  version: number | null;
  newReviewCount: number | null;
  duplicateCount: number | null;
  isNewVersion: boolean;
  urlHash: string | null;
  dedupMessage: string | null;
  startStream: (url: string, brand: string, forceRescrape?: boolean) => void;
  cancelStream: () => void;
}

export function useScrapeStream(): UseScrapeStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    estimated: null,
    percentage: 0,
  });
  const [allReviews, setAllReviews] = useState<RawReview[]>([]);
  const [product, setProduct] = useState<ScrapedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [scrapedAt, setScrapedAt] = useState<Date | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [newReviewCount, setNewReviewCount] = useState<number | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null);
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [urlHash, setUrlHash] = useState<string | null>(null);
  const [dedupMessage, setDedupMessage] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback((url: string, brand: string, forceRescrape = false) => {
    // Reset state
    setIsStreaming(true);
    setProgress({ current: 0, estimated: null, percentage: 0 });
    setAllReviews([]);
    setProduct(null);
    setError(null);
    setIsComplete(false);
    setIsCached(false);
    setSource(null);
    setScrapedAt(null);
    setVersion(null);
    setNewReviewCount(null);
    setDuplicateCount(null);
    setIsNewVersion(false);
    setUrlHash(null);
    setDedupMessage(null);

    // Cancel any existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create SSE connection
    const params = new URLSearchParams({
      url,
      brand,
      forceRescrape: String(forceRescrape),
    });

    // Use POST data for SSE - we'll use a regular POST request to initiate
    // Since EventSource doesn't support POST, we'll need to use query params
    // or implement a different approach

    // For now, let's use a fetch-based streaming approach
    const controller = new AbortController();

    fetch('/api/scrape/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, brand, forceRescrape }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          let currentEvent = '';
          let currentData = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              currentData = line.slice(5).trim();
            } else if (line === '' && currentEvent && currentData) {
              // Complete message received
              try {
                const data = JSON.parse(currentData);
                handleEvent(currentEvent, data);
              } catch (err) {
                console.error('Failed to parse SSE data:', err);
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to stream reviews');
          setIsStreaming(false);
        }
      });

    // Store abort controller for cancellation
    eventSourceRef.current = { close: () => controller.abort() } as EventSource;
  }, []);

  const handleEvent = (event: string, data: unknown) => {
    switch (event) {
      case 'cache-hit': {
        const cacheData = data as {
          product: ScrapedProduct;
          reviews: RawReview[];
          source: string;
          cached: boolean;
          version: number;
          scrapedAt: string;
          urlHash: string;
        };
        setProduct(cacheData.product);
        setAllReviews(cacheData.reviews);
        setSource(cacheData.source);
        setIsCached(true);
        setScrapedAt(new Date(cacheData.scrapedAt));
        setVersion(cacheData.version);
        setUrlHash(cacheData.urlHash);
        setProgress({
          current: cacheData.reviews.length,
          estimated: cacheData.reviews.length,
          percentage: 100,
        });
        setIsComplete(true);
        setIsStreaming(false);
        break;
      }

      case 'batch': {
        const batchData = data as {
          batchNumber: number;
          reviews: RawReview[];
        };
        setAllReviews((prev) => [...prev, ...batchData.reviews]);
        break;
      }

      case 'progress': {
        const progressData = data as {
          current: number;
          estimated: number | null;
          percentage: number;
        };
        setProgress(progressData);
        break;
      }

      case 'dedup-progress': {
        const dedupData = data as {
          message: string;
          totalScraped: number;
        };
        setDedupMessage(dedupData.message);
        break;
      }

      case 'complete': {
        const completeData = data as {
          product: ScrapedProduct;
          total: number;
          source: string;
          scrapedAt: string;
          version: number;
          newReviews: number;
          duplicates: number;
          isNewVersion: boolean;
          urlHash: string;
        };
        setProduct(completeData.product);
        setSource(completeData.source);
        setScrapedAt(new Date(completeData.scrapedAt));
        setVersion(completeData.version);
        setNewReviewCount(completeData.newReviews);
        setDuplicateCount(completeData.duplicates);
        setIsNewVersion(completeData.isNewVersion);
        setUrlHash(completeData.urlHash);
        setDedupMessage(null);
        setProgress((prev) => ({
          ...prev,
          current: completeData.total,
          percentage: 100,
        }));
        setIsComplete(true);
        setIsStreaming(false);
        break;
      }

      case 'error': {
        const errorData = data as { error: string };
        setError(errorData.error);
        setIsStreaming(false);
        setIsComplete(false);
        break;
      }

      default:
        console.log('Unknown SSE event:', event, data);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isStreaming,
    progress,
    allReviews,
    product,
    error,
    isComplete,
    isCached,
    source,
    scrapedAt,
    version,
    newReviewCount,
    duplicateCount,
    isNewVersion,
    urlHash,
    dedupMessage,
    startStream,
    cancelStream,
  };
}
