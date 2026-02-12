import type { AnalyzedReview, RawReview } from './review';
import type {
  SentimentSummary,
  AttributeCount,
  RatingDistribution,
  SellingPoint,
} from './analysis';

export interface ProductInput {
  id: string;
  title: string;
  overallRating: number;
  overallReviewCount: number;
  imageUrl: string;
  imageFile: File | null;
  reviewFile: File | null;
  reviewFileName: string;
  reviewCount: number;
  inputMode: 'file' | 'url';
  brand: string;
  productUrl: string;
  scrapedReviews: RawReview[] | null;
  urlHash?: string;
  selectedVersion?: number;
  scrapeMetadata?: {
    cached: boolean;
    version: number;
    scrapedAt: Date;
    newReviewCount?: number;
    urlHash?: string;
  };
}

export interface ProductAnalysis {
  productId: string;
  title: string;
  imageUrl: string;
  overallRating: number;
  overallReviewCount: number;
  reviews: AnalyzedReview[];
  sentimentSummary: SentimentSummary;
  attributeCounts: AttributeCount[];
  ratingDistribution: RatingDistribution;
  topSellingPoints: SellingPoint[];
  topKeywords: { text: string; value: number }[];
}
