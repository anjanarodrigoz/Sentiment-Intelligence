import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';

export interface SentimentResult {
  score: number;
  comparative: number;
  classification: 'positive' | 'negative' | 'mixed';
  positiveWords: string[];
  negativeWords: string[];
}

export interface ReviewInput {
  text: string;
  rating: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const BATCH_SIZE = 50;
const CONCURRENCY_LIMIT = 3;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      const isRateLimit = 
        error?.status === 429 || 
        error?.message?.toLowerCase().includes('429') || 
        error?.message?.toLowerCase().includes('quota') || 
        error?.message?.toLowerCase().includes('too many requests') ||
        error?.status >= 500;

      if (isRateLimit) {
        // Wait 10s, 20s, 40s to clear minute-based quotas
        const delay = Math.pow(2, i) * 10000 + Math.random() * 2000;
        console.warn(`[Cloud LLM] Rate limited or server error. Retrying in ${Math.round(delay/1000)}s... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

async function processConcurrently<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  
  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

function buildSentimentPrompt(reviews: ReviewInput[]): string {
  const reviewList = reviews
    .map((r, i) => `Review ${i + 1} (rating: ${r.rating}/5):\n"${r.text.replace(/"/g, '\\"')}"`)
    .join('\n\n');

  return `You are a sentiment analysis expert. Analyze each of the ${reviews.length} reviews below. Return a strictly valid JSON object with a single root key "reviews" which contains an array of exactly ${reviews.length} objects, one per review in the exact same order. Do NOT wrap the JSON in markdown formatting.

Format:
{
  "reviews": [
    {
      "classification": "positive" | "negative" | "mixed",
      "score": <number from -1 to 1>,
      "positiveWords": [<strings>],
      "negativeWords": [<strings>]
    }
  ]
}

Rules:
- Consider negation and intensifiers.
- A review with mixed sentiments should be classified as "mixed".

${reviewList}`;
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
  const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    const direct = JSON.parse(cleaned);
    if (direct && Array.isArray(direct.reviews)) return direct.reviews;
    if (Array.isArray(direct)) return direct;
  } catch {}

  const start = cleaned.indexOf('[');
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '[') depth++;
      else if (cleaned[i] === ']') depth--;
      if (depth === 0) {
        try {
          const candidate = cleaned.slice(start, i + 1);
          return JSON.parse(candidate);
        } catch {}
        break;
      }
    }
  }

  throw new Error(`No complete JSON array found in response: ${cleaned}`);
}

function parseSentimentResponse(response: string, count: number): SentimentResult[] {
  const parsed = extractArray(response);
  const results: SentimentResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(parsed[i] ? parseSentimentItem(parsed[i]) : { ...DEFAULT_SENTIMENT });
  }
  return results;
}

export async function analyzeSentimentBatchCloud(
  reviews: ReviewInput[],
  provider: string,
  apiKey: string
): Promise<SentimentResult[]> {
  const batches: ReviewInput[][] = [];
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    batches.push(reviews.slice(i, i + BATCH_SIZE));
  }

  const processBatch = async (batch: ReviewInput[]) => {
    return withRetry(async () => {
      const prompt = buildSentimentPrompt(batch);
      let rawResponse = '';

      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey });
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' }
        });
        rawResponse = resp.choices[0]?.message?.content || '';
      } else if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const resp = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { 
            temperature: 0,
            responseMimeType: 'application/json'
          },
        });
        rawResponse = resp.text || '';
      } else if (provider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey });
        const resp = await anthropic.messages.create({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 4000,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        });
        if (resp.content[0]?.type === 'text') {
          rawResponse = resp.content[0].text;
        }
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      return parseSentimentResponse(rawResponse, batch.length);
    });
  };

  const batchResultsArray = await processConcurrently(batches, CONCURRENCY_LIMIT, processBatch);
  
  const finalResults: SentimentResult[] = [];
  for (const res of batchResultsArray) {
    if (res) finalResults.push(...res);
  }

  return finalResults;
}

export async function* chatStreamCloud(
  messages: ChatMessage[],
  systemPrompt: string,
  provider: string,
  apiKey: string
): AsyncGenerator<string> {
  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey });
    const formattedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      stream: true,
    });
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  } else if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}` }] }],
    });
    for await (const chunk of stream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } else if (provider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey });
    const formattedMessages = messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role as 'user' | 'assistant',
      content: m.content,
    }));
    const stream = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 4000,
      system: systemPrompt,
      messages: formattedMessages,
      stream: true,
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}
