import { Router } from 'express';
import { checkStatus, analyzeSentimentBatch, chatStream } from '../services/ollamaService.js';
import type { ChatMessage } from '../services/ollamaService.js';

export const llmRoute = Router();

// Check Ollama status and available models
llmRoute.get('/status', async (_req, res) => {
  try {
    const status = await checkStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ running: false, models: [], error: String(error) });
  }
});

// Analyze reviews with LLM sentiment
llmRoute.post('/analyze', async (req, res) => {
  const { reviews, model } = req.body;

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    res.status(400).json({ error: 'reviews array is required' });
    return;
  }

  const start = Date.now();

  try {
    const results = await analyzeSentimentBatch(reviews, model);
    const duration = Date.now() - start;

    res.json({
      results,
      model: model || process.env.OLLAMA_MODEL || 'llama3.2',
      duration,
      count: results.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LLM analysis failed';
    res.status(500).json({ error: message });
  }
});

// Chat with LLM using streaming
llmRoute.post('/chat', async (req, res) => {
  const { messages, context, systemPrompt, model } = req.body as {
    messages: ChatMessage[];
    context?: string;
    systemPrompt?: string;
    model?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = chatStream(messages, systemPrompt || context || '', model);

    for await (const token of stream) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});
