import type { ProductAnalysis } from '../types/product';
import { buildContextSummary } from './chatContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  analyses: ProductAnalysis[],
  apiKey: string
): Promise<string> {
  const contextSummary = buildContextSummary(analyses);

  const systemPrompt = `You are an AI assistant for a Consumer Sentiment Intelligence Platform. You help users understand consumer review data and insights.

Here is the analyzed data you should base your answers on:

${contextSummary}

Answer questions concisely based on this data. If asked about something not covered in the data, say so. Provide specific numbers and percentages when relevant. Keep responses brief and actionable.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
