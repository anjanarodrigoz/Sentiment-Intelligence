import type { AnalyzedReview } from './review';
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
