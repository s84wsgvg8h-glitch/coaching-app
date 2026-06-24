#!/usr/bin/env bash
# Push GitHub Actions workflow (requires workflow OAuth scope) and verify cron.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH="${GH:-gh}"
if ! command -v "$GH" >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

mkdir -p .github/workflows
cp scripts/cron-broadcasts-workflow.yml .github/workflows/cron-broadcasts.yml

echo "→ GitHub login with workflow scope (one-time)"
"$GH" auth refresh -h github.com -s workflow

echo "→ Push workflow to main"
git add .github/workflows/cron-broadcasts.yml scripts/cron-broadcasts-workflow.yml docs/vercel-setup.md
git status -sb

if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "Enable GitHub Actions broadcasts cron (every 15 minutes)"
fi

git push origin main

echo "→ Manual test run"
"$GH" workflow run "Cron — scheduled broadcasts" -R "$("$GH" repo view --json nameWithOwner -q .nameWithOwner)"

echo "Done. Check: GitHub → Actions → Cron — scheduled broadcasts"
