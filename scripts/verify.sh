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

LOCK_BEFORE="$(sha256sum package-lock.json | awk '{print $1}')"
run_gate npm_ci npm ci
LOCK_AFTER="$(sha256sum package-lock.json | awk '{print $1}')"
if [[ "$LOCK_BEFORE" != "$LOCK_AFTER" ]]; then
  echo "package-lock.json changed after npm ci" >&2
  exit 1
fi
git diff --exit-code -- package-lock.json

run_gate typecheck npm run typecheck
run_gate lint npm run lint
run_gate roadmap_tests npm run test:roadmap
run_gate explore_tests npm run test:explore
run_gate worldcal_tests npm run test:worldcal
run_gate provenance_schema node scripts/roadmap/validate-schemas.mjs
run_gate privacy_assertions node scripts/roadmap/privacy-assertions.mjs
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
  echo "- package-lock.json unchanged by npm ci."
  echo "- Benchmark JSON: docs/perf/after.json"
  echo "- Accessibility JSON: docs/perf/a11y.json"
  echo
  echo '```text'
  tail -n 120 "$RUN_TMP"
  echo '```'
} >> docs/verification/RUN_LOG.md

echo "ROADMAP_VERIFY_GREEN"
