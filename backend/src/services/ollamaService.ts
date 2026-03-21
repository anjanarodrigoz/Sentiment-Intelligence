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

const BATCH_SIZE = 5;

function buildSentimentPrompt(reviews: ReviewInput[]): string {
  const reviewList = reviews
    .map((r, i) => `Review ${i + 1} (rating: ${r.rating}/5):\n"${r.text}"`)
    .join('\n\n');

  return `You are a sentiment analysis expert. Analyze each of the ${reviews.length} reviews below. Return a JSON array with EXACTLY ${reviews.length} objects, one per review in the same order.

Each object must have exactly these fields:
- "classification": one of "positive", "negative", or "mixed"
- "score": a number from -1 to 1 (negative to positive sentiment strength)
- "positiveWords": array of positive words/phrases found in the review
- "negativeWords": array of negative words/phrases found in the review

Rules:
- You MUST return exactly ${reviews.length} objects in the array, one for each review
- Consider negation: "not good" is negative, "not bad" is positive
- Consider intensifiers: "very good" is more positive than "good"
- A review with mixed sentiments should be classified as "mixed"
- Return ONLY the JSON array, no other text

${reviewList}

JSON array with exactly ${reviews.length} objects:`;
}

const DEFAULT_SENTIMENT: SentimentResult = {
  score: 0,
  comparative: 0,
  classification: 'mixed',
  positiveWords: [],
  negativeWords: [],
};

function parseSentimentItem(item: any): SentimentResult {
  return {
    score: typeof item.score === 'number' ? item.score : 0,
    comparative: typeof item.score === 'number' ? item.score : 0,
    classification: ['positive', 'negative', 'mixed'].includes(item.classification)
      ? item.classification
      : 'mixed',
    positiveWords: Array.isArray(item.positiveWords) ? item.positiveWords : [],
    negativeWords: Array.isArray(item.negativeWords) ? item.negativeWords : [],
  };
}

function extractArray(response: string): any[] {
  // 1. Try parsing the whole response as JSON directly
  try {
    const direct = JSON.parse(response);
    if (Array.isArray(direct)) return direct;
    // Ollama format: 'json' may wrap in an object like { "results": [...] }
    if (typeof direct === 'object' && direct !== null) {
      for (const val of Object.values(direct)) {
        if (Array.isArray(val)) return val;
      }
    }
  } catch {
    // Not valid JSON as-is, try regex extraction
  }

  // 2. Extract the first JSON array from the text via bracket matching
  const start = response.indexOf('[');
  if (start === -1) throw new Error('No JSON array found in response');

  let depth = 0;
  for (let i = start; i < response.length; i++) {
    if (response[i] === '[') depth++;
    else if (response[i] === ']') depth--;
    if (depth === 0) {
      const candidate = response.slice(start, i + 1);
      return JSON.parse(candidate);
    }
  }

  throw new Error('No complete JSON array found in response');
}

function parseSentimentResponse(response: string, count: number): SentimentResult[] {
  const parsed = extractArray(response);

  // Map available results and pad with defaults if LLM returned fewer
  const results: SentimentResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(parsed[i] ? parseSentimentItem(parsed[i]) : { ...DEFAULT_SENTIMENT });
  }
  return results;
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
  systemPrompt: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string> {
  const systemMessage: ChatMessage = {
    role: 'system',
    content: systemPrompt,
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
