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
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
app.get('/', (_req, res) => {
  res.json({
    name: 'MAS Scraper Server',
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

// Connect to MongoDB before starting server
await connectDB();

const server = app.listen(PORT, () => {
  console.log(`Scraper server running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
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
