const OLLAMA_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface SentimentResult {
  score: number;
  comparative: number;
  classification: 'positive' | 'negative' | 'mixed';
  positiveWords: string[];
  negativeWords: string[];
}

interface ReviewInput {
  text: string;
  rating: number;
}

export async function checkStatus(): Promise<{ running: boolean; models: string[] }> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      return { running: false, models: [] };
    }
    const data = await response.json();
    const models = (data.models || []).map((m: OllamaModel) => m.name.split(':')[0]);
    // Deduplicate model names
    const unique = [...new Set<string>(models)];
    return { running: true, models: unique };
  } catch {
    return { running: false, models: [] };
  }
}

const BATCH_SIZE = 10;

function buildSentimentPrompt(reviews: ReviewInput[]): string {
  const reviewList = reviews
    .map((r, i) => `Review ${i + 1} (rating: ${r.rating}/5):\n"${r.text}"`)
    .join('\n\n');

  return `You are a sentiment analysis expert. Analyze each review below and return a JSON array with one object per review.

Each object must have exactly these fields:
- "classification": one of "positive", "negative", or "mixed"
- "score": a number from -1 to 1 (negative to positive sentiment strength)
- "positiveWords": array of positive words/phrases found in the review
- "negativeWords": array of negative words/phrases found in the review

Rules:
- Consider negation: "not good" is negative, "not bad" is positive
- Consider intensifiers: "very good" is more positive than "good"
- A review with mixed sentiments should be classified as "mixed"
- Return ONLY the JSON array, no other text

${reviewList}

JSON output:`;
}

function parseSentimentResponse(response: string, count: number): SentimentResult[] {
  // Extract JSON array from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed) || parsed.length !== count) {
    throw new Error(`Expected ${count} results, got ${Array.isArray(parsed) ? parsed.length : 'non-array'}`);
  }

  return parsed.map((item: any) => ({
    score: typeof item.score === 'number' ? item.score : 0,
    comparative: typeof item.score === 'number' ? item.score : 0,
    classification: ['positive', 'negative', 'mixed'].includes(item.classification)
      ? item.classification
      : 'mixed',
    positiveWords: Array.isArray(item.positiveWords) ? item.positiveWords : [],
    negativeWords: Array.isArray(item.negativeWords) ? item.negativeWords : [],
  }));
}

export async function analyzeSentimentBatch(
  reviews: ReviewInput[],
  model: string = DEFAULT_MODEL
): Promise<SentimentResult[]> {
  const results: SentimentResult[] = [];

  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);
    const prompt = buildSentimentPrompt(batch);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0 },
        format: 'json',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama generate failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const batchResults = parseSentimentResponse(data.response, batch.length);
    results.push(...batchResults);
  }

  return results;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function* chatStream(
  messages: ChatMessage[],
  context: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string> {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an AI assistant for a Consumer Sentiment Intelligence Platform. You help users understand consumer review data and insights.

Here is the analyzed data you should base your answers on:

${context}

Answer questions concisely based on this data. If asked about something not covered in the data, say so. Provide specific numbers and percentages when relevant. Keep responses brief and actionable.`,
  };

  const ollamaMessages = [systemMessage, ...messages].map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama chat failed: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error('No response body from Ollama');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            yield json.message.content;
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
