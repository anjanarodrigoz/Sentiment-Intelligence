import type { ProductAnalysis } from '../types/product';

function buildContextSummary(analyses: ProductAnalysis[]): string {
  return analyses
    .map((a) => {
      const sentimentPct = {
        positive: ((a.sentimentSummary.positive / a.sentimentSummary.total) * 100).toFixed(1),
        negative: ((a.sentimentSummary.negative / a.sentimentSummary.total) * 100).toFixed(1),
        mixed: ((a.sentimentSummary.mixed / a.sentimentSummary.total) * 100).toFixed(1),
      };

      const topAttrs = a.attributeCounts
        .slice(0, 5)
        .map((attr) => `${attr.attribute}: ${attr.count} mentions (${attr.positiveCount} positive, ${attr.negativeCount} negative)`)
        .join('; ');

      const topKeywords = a.topKeywords
        .slice(0, 15)
        .map((k) => `${k.text}(${k.value})`)
        .join(', ');

      const sellingPoints = a.topSellingPoints
        .map((sp) => `[${sp.sentiment}] ${sp.theme}: ${sp.description} (${sp.percentage}%)`)
        .join('\n  ');

      return `Product: ${a.title}
  Rating: ${a.overallRating}/5 (${a.overallReviewCount} total reviews, ${a.reviews.length} analyzed)
  Sentiment: ${sentimentPct.positive}% positive, ${sentimentPct.negative}% negative, ${sentimentPct.mixed}% mixed
  Top Attributes: ${topAttrs}
  Key Themes:\n  ${sellingPoints}
  Top Keywords: ${topKeywords}`;
    })
    .join('\n\n');
}

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
