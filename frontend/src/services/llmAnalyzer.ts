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
export async function analyzeReviewsWithLLMStream(
  reviews: RawReview[],
  model: string,
  provider: string,
  apiKey: string | undefined,
  onProgress: (batchResults: AnalyzedReview[], index: number, total: number) => void
): Promise<AnalyzedReview[]> {
  const response = await fetch('/api/llm/analyze-stream', {
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

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const allAnalyzed: AnalyzedReview[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.replace('data: ', '').trim();
        if (dataStr === '[DONE]') break;

        try {
          const data = JSON.parse(dataStr);
          if (data.error) throw new Error(data.error);

          const { results, index, total } = data as { results: SentimentResult[]; index: number; total: number };
          
          // Map backend sentiment results to frontend AnalyzedReview format
          const batchAnalyzed = results.map((sentiment, i) => {
            const reviewIndex = index - results.length + i;
            const originalReview = reviews[reviewIndex];
            
            const attributes = extractAttributes(originalReview.text);
            const keywords = extractReviewKeywords(originalReview.text);

            return {
              ...originalReview,
              id: `review-${reviewIndex}-${Date.now()}`,
              sentiment,
              attributes,
              keywords,
            };
          });

          allAnalyzed.push(...batchAnalyzed);
          onProgress(batchAnalyzed, index, total);
        } catch (e) {
          console.error('Failed to parse analysis stream chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return allAnalyzed;
}
