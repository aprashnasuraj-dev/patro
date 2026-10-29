#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/roadmap/preview-helper.sh
roadmap_start_preview
trap roadmap_stop_preview EXIT
mkdir -p docs/perf

# axe CLI uses Selenium and requires ChromeDriver to match the Chrome binary.
# Install a synchronized pair rather than relying on the runner image's global
# chromedriver, which can lag behind Chrome.
npx --yes browser-driver-manager install chrome
BDM_ENV="$HOME/.browser-driver-manager/.env"
[[ -f "$BDM_ENV" ]] || { echo "browser-driver-manager did not write $BDM_ENV" >&2; exit 2; }
set -a
# shellcheck disable=SC1090
source "$BDM_ENV"
set +a
[[ -x "${CHROMEDRIVER_TEST_PATH:-}" ]] || { echo "CHROMEDRIVER_TEST_PATH missing or not executable" >&2; exit 2; }
[[ -x "${CHROME_TEST_PATH:-}" ]] || { echo "CHROME_TEST_PATH missing or not executable" >&2; exit 2; }

npx --yes @axe-core/cli@4.14.0 "$ROADMAP_BASE_URL/nepalmap" "$ROADMAP_BASE_URL/bali-calendar" \
  --chromedriver-path="$CHROMEDRIVER_TEST_PATH" \
  --chrome-path="$CHROME_TEST_PATH" \
  --exit

for route in nepalmap bali-calendar; do
  npx --yes lighthouse@13.5.0 "$ROADMAP_BASE_URL/$route" \
    --quiet --only-categories=accessibility \
    --output=json --output-path="docs/perf/${route}-a11y-lighthouse.json" \
    --chrome-flags="--headless --no-sandbox"
done
node scripts/roadmap/summarize-a11y.mjs
