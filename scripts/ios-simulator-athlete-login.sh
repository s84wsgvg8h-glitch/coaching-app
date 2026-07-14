#!/bin/bash
# Login as athlete in booted iOS Simulator (Capacitor app).
set -euo pipefail

EMAIL="${E2E_ATHLETE_EMAIL:-henk@henk.com}"
PASSWORD="${E2E_ATHLETE_PASSWORD:-123456}"
BUNDLE="app.limitlesscoaching"

echo "→ Relaunch $BUNDLE"
xcrun simctl terminate booted "$BUNDLE" 2>/dev/null || true
sleep 1
xcrun simctl launch booted "$BUNDLE"
sleep 3

echo "→ Copy credentials to pasteboard"
printf '%s' "$EMAIL" | pbcopy

osascript <<'APPLESCRIPT'
tell application "Simulator" to activate
delay 1.5

tell application "System Events"
  tell process "Simulator"
    set frontmost to true
    -- Tap email field (relative to window center-top on iPhone login)
    set winPos to position of window 1
    set winSize to size of window 1
    set cx to (item 1 of winPos) + (item 1 of winSize) / 2
    set cy to (item 2 of winPos) + (item 2 of winSize) * 0.42
    click at {cx, cy}
    delay 0.4
    keystroke "v" using command down
    delay 0.5
    -- Tab to password
    key code 48 using {shift down}
    delay 0.3
    -- password via pasteboard swap happens outside
  end tell
end tell
APPLESCRIPT

printf '%s' "$PASSWORD" | pbcopy
sleep 0.3

osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "Simulator"
    keystroke "v" using command down
    delay 0.5
    -- Tap Inloggen button
    set winPos to position of window 1
    set winSize to size of window 1
    set cx to (item 1 of winPos) + (item 1 of winSize) / 2
    set cy to (item 2 of winPos) + (item 2 of winSize) * 0.62
    click at {cx, cy}
  end tell
end tell
APPLESCRIPT

sleep 5
xcrun simctl io booted screenshot /tmp/ios-athlete-logged-in.png
echo "→ Screenshot: /tmp/ios-athlete-logged-in.png"
