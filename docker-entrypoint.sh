#!/bin/sh
set -e

echo "=== MAS Application Starting ==="

# Extract host and port from MONGODB_URI for TCP check
MONGO_HOST=$(echo "$MONGODB_URI" | sed -E 's|mongodb://([^:/]+).*|\1|')
MONGO_PORT=$(echo "$MONGODB_URI" | sed -E 's|mongodb://[^:]+:([0-9]+).*|\1|')
MONGO_PORT=${MONGO_PORT:-27017}

echo "Waiting for MongoDB at ${MONGO_HOST}:${MONGO_PORT}..."
until node -e "
  const net = require('net');
  const s = new net.Socket();
  s.setTimeout(2000);
  s.connect(${MONGO_PORT}, '${MONGO_HOST}', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
  s.on('timeout', () => { s.destroy(); process.exit(1); });
" 2>/dev/null; do
  echo "  MongoDB not ready, retrying in 2s..."
  sleep 2
done
echo "MongoDB is ready."

# Run migration (seeds brand data)
echo "Running database migration..."
cd /app/backend
node dist/scripts/migrate.js
echo "Migration complete."

# Start the server
echo "Starting MAS server on port ${PORT:-3001}..."
exec node dist/index.js
