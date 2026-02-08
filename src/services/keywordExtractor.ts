import type { AnalyzedReview } from '../types/review';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'she', 'they', 'them', 'their', 'his', 'her',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very',
  'just', 'about', 'also', 'only', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'into', 'over',
  'after', 'before', 'between', 'out', 'up', 'down', 'off', 'through',
  'during', 'under', 'again', 'further', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom',
  'as', 'while', 'because', 'until', 'although', 'since', 'unless',
  'am', 'own', 'same', 'got', 'get', 'really', 'one', 'two',
  'much', 'many', 'like', 'even', 'still', 'back', 'well',
]);

export function extractReviewKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function extractKeywords(
  reviews: AnalyzedReview[],
  topN = 80
): { text: string; value: number }[] {
  const frequency: Record<string, number> = {};

  for (const review of reviews) {
    const seen = new Set<string>();
    for (const word of review.keywords) {
      if (!seen.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
        seen.add(word);
      }
    }
  }

  return Object.entries(frequency)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([text, value]) => ({ text, value }));
}
