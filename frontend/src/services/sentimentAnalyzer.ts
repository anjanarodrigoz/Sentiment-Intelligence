import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { CUSTOM_SENTIMENT_WORDS, POSITIVE_THRESHOLD, NEGATIVE_THRESHOLD } from '../constants/sentiment';
import type { RawReview, SentimentResult, AnalyzedReview } from '../types/review';
import type { SentimentSummary } from '../types/analysis';
import { extractAttributes } from './attributeExtractor';
import { extractReviewKeywords } from './keywordExtractor';

// Pre-compute multi-word phrases and single-word keys from custom dictionary
const multiWordPhrases = Object.keys(CUSTOM_SENTIMENT_WORDS).filter(k => k.includes(' '));
const singleWords = new Set(Object.keys(CUSTOM_SENTIMENT_WORDS).filter(k => !k.includes(' ')));

function classifySentiment(compound: number): 'positive' | 'negative' | 'mixed' {
  if (compound > POSITIVE_THRESHOLD) return 'positive';
  if (compound < NEGATIVE_THRESHOLD) return 'negative';
  return 'mixed';
}

function scanCustomWords(text: string): { positiveWords: string[]; negativeWords: string[] } {
  const lower = text.toLowerCase();
  const positiveWords: string[] = [];
  const negativeWords: string[] = [];

  // Check multi-word phrases first
  for (const phrase of multiWordPhrases) {
    if (lower.includes(phrase)) {
      const weight = CUSTOM_SENTIMENT_WORDS[phrase];
      if (weight > 0) positiveWords.push(phrase);
      else if (weight < 0) negativeWords.push(phrase);
    }
  }

  // Check single words via tokenization
  const tokens = lower.match(/\b[a-z]+\b/g) || [];
  for (const token of tokens) {
    if (singleWords.has(token)) {
      const weight = CUSTOM_SENTIMENT_WORDS[token];
      if (weight > 0) positiveWords.push(token);
      else if (weight < 0) negativeWords.push(token);
    }
  }

  return { positiveWords, negativeWords };
}

export function analyzeReview(text: string): SentimentResult {
  const scores = SentimentIntensityAnalyzer.polarity_scores(text);
  const { positiveWords, negativeWords } = scanCustomWords(text);

  const wordCount = text.split(/\s+/).length;

  return {
    score: scores.compound * wordCount,
    comparative: scores.compound,
    classification: classifySentiment(scores.compound),
    positiveWords,
    negativeWords,
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
