#!/bin/sh
set -e

echo "=== Sentiment Intelligence Starting ==="

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

# Seed any initial data before launching the HTTP server.  The backend
# includes a migration script that upserts a fixed list of brands; this is
# called here so a fresh database will be populated automatically when the
# container comes up.  If you prefer to import a custom JSON dump you can
# add a `mongoimport` command instead (see README), but the Node script works
# with the production image without installing additional packages.

echo "Migrating brand data..."
# run the compiled script produced by `tsc`; if the build step changed the
# output directory structure then you may need to adjust this path accordingly.
node backend/dist/scripts/migrate.js || \
  echo "warning: brand migration script failed, continuing anyway"

echo "Starting Sentiment Intelligence server on port ${PORT:-3001}..."
exec node backend/dist/index.js
