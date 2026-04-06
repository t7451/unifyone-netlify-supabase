#!/bin/sh
set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  UnifyOne — Docker Container Starting                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  NODE_ENV:  ${NODE_ENV:-production}"
echo "  PORT:      ${PORT:-3000}"
echo "  NODE:      $(node --version)"
echo ""

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running database migrations..."
  npx drizzle-kit migrate 2>&1 || echo "[entrypoint] Migration skipped or failed (non-fatal)"
  echo "[entrypoint] Migrations complete."
fi

echo "[entrypoint] Starting server..."
exec node dist/index.js
