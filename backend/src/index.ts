import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { scrapeRoute } from './routes/scrape.js';
import { llmRoute } from './routes/llm.js';
import { closeBrowser } from './utils/browser.js';
import { connectDB, closeDB } from './config/database.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve brand logos as static files
app.use('/brands', express.static(path.join(__dirname, '../public/brands')));

// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', scrapeRoute);
app.use('/api/llm', llmRoute);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Server info and available endpoints
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server status and endpoint listing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.json({
      name: 'Sentiment Intelligence Server',
      status: 'running',
      docs: '/api-docs',
      endpoints: {
        'POST /api/scrape': 'Scrape reviews from a product URL',
        'GET /api/llm/status': 'Check Ollama LLM status',
        'POST /api/llm/analyze': 'Analyze sentiment via local LLM',
        'POST /api/llm/chat': 'Chat with analysis data via local LLM',
        'GET /api/health': 'Health check',
      },
    });
  });
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In production, serve the frontend build and handle SPA routing
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../dist');
  app.use(express.static(clientDistPath));

  // SPA fallback — send index.html for non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/brands') || req.path.startsWith('/api-docs')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scraper server running on http://0.0.0.0:${PORT}`);
  console.log(`Swagger docs at http://0.0.0.0:${PORT}/api-docs`);
});

// Connect to MongoDB in the background
connectDB().catch(err => {
  console.error('Initial MongoDB connection failed:', err);
});

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n${signal} received, shutting down...`);
    await closeBrowser();
    await closeDB();
    server.close();
    process.exit(0);
  });
}
