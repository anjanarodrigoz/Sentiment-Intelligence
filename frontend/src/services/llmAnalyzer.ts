import type { RawReview, SentimentResult, AnalyzedReview } from '../types/review';
import { extractAttributes } from './attributeExtractor';
import { extractReviewKeywords } from './keywordExtractor';

export async function checkLlmStatus(): Promise<{ running: boolean; models: string[] }> {
  try {
    const response = await fetch('/api/llm/status');
    if (!response.ok) return { running: false, models: [] };
    return await response.json();
  } catch {
    return { running: false, models: [] };
  }
}

export async function analyzeReviewsWithLLM(
  reviews: RawReview[],
  model: string,
  provider?: string,
  apiKey?: string
): Promise<AnalyzedReview[]> {
  const response = await fetch('/api/llm/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reviews: reviews.map((r) => ({ text: r.text, rating: r.rating })),
      model,
      provider,
      apiKey
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'LLM analysis failed');
  }

  const data: { results: SentimentResult[] } = await response.json();

  return reviews.map((review, index) => {
    const sentiment = data.results[index] || {
      score: 0,
      comparative: 0,
      classification: 'mixed' as const,
      positiveWords: [],
      negativeWords: [],
    };

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
