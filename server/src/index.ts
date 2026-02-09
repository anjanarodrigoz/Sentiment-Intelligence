import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { scrapeRoute } from './routes/scrape.js';
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

app.use('/api', scrapeRoute);

app.get('/', (_req, res) => {
  res.json({
    name: 'MAS Scraper Server',
    status: 'running',
    endpoints: {
      'POST /api/scrape': 'Scrape reviews from a product URL',
      'GET /api/health': 'Health check',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB before starting server
await connectDB();

const server = app.listen(PORT, () => {
  console.log(`Scraper server running on http://localhost:${PORT}`);
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
