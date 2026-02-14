import type { ProductAnalysis } from '../types/product';
import type { ChatMessage } from './aiChat';
import { buildContextSummary } from './chatContext';

export async function sendLlmChatMessage(
  messages: ChatMessage[],
  analyses: ProductAnalysis[],
  model: string,
  onToken: (token: string) => void
): Promise<string> {
  const context = buildContextSummary(analyses);

  const response = await fetch('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      context,
      model,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM chat failed: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);

        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.token) {
            fullResponse += parsed.token;
            onToken(parsed.token);
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullResponse;
}
