export interface RawReview {
  text: string;
  rating: number;
  date: string;
}

export interface SentimentResult {
  score: number;
  comparative: number;
  classification: 'positive' | 'negative' | 'mixed';
  positiveWords: string[];
  negativeWords: string[];
}

export type AttributeTag =
  | 'fit'
  | 'material'
  | 'aesthetic'
  | 'price'
  | 'comfort'
  | 'quality'
  | 'functionality'
  | 'workmanship'
  | 'performance'
  | 'durability';

export interface AnalyzedReview extends RawReview {
  id: string;
  sentiment: SentimentResult;
  attributes: AttributeTag[];
  keywords: string[];
}
