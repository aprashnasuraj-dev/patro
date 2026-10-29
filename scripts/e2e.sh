#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/roadmap/preview-helper.sh
roadmap_start_preview
trap roadmap_stop_preview EXIT

npx playwright install chromium
ROADMAP_BASE_URL="$ROADMAP_BASE_URL" npx playwright test tests/roadmap.e2e.spec.ts --config=playwright.roadmap.config.ts
