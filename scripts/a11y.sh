#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/roadmap/preview-helper.sh
roadmap_start_preview
trap roadmap_stop_preview EXIT
mkdir -p docs/perf

# axe-core CLI uses Selenium/ChromeDriver. GitHub-hosted runners can update Chrome
# ahead of the driver bundled elsewhere on PATH, so install a synchronized
# Chrome-for-Testing + ChromeDriver pair and pass both binaries explicitly.
npx --yes browser-driver-manager@2.0.1 install chrome
BDM_ENV="$HOME/.browser-driver-manager/.env"
[[ -s "$BDM_ENV" ]] || { echo "browser-driver-manager did not write $BDM_ENV" >&2; exit 2; }
set -a
# shellcheck disable=SC1090
source "$BDM_ENV"
set +a
[[ -x "$CHROME_TEST_PATH" ]] || { echo "Chrome-for-Testing missing: $CHROME_TEST_PATH" >&2; exit 2; }
[[ -x "$CHROMEDRIVER_TEST_PATH" ]] || { echo "ChromeDriver missing: $CHROMEDRIVER_TEST_PATH" >&2; exit 2; }
"$CHROME_TEST_PATH" --version
"$CHROMEDRIVER_TEST_PATH" --version

npx --yes @axe-core/cli@4.14.0 \
  "$ROADMAP_BASE_URL/nepalmap" "$ROADMAP_BASE_URL/bali-calendar" \
  --chrome-path="$CHROME_TEST_PATH" \
  --chromedriver-path="$CHROMEDRIVER_TEST_PATH" \
  --chrome-options="no-sandbox,disable-dev-shm-usage" \
  --exit

for route in nepalmap bali-calendar; do
  npx --yes lighthouse@13.5.0 "$ROADMAP_BASE_URL/$route" \
    --quiet --only-categories=accessibility \
    --output=json --output-path="docs/perf/${route}-a11y-lighthouse.json" \
    --chrome-flags="--headless --no-sandbox"
done
node scripts/roadmap/summarize-a11y.mjs
