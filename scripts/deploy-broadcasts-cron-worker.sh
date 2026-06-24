#!/usr/bin/env bash
# Deploy Cloudflare Worker that triggers /api/cron/broadcasts every 15 minutes.
# Requires: CLOUDFLARE_API_TOKEN (Workers + Account read) in env or .env.local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/workers/broadcasts-cron"

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Set CLOUDFLARE_API_TOKEN (Cloudflare dashboard → My Profile → API Tokens)"
  echo "Permissions: Account.Workers Scripts Edit, Account.Workers Cron Triggers Edit"
  exit 1
fi

if [ -z "${CRON_SECRET:-}" ]; then
  if [ -f "$ROOT/.env.local" ]; then
    CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ROOT/.env.local" | head -1 | cut -d= -f2- | tr -d '"')"
  fi
fi

if [ -z "${CRON_SECRET:-}" ]; then
  echo "Set CRON_SECRET (same value as Vercel production)"
  exit 1
fi

echo "Deploying worker..."
npx wrangler@3 deploy

echo "Setting CRON_SECRET..."
printf '%s' "$CRON_SECRET" | npx wrangler@3 secret put CRON_SECRET

echo "Done. Cron: */15 * * * * → ${APP_URL:-https://limitlesscoaching.app}/api/cron/broadcasts"
