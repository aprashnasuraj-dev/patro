#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p docs/verification docs/perf
RUN_TMP="$(mktemp)"
trap 'rm -f "$RUN_TMP"' EXIT
START_EPOCH="$(date +%s)"
STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

run_gate() {
  local name="$1"; shift
  local started finished
  started="$(date +%s)"
  echo "==> $name"
  "$@" 2>&1 | tee -a "$RUN_TMP"
  finished="$(date +%s)"
  echo "GATE_DURATION $name $((finished-started))s" | tee -a "$RUN_TMP"
}

DEPENDENCY_LOCK="absent"
if [[ -f package-lock.json ]]; then
  DEPENDENCY_LOCK="package-lock.json"
  LOCK_BEFORE="$(sha256sum package-lock.json | awk '{print $1}')"
  run_gate npm_ci npm ci
  LOCK_AFTER="$(sha256sum package-lock.json | awk '{print $1}')"
  if [[ "$LOCK_BEFORE" != "$LOCK_AFTER" ]]; then
    echo "package-lock.json changed after npm ci" >&2
    exit 1
  fi
  git diff --exit-code -- package-lock.json
else
  echo "NOTICE: package-lock.json is absent; verification uses npm install --no-package-lock and does not claim lockfile reproducibility." | tee -a "$RUN_TMP"
  run_gate npm_install npm install --no-package-lock
fi

run_gate typecheck npm run typecheck
run_gate lint npm run lint
run_gate roadmap_tests npm run test:roadmap
run_gate explore_tests npm run test:explore
run_gate worldcal_tests npm run test:worldcal
run_gate provenance_schema node scripts/roadmap/validate-schemas.mjs
run_gate privacy_assertions node scripts/roadmap/privacy-assertions.mjs
run_gate enhancement_contract node scripts/roadmap/nepal-enhancement-contract.mjs
run_gate roadmap_js_syntax bash -c 'node --check scripts/explore/nepal/build-map.mjs && node --check scripts/explore/nepal/build-pmtiles.mjs && node --check scripts/explore/nepal/boundary-confidence.mjs && node --check scripts/explore/nepal/place-id-core.mjs && node --check scripts/explore/nepal/place-anomalies.mjs && node --check scripts/explore/nepal/audit-rebuild.mjs && node --check scripts/explore/nepal/generation-report.mjs && node --check scripts/explore/nepal/boundary-review-report.mjs && node --check scripts/explore/nepal/road-coverage-report.mjs && node --check scripts/explore/nepal/measure-route-road-match.mjs && node --check scripts/explore/nepal/entity-page-audit.mjs && node --check scripts/explore/nepal/export-fixtures.mjs && node --check scripts/explore/nepal/map/routing-v2.js && node --check scripts/explore/nepal/map/road-safety.js && node --check scripts/explore/nepal/map/terrain.js && node --check scripts/explore/nepal/map/pmtiles-poc.js && node --check scripts/explore/nepal/map/export-core.mjs && node --check scripts/explore/nepal/map/exports.mjs && node --check scripts/explore/nepal/map/offline.js && node --check scripts/explore/nepal/map/offline-sw.js && node --check scripts/explore/nepal/map/mobile-sheet.js && node --check scripts/explore/nepal/map/itinerary.js && node --check scripts/explore/nepal/map/corrections-ui.js && node --check scripts/explore/nepal/map/emergency.js && node --check scripts/explore/nepal/map/embed.js && node --check scripts/explore/nepal/map/embed-widget.js'
run_gate roadmap_python_syntax python3 -m py_compile scripts/explore/nepal/osm_wards.py scripts/explore/nepal/osm_roads.py scripts/explore/nepal/elevation-sample.py
run_gate valhalla_static bash -c 'bash -n scripts/explore/nepal/generate-roadmap-data.sh scripts/explore/nepal/vendor-map-runtime.sh infra/nepal-routing/fetch-pinned-osm.sh infra/nepal-routing/build-release.sh infra/nepal-routing/promote-release.sh && python3 -m py_compile infra/nepal-routing/verify_routes.py'
run_gate production_build npm run build
run_gate static_budget node scripts/verify-static-file-budget.mjs
run_gate seo_policy node scripts/roadmap/seo-policy.mjs
run_gate e2e bash scripts/e2e.sh
run_gate benchmark bash scripts/bench.sh
run_gate accessibility bash scripts/a11y.sh

END_EPOCH="$(date +%s)"
{
  echo
  echo "## $STAMP — full local roadmap verification"
  echo
  echo "Status: **GREEN**"
  echo
  echo "- Total duration: $((END_EPOCH-START_EPOCH))s"
  echo "- Dependency lock: $DEPENDENCY_LOCK."
  echo "- Benchmark JSON: docs/perf/after.json"
  echo "- Accessibility JSON: docs/perf/a11y.json"
  echo
  echo '```text'
  tail -n 120 "$RUN_TMP"
  echo '```'
} >> docs/verification/RUN_LOG.md

echo "ROADMAP_VERIFY_GREEN"
