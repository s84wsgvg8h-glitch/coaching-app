#!/usr/bin/env bash
# Build the Limitless Coaching iOS app and launch it in the booted iPhone 15 simulator.
# Usage: bash scripts/ios-run-sim.sh
# Prerequisite:
#   Prod parity (same as TestFlight): npm run ios:sim:prod
#   Local dev UI: npm run ios:dev  (+ npm run dev in another terminal)

set -e

SCHEME="App"
PROJECT="ios/App/App.xcodeproj"
BUNDLE_ID="app.limitlesscoaching"
SIM_NAME="iPhone 15"
CAP_CONFIG="ios/App/App/capacitor.config.json"

if [ -f "$CAP_CONFIG" ]; then
  SERVER_URL=$(node -e "const c=require('./$CAP_CONFIG'); console.log(c.server?.url||'(bundled webDir only)')")
  echo "📡 Capacitor server.url: $SERVER_URL"
  if [[ "$SERVER_URL" == http://localhost* ]]; then
    echo "⚠️  Simulator loads LOCAL dev server — UI will differ from TestFlight unless npm run dev matches production deploy."
    echo "   For TestFlight parity use: npm run ios:sim:prod"
  elif [[ "$SERVER_URL" == https://limitlesscoaching.app* ]]; then
    echo "✓  Simulator loads production (same remote UI as TestFlight shell)."
  fi
else
  echo "⚠️  Missing $CAP_CONFIG — run: npm run cap:sync"
fi

# ── Find or boot the simulator ──────────────────────────────────────────────
SIM_UDID=$(xcrun simctl list devices | grep "$SIM_NAME" | grep -oE '[A-F0-9-]{36}' | head -1)

if [ -z "$SIM_UDID" ]; then
  echo "❌  Could not find '$SIM_NAME' simulator. Run: xcrun simctl list devices"
  exit 1
fi

SIM_STATE=$(xcrun simctl list devices | grep "$SIM_UDID" | grep -oE 'Booted|Shutdown')

if [ "$SIM_STATE" != "Booted" ]; then
  echo "▶  Booting $SIM_NAME ($SIM_UDID)…"
  xcrun simctl boot "$SIM_UDID"
fi

open -a Simulator

# ── Build ────────────────────────────────────────────────────────────────────
echo "🔨  Building for simulator…"
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,id=$SIM_UDID" \
  -configuration Debug \
  build \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO \
  2>&1 | grep -E "error:|warning:|BUILD (SUCCEEDED|FAILED)|CompileSwift|Compile|Linking|CodeSign" | tail -20

# Check build result
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌  Build failed."
  exit 1
fi

echo "✅  Build succeeded."

# ── Install & Launch ─────────────────────────────────────────────────────────
# Exclude Index.noindex (incremental index copies) — we want the real build output.
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "$SCHEME.app" -path "*/Build/Products/Debug-iphonesimulator/*" ! -path "*/Index.noindex/*" | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌  Could not find built .app in DerivedData."
  exit 1
fi

echo "📲  Installing on $SIM_NAME…"
xcrun simctl install "$SIM_UDID" "$APP_PATH"

echo "🚀  Launching…"
xcrun simctl launch "$SIM_UDID" "$BUNDLE_ID"

echo ""
echo "✅  App launched in $SIM_NAME."
if [[ "${SERVER_URL:-}" == http://localhost* ]]; then
  echo "   Ensure 'npm run dev' is running (ios:dev workflow)."
else
  echo "   Remote UI: ${SERVER_URL:-unknown} — compare with TestFlight on device."
fi
