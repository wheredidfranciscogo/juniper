#!/usr/bin/env bash
# RUN_TEST.sh — Juniper test entry point
#
# Called by project-test after each work cycle. Exit 0 = pass.
#
# Scope: rayen-web, which is now the whole of Juniper. The native app this script
# used to run is gone (frozen at DECISIONS.md D13, then removed), and with it the
# Maestro E2E workflow and the Expo bundle check.
#
# What's checked:
#   [1] tsc --noEmit  — the canonical "still clean?" gate
#   [2] vitest        — unit, lib and component suites
#   [3] vite build    — catches broken imports, and that BOTH pages are built; a build
#                       taking only index.html once shipped a deploy with no deck in it
#
# Deliberately NOT checked here:
#   * Anything needing a browser — motion and layout are verified by hand in real
#     Chrome, because the in-app preview pane reports frozen frames as real

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT/rayen-web"

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

echo "[2/3] vitest..."
npm test --silent
echo "      OK"
echo ""

echo "[3/3] vite build..."
npm run build --silent >/dev/null
echo "      OK"
echo ""

echo "==> All checks passed"
exit 0
