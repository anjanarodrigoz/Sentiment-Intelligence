import { Router } from 'express';
import { checkStatus, analyzeSentimentBatch, chatStream, analyzeSentimentStream } from '../services/ollamaService.js';
import { analyzeSentimentBatchCloud, chatStreamCloud, analyzeSentimentStreamCloud } from '../services/cloudLlmService.js';
import type { ChatMessage } from '../services/ollamaService.js';

export const llmRoute = Router();

/**
 * @swagger
 * /api/llm/status:
 *   get:
 *     summary: Check Ollama LLM status
 *     tags: [LLM]
 *     responses:
 *       200:
 *         description: Ollama status and available models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 running:
 *                   type: boolean
 *                 models:
 *                   type: array
 *                   items:
 *                     type: string
 *                 error:
 *                   type: string
 *       500:
 *         description: Ollama not reachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 running:
 *                   type: boolean
 *                   example: false
 *                 models:
 *                   type: array
 *                   items:
 *                     type: string
 *                 error:
 *                   type: string
 */
llmRoute.get('/status', async (_req, res) => {
  try {
    const status = await checkStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ running: false, models: [], error: String(error) });
  }
});

/**
 * @swagger
 * /api/llm/analyze:
 *   post:
 *     summary: Analyze review sentiment with LLM
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *     responses:
 *       200:
 *         description: Sentiment analysis results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       score:
 *                         type: number
 *                         description: Sentiment score from -1 to 1
 *                       comparative:
 *                         type: number
 *                       classification:
 *                         type: string
 *                         enum: [positive, negative, mixed]
 *                       positiveWords:
 *                         type: array
 *                         items:
 *                           type: string
 *                       negativeWords:
 *                         type: array
 *                         items:
 *                           type: string
 *                 model:
 *                   type: string
 *                 duration:
 *                   type: integer
 *                   description: Processing time in ms
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: LLM error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
llmRoute.post('/analyze', async (req, res) => {
  const { reviews, model, provider, apiKey } = req.body;

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    res.status(400).json({ error: 'reviews array is required' });
    return;
  }

  const start = Date.now();

  try {
    let results;
    if (provider && provider !== 'ollama') {
      if (!apiKey) throw new Error('API key is required for cloud providers');
      results = await analyzeSentimentBatchCloud(reviews, provider, apiKey);
    } else {
      results = await analyzeSentimentBatch(reviews, model);
    }
    
    const duration = Date.now() - start;

    res.json({
      results,
      model: provider && provider !== 'ollama' ? provider : (model || process.env.OLLAMA_MODEL || 'llama3.2'),
      duration,
      count: results.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LLM analysis failed';
    res.status(500).json({ error: message });
  }
});

/**
 * @swagger
 * /api/llm/analyze-stream:
 *   post:
 *     summary: Analyze review sentiment with LLM (SSE streaming)
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *     responses:
 *       200:
 *         description: SSE result stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: "SSE stream of {results: SentimentResult[], index: number, total: number} objects, ending with [DONE]"
 */
llmRoute.post('/analyze-stream', async (req, res) => {
  const { reviews, model, provider, apiKey } = req.body;

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    res.status(400).json({ error: 'reviews array is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let stream;
    if (provider && provider !== 'ollama') {
      if (!apiKey) throw new Error('API key is required for cloud providers');
      stream = analyzeSentimentStreamCloud(reviews, provider, apiKey);
    } else {
      stream = analyzeSentimentStream(reviews, model);
    }

    for await (const data of stream) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

/**
 * @swagger
 * /api/llm/chat:
 *   post:
 *     summary: Chat with LLM (SSE streaming)
 *     description: |
 *       Sends messages to the LLM and streams the response via Server-Sent Events.
 *       Each event contains a `token` field. The stream ends with a `[DONE]` message.
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: SSE token stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: "SSE stream of {token: string} objects, ending with [DONE]"
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
llmRoute.post('/chat', async (req, res) => {
  const { messages, context, systemPrompt, model, provider, apiKey } = req.body as {
    messages: ChatMessage[];
    context?: string;
    systemPrompt?: string;
    model?: string;
    provider?: string;
    apiKey?: string;
  };

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let stream;
    if (provider && provider !== 'ollama') {
      if (!apiKey) throw new Error('API key is required for cloud providers');
      stream = chatStreamCloud(messages, systemPrompt || context || '', provider, apiKey);
    } else {
      stream = chatStream(messages, systemPrompt || context || '', model);
    }

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
