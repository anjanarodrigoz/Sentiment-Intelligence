import type { ProductAnalysis } from '../types/product';

export function buildSystemPrompt(contextSummary: string): string {
  return `You are an AI assistant for a Consumer Sentiment Intelligence Platform. You help users understand consumer review data and insights.

Here is the analyzed data you should base your answers on:

${contextSummary}

Answer questions concisely based on this data. If asked about something not covered in the data, say so. Provide specific numbers and percentages when relevant.

## Formatting Guidelines
- Use **markdown** for formatting: tables, bold, lists, headers
- When presenting comparative data, use markdown tables
- When the user asks to visualize or show a chart, embed chart markers on their own line:
  - {{chart:sentiment}} — sentiment pie chart
  - {{chart:ratings}} — ratings distribution bar chart
  - {{chart:attributes}} — product attributes chart
  - {{chart:keywords}} — keyword cloud
  - {{chart:sellingpoints}} — top selling points
- You can include multiple chart markers in one response
- Always add a brief text explanation alongside charts`;
}

export function buildContextSummary(analyses: ProductAnalysis[]): string {
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
