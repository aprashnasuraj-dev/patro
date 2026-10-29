#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/roadmap/preview-helper.sh
roadmap_start_preview
trap roadmap_stop_preview EXIT
mkdir -p docs/perf

for route in nepalmap bali-calendar; do
  npx --yes lighthouse@13.5.0 "$ROADMAP_BASE_URL/$route" \
    --quiet --only-categories=performance \
    --output=json --output-path="docs/perf/${route}-lighthouse.json" \
    --chrome-flags="--headless --no-sandbox"
done

node scripts/roadmap/summarize-bench.mjs
