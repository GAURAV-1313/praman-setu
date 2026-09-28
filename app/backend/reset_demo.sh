#!/usr/bin/env bash
# Restore the demo to its starting state (clears decisions, confirmations, the sign tray, the audit log and the policy).
# The browser clears its own UI modes (shadow / presenter / "then next case" / language) on its next page load,
# because the backend's reset id changes. Or open  http://localhost:5173/?demo=reset  — it does both.
set -euo pipefail
cd "$(dirname "$0")"
if curl -sf -X POST "http://localhost:${PORT:-8000}/api/reset" >/dev/null 2>&1; then
  echo "Demo reset via the running API."
else
  rm -f state/state.json
  echo "API not running; removed state/state.json. The next start is a clean demo."
fi
cat <<'TXT'
Stage hygiene (T-2 min):
  1. ONE browser window, ONE tab on http://localhost:5173/?demo=reset  (no other sessions / agents on :8000)
  2. Browser zoom 100%; F11 fullscreen if the screen is 1366x768 (the app also fits a 1366x657 window)
  3. Menu (...) -> "Demo mode" has one-click links for every step of the 5-minute script
  4. Keep the offline build in tab 2 and the backup video in tab 3
TXT
