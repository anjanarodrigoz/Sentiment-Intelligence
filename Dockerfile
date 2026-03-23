# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-slim AS deps

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json from each workspace
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build frontend and backend
# ============================================
FROM deps AS build

WORKDIR /app

# Copy frontend source and build configs
COPY frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html ./frontend/
COPY frontend/src/ ./frontend/src/
COPY frontend/public/ ./frontend/public/

# Copy backend source
COPY backend/tsconfig.json ./backend/
COPY backend/src/ ./backend/src/

# Build frontend (vite) and backend (tsc)
RUN pnpm --filter sentiment-intelligence-frontend build && pnpm --filter sentiment-intelligence-backend build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-slim AS runtime

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Use system Chromium instead of Puppeteer's bundled one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy workspace config for production install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install backend production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built frontend
COPY --from=build /app/frontend/dist ./dist

# Copy built backend
COPY --from=build /app/backend/dist ./backend/dist

# Copy backend source (needed by swagger-jsdoc for JSDoc comments)
COPY --from=build /app/backend/src ./backend/src

# Copy static assets (brand logos)
COPY backend/public ./backend/public

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Optionally include brand snapshot for manual imports; the container itself uses
# the compiled migration script instead, but having the JSON onboard makes it
# easy to run `mongoimport` from another container or during debugging.
COPY sentiment_intelligence.brands.json ./

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV MONGODB_URI=mongodb://mongo:27017
ENV MONGODB_DB_NAME=sentiment_intelligence
ENV OLLAMA_API_URL=http://ollama:11434
ENV OLLAMA_MODEL=gemma3:27b

EXPOSE 3001

ENTRYPOINT ["/docker-entrypoint.sh"]
