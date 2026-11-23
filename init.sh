#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking Node.js & pnpm..."
node -v
pnpm -v

if [ ! -f ".env.local" ]; then
  echo "WARNING: .env.local not found. Copy .env.example to .env.local and fill Supabase credentials."
fi

if [ -f "package.json" ]; then
  echo "==> Installing dependencies..."
  pnpm install --frozen-lockfile || pnpm install
  echo "==> Running typecheck & lint..."
  pnpm typecheck
  pnpm lint
  echo "==> Baseline checks passed. Start dev server with: pnpm dev"
else
  echo "==> Ready for Step 1 Next.js initialization."
fi
