# Sentiment Intelligence

A full-stack application for scraping product reviews from major e-commerce platforms and analyzing sentiment using local LLMs.

## Features

- Scrape reviews from Nike, Adidas, Lululemon, Amazon, eBay, AliExpress, Alibaba, and more
- Version-tracked scraping with deduplication
- Sentiment analysis via Ollama (local LLM)
- Interactive charts and dashboards
- Excel file upload for bulk review analysis
- AI chat for exploring review insights
- Swagger API documentation

## Tech Stack

| Layer    | Tech                                          |
| -------- | --------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4     |
| Backend  | Express 5, TypeScript, Puppeteer              |
| Database | MongoDB                                       |
| LLM      | Ollama (llama3.2)                              |
| State    | Zustand                                       |

## Quick Start (Docker)

Only need [Docker Desktop](https://www.docker.com/products/docker-desktop) installed:

```bash
docker compose up
```

Open http://localhost:3001 — everything (frontend, backend, database, LLM) starts automatically.

## Local Development Setup

### Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or Atlas)
- **Ollama** (optional, for sentiment analysis and chat)

#### Install MongoDB (macOS)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Install Ollama (optional)

```bash
brew install ollama
ollama serve
ollama pull llama3.2
```

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd sentiment-intelligence
pnpm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if you need to change MongoDB URI or other settings. Defaults work for local MongoDB.

### 3. Run database migration

Seeds brand data (Nike, Adidas, Amazon, etc.) into MongoDB:

```bash
pnpm --filter sentiment-intelligence-backend migrate
```

### 4. Start development

```bash
pnpm dev
```

This starts both frontend and backend concurrently:

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:3001        |
| API Docs | http://localhost:3001/api-docs |

## Scripts

### Root (pnpm workspaces + Turborepo)

| Script                 | Description                           |
| ---------------------- | ------------------------------------- |
| `pnpm dev`             | Start frontend + backend together     |
| `pnpm dev:client`      | Start frontend only                   |
| `pnpm dev:server`      | Start backend only                    |
| `pnpm build`           | Production build (frontend + backend) |
| `pnpm lint`            | Lint all workspaces                   |

### Frontend (`pnpm --filter sentiment-intelligence-frontend <script>`)

| Script    | Description              |
| --------- | ------------------------ |
| `dev`     | Start Vite dev server    |
| `build`   | Build for production     |
| `lint`    | Run ESLint               |

### Backend (`pnpm --filter sentiment-intelligence-backend <script>`)

| Script             | Description                      |
| ------------------ | -------------------------------- |
| `dev`              | Start server with hot reload     |
| `build`            | Compile TypeScript to dist/      |
| `start`            | Run compiled server              |
| `migrate`          | Seed brand data into MongoDB     |
| `migrate:reviews`  | Migrate review data              |

## Project Structure

```
sentiment-intelligence/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API client services
│   │   ├── store/          # Zustand state
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   ├── vite.config.ts
│   └── package.json
├── backend/                # Express API server
│   ├── src/
│   │   ├── config/         # Database & Swagger config
│   │   ├── models/         # MongoDB data models
│   │   ├── routes/         # API route handlers
│   │   ├── scrapers/       # Brand-specific scrapers
│   │   ├── services/       # Business logic
│   │   ├── scripts/        # Migration scripts
│   │   └── utils/          # Helpers (browser, rate limiting)
│   ├── public/brands/      # Brand logo images
│   └── package.json
├── docker-compose.yml      # Docker: build from source
├── docker-compose.prod.yml # Docker: pull from Docker Hub
├── Dockerfile
├── pnpm-workspace.yaml     # pnpm workspaces config
├── turbo.json              # Turborepo task pipeline
└── package.json            # Root orchestration scripts
```

## API Endpoints

Full interactive documentation available at `/api-docs` when the server is running.

| Method | Endpoint                             | Description                    |
| ------ | ------------------------------------ | ------------------------------ |
| GET    | `/api/brands`                        | List supported brands          |
| GET    | `/api/products`                      | List scraped products          |
| GET    | `/api/products/:hash/versions`       | Product version history        |
| GET    | `/api/products/:hash/reviews`        | Get product reviews            |
| DELETE | `/api/products/:hash`                | Delete product and all data    |
| POST   | `/api/scrape`                        | Scrape reviews (standard)      |
| POST   | `/api/scrape/stream`                 | Scrape reviews (SSE streaming) |
| GET    | `/api/llm/status`                    | Check Ollama status            |
| POST   | `/api/llm/analyze`                   | Batch sentiment analysis       |
| POST   | `/api/llm/chat`                      | Chat with LLM (SSE streaming)  |

## Environment Variables

Configured in `backend/.env`:

| Variable         | Default                        | Description                |
| ---------------- | ------------------------------ | -------------------------- |
| `MONGODB_URI`    | `mongodb://localhost:27017`    | MongoDB connection string  |
| `MONGODB_DB_NAME`| `sentiment_intelligence`       | Database name              |
| `PORT`           | `3001`                         | Server port                |
| `OLLAMA_API_URL` | `http://localhost:11434`       | Ollama API URL             |
| `OLLAMA_MODEL`   | `llama3.2`                     | Default LLM model          |
