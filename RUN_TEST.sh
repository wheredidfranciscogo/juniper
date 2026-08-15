#!/usr/bin/env bash
# RUN_TEST.sh — Juniper project test entry point
#
# Called by project-test after each work cycle. Exit 0 = pass.
#
# Scope (initial): juniper-app type-check + lint only. Native build / device
# tests aren't in the loop — they require a real device or simulator and a
# human eye. The marketing website is not in scope until it's been repurposed
# from the old jungle-jungle plant tracker (currently a [!] blocker on the
# dependabot fast-forward).
#
# What's checked:
#   [1] juniper-app: tsc --noEmit  (the canonical Phase 1 "still clean?" gate)
#   [2] juniper-app: expo lint
#
# What's deliberately NOT checked (yet):
#   - juniper-app native build: needs Xcode/Android Studio, too slow for the loop
#   - juniper-website next build: skip until dependabot bumps are pulled
#   - juniper-design: no build, design assets

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==> Juniper test suite"
echo "    cwd: $PROJECT_ROOT"
echo ""

# ---------- juniper-app type-check ----------
echo "[1/2] juniper-app: tsc --noEmit..."
if [ -d "juniper-app" ] && [ -f "juniper-app/package.json" ]; then
  (
    cd juniper-app
    if [ ! -d "node_modules" ]; then
      echo "    installing dependencies..."
      npm install --silent --no-audit --no-fund
    fi
    npx --no-install tsc --noEmit
  )
  echo "    juniper-app tsc OK"
else
  echo "    SKIPPED (juniper-app/package.json not found)"
fi
echo ""

# ---------- juniper-app lint ----------
echo "[2/2] juniper-app: expo lint..."
if [ -d "juniper-app" ] && [ -f "juniper-app/package.json" ]; then
  (
    cd juniper-app
    npm run lint --silent
  )
  echo "    juniper-app lint OK"
else
  echo "    SKIPPED (juniper-app/package.json not found)"
fi
echo ""

echo "==> All checks passed"
exit 0
