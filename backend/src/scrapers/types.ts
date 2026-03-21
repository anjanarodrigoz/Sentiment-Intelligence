export interface ScrapedReview {
  text: string;
  rating: number;
  date: string;
}

export interface ScrapedProduct {
  title: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
}

export interface ScrapeResult {
  product: ScrapedProduct;
  reviews: ScrapedReview[];
  source: string;
}

export interface BatchCallback {
  (batch: {
    batchNumber: number;
    reviews: ScrapedReview[];
    totalFetched: number;
    estimatedTotal?: number;
  }): void;
}

export interface ReviewScraper {
  name: string;
  canHandle(url: string): boolean;
  scrape(url: string, onBatch?: BatchCallback): Promise<ScrapeResult>;
}
