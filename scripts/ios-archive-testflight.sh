#!/usr/bin/env bash
# Prepare and archive the iOS app for TestFlight upload.
# Requires: Xcode, Apple Developer team signing (DEVELOPMENT_TEAM in project).
#
# Usage:
#   bash scripts/ios-archive-testflight.sh
#   npm run ios:archive
#
# After success: Xcode Organizer → Distribute App → App Store Connect → Upload
# Or open the .xcarchive in ~/Library/Developer/Xcode/Archives/

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCHEME="App"
PROJECT="ios/App/App.xcodeproj"
ARCHIVE_DIR="$HOME/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)"
ARCHIVE_NAME="Limitless-Coaching-$(date +%Y%m%d-%H%M%S)"
ARCHIVE_PATH="$ARCHIVE_DIR/$ARCHIVE_NAME.xcarchive"

echo "═══ Limitless Coaching — TestFlight archive prep ═══"
echo ""

echo "▶ 1/4 Production web checks"
node scripts/verify-ios-release.mjs
npm run verify:review-demo

echo ""
echo "▶ 2/4 Capacitor sync (production URL)"
npm run cap:sync
CAP_URL=$(node -e "console.log(require('./ios/App/App/capacitor.config.json').server.url)")
echo "   server.url = $CAP_URL"
if [[ "$CAP_URL" != "https://limitlesscoaching.app" ]]; then
  echo "❌ Expected production URL. Run: npm run cap:sync (not ios:sync:dev)"
  exit 1
fi

BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/App/App/Info.plist 2>/dev/null || true)
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" ios/App/App/Info.plist 2>/dev/null || true)
# Info.plist uses $(CURRENT_PROJECT_VERSION) — read from pbxproj
PBX_BUILD=$(grep -m1 'CURRENT_PROJECT_VERSION' ios/App/App.xcodeproj/project.pbxproj | grep -oE '[0-9]+')
PBX_VERSION=$(grep -m1 'MARKETING_VERSION' ios/App/App.xcodeproj/project.pbxproj | grep -oE '[0-9.]+')
echo "   iOS version: ${PBX_VERSION:-?} (${PBX_VERSION:-?}) build ${PBX_BUILD:-?}"

echo ""
echo "▶ 3/4 xcodebuild archive (Release, generic iOS device)"
mkdir -p "$ARCHIVE_DIR"

xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-SPYUTSUQV7}" \
  2>&1 | tee /tmp/lc-xcodebuild-archive.log | tail -40

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "❌ Archive failed — open Xcode and check Signing & Capabilities."
  exit 1
fi

echo ""
echo "▶ 4/5 Export & upload to App Store Connect"
EXPORT_DIR="$ROOT/build/export"
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$ROOT/ios/exportOptions.plist" \
  -exportPath "$EXPORT_DIR" \
  -allowProvisioningUpdates \
  2>&1 | tail -20

echo ""
echo "▶ 5/5 Done"
echo ""
echo "✅ Archive + upload complete (if export succeeded)."
echo "   Archive: $ARCHIVE_PATH"
echo "   Export:  $EXPORT_DIR"
echo ""
echo "App Store Connect → TestFlight → wait for processing (~5–15 min)."
echo "Checklist: docs/app-store-connect-paste.md"
echo "Screenshots: docs/app-store-screenshots/iphone-67/"
