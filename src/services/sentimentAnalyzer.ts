import Sentiment from 'sentiment';
import { CUSTOM_SENTIMENT_WORDS, POSITIVE_THRESHOLD, NEGATIVE_THRESHOLD } from '../constants/sentiment';
import type { RawReview, SentimentResult, AnalyzedReview } from '../types/review';
import type { SentimentSummary } from '../types/analysis';
import { extractAttributes } from './attributeExtractor';
import { extractReviewKeywords } from './keywordExtractor';

const analyzer = new Sentiment();

function classifySentiment(comparative: number): 'positive' | 'negative' | 'mixed' {
  if (comparative > POSITIVE_THRESHOLD) return 'positive';
  if (comparative < NEGATIVE_THRESHOLD) return 'negative';
  return 'mixed';
}

export function analyzeReview(text: string): SentimentResult {
  const result = analyzer.analyze(text, { extras: CUSTOM_SENTIMENT_WORDS });
  return {
    score: result.score,
    comparative: result.comparative,
    classification: classifySentiment(result.comparative),
    positiveWords: result.positive,
    negativeWords: result.negative,
  };
}

export function analyzeAllReviews(rawReviews: RawReview[]): AnalyzedReview[] {
  return rawReviews.map((review, index) => {
    const sentiment = analyzeReview(review.text);
    const attributes = extractAttributes(review.text);
    const keywords = extractReviewKeywords(review.text);

    return {
      ...review,
      id: `review-${index}-${Date.now()}`,
      sentiment,
      attributes,
      keywords,
    };
  });
}

export function computeSentimentSummary(reviews: AnalyzedReview[]): SentimentSummary {
  let positive = 0;
  let negative = 0;
  let mixed = 0;

  for (const review of reviews) {
    switch (review.sentiment.classification) {
      case 'positive':
        positive++;
        break;
      case 'negative':
        negative++;
        break;
      case 'mixed':
        mixed++;
        break;
    }
  }

  return { positive, negative, mixed, total: reviews.length };
}
