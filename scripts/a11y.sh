#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/roadmap/preview-helper.sh
roadmap_start_preview
trap roadmap_stop_preview EXIT
mkdir -p docs/perf

npx --yes @axe-core/cli@4.14.0 "$ROADMAP_BASE_URL/nepalmap" "$ROADMAP_BASE_URL/bali-calendar" --exit

for route in nepalmap bali-calendar; do
  npx --yes lighthouse@13.5.0 "$ROADMAP_BASE_URL/$route" \
    --quiet --only-categories=accessibility \
    --output=json --output-path="docs/perf/${route}-a11y-lighthouse.json" \
    --chrome-flags="--headless --no-sandbox"
done
node scripts/roadmap/summarize-a11y.mjs
