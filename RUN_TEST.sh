#!/usr/bin/env bash
# RUN_TEST.sh — Juniper test entry point
#
# Called by project-test after each work cycle. Exit 0 = pass.
#
# Scope: juniper-app only. There is nothing else to test —
#   * juniper-website is four static HTML files with no build step (D5)
#   * juniper-design is a frozen prototype and design assets
#
# What's checked:
#   [1] tsc --noEmit          — the canonical "still clean?" gate
#   [2] jest                  — unit + component + route-gate + screen smoke suites
#   [3] expo export --ios     — catches broken imports and route-resolution breakage
#                               that unit tests miss (was --platform web until the web
#                               target was dropped; see DECISIONS.md D1)
#
# Deliberately NOT checked here:
#   * Maestro E2E — needs a booted emulator and a built binary; manual workflow only
#   * Native builds — EAS, too slow for the loop
#   * Notification delivery — needs a real device on a dev build (D6)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT/juniper-app"

echo "==> Juniper test suite"
echo "    cwd: $(pwd)"
echo ""

if [ ! -d "node_modules" ]; then
  echo "    installing dependencies..."
  npm install --silent --no-audit --no-fund
fi

echo "[1/3] tsc --noEmit..."
npx --no-install tsc --noEmit
echo "      OK"
echo ""

echo "[2/3] jest..."
npm run test:ci --silent
echo "      OK"
echo ""

echo "[3/3] expo export --platform ios..."
npx --no-install expo export --platform ios --output-dir /tmp/juniper-export >/dev/null
rm -rf /tmp/juniper-export
echo "      OK"
echo ""

echo "==> All checks passed"
exit 0
