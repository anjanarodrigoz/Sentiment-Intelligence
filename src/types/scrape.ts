import type { RawReview } from './review';

export interface ScrapeRequest {
  url: string;
}

export interface ScrapedProduct {
  title: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
}

export interface ScrapeResponse {
  product: ScrapedProduct;
  reviews: RawReview[];
  source: string;
  cached?: boolean;
  version?: number;
  scrapedAt?: Date;
}

export interface ScrapeError {
  error: string;
}
