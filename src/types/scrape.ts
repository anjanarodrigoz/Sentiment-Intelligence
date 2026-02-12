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
  newReviews?: number;
  duplicates?: number;
  isNewVersion?: boolean;
  urlHash?: string;
}

export interface ScrapeError {
  error: string;
}

export interface VersionInfo {
  version: number;
  scrapedAt: string;
  newReviewCount: number;
  cumulativeReviewCount: number;
  reviewCount: number;
  product?: {
    rating: number;
    reviewCount: number;
  };
}

export interface ProductVersionsResponse {
  product: {
    title: string;
    imageUrl: string;
    urlHash: string;
  };
  versions: VersionInfo[];
}

export interface VersionedReviewsResponse {
  reviews: (RawReview & { version: number })[];
  totalReviews: number;
  version: number;
  product: ScrapedProduct;
}
