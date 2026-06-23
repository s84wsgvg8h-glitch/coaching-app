#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_OUT="${1:-$ROOT/coaching-app-export.zip}"
TEXT_OUT="${2:-$ROOT/coaching-app-source.txt}"
DOWNLOADS_ZIP="${HOME}/Downloads/coaching-app-export.zip"
TMP="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "Exporting coaching-app source to: $ZIP_OUT"

rsync -a \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'out' \
  --exclude 'build' \
  --exclude 'coverage' \
  --exclude '.git' \
  --exclude '.vercel' \
  --exclude '.cursor' \
  --exclude '.DS_Store' \
  --exclude '*.tsbuildinfo' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'data/knowledge-local.json' \
  --exclude 'coaching-app-export.zip' \
  --exclude 'coaching-app-source.txt' \
  "$ROOT/" "$TMP/coaching-app/"

mkdir -p "$(dirname "$ZIP_OUT")"
rm -f "$ZIP_OUT"

(
  cd "$TMP"
  zip -rq "$ZIP_OUT" coaching-app
)

echo "Building text bundle: $TEXT_OUT"
rm -f "$TEXT_OUT"

{
  echo "# Limitless Coaching — volledige broncode-export"
  echo "# Gegenereerd: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "# Gebruik coaching-app-export.zip voor een normale map-structuur."
  echo "# Dit bestand kun je wel in Cursor openen (geen binary)."
  echo
} > "$TEXT_OUT"

find "$TMP/coaching-app" -type f \
  \( \
    -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o \
    -name '*.mjs' -o -name '*.cjs' -o -name '*.sql' -o -name '*.json' -o \
    -name '*.css' -o -name '*.md' -o -name '*.sh' -o -name '*.txt' -o \
    -name '*.html' -o -name '*.yml' -o -name '*.yaml' -o -name '*.toml' -o \
    -name '.gitignore' -o -name 'AGENTS.md' -o -name 'CLAUDE.md' -o \
    -name 'README.md' -o -name 'middleware.ts' \
  \) \
  ! -path '*/node_modules/*' \
  ! -path '*/.next/*' \
  | sort | while IFS= read -r file; do
    rel="${file#"$TMP/coaching-app/"}"
    {
      echo
      echo "===== FILE: coaching-app/$rel ====="
      cat "$file"
    } >> "$TEXT_OUT"
  done

ZIP_BYTES="$(wc -c < "$ZIP_OUT" | tr -d ' ')"
ZIP_FILES="$(unzip -l "$ZIP_OUT" | tail -1 | awk '{print $2}')"
TEXT_BYTES="$(wc -c < "$TEXT_OUT" | tr -d ' ')"
TEXT_FILES="$(grep -c '^===== FILE:' "$TEXT_OUT" || true)"

cp "$ZIP_OUT" "$DOWNLOADS_ZIP"

echo "Done:"
echo "  ZIP  → $ZIP_OUT ($ZIP_BYTES bytes, $ZIP_FILES entries)"
echo "  ZIP  → $DOWNLOADS_ZIP (kopie in Downloads)"
echo "  TEXT → $TEXT_OUT ($TEXT_BYTES bytes, $TEXT_FILES files)"
echo
echo "Cursor: open coaching-app-source.txt (geen binary)."
echo "Mac:    open ~/Downloads/coaching-app-export.zip"
