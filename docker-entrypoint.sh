#!/bin/sh
set -e

echo "=== Sentiment Intelligence Starting ==="

# Migrating brand data...
# run the compiled script produced by `tsc`; if the build step changed the
# output directory structure then you may need to adjust this path accordingly.
node backend/dist/scripts/migrate.js || \
  echo "warning: brand migration script failed, continuing anyway"

echo "Starting Sentiment Intelligence server on port ${PORT:-3001}..."
exec node backend/dist/index.js
