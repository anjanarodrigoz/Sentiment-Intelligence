export interface SentimentSummary {
  positive: number;
  negative: number;
  mixed: number;
  total: number;
}

export interface AttributeCount {
  attribute: string;
  count: number;
  positiveCount: number;
  negativeCount: number;
}

export interface RatingDistribution {
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
}

export interface SellingPoint {
  theme: string;
  description: string;
  percentage: number;
  sentiment: 'positive' | 'negative';
}
