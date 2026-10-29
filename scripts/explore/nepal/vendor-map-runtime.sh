#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
ROOT="$PWD"
OUT="${NEPALMAP_VENDOR_OUT:-$ROOT/public/vendor/nepalmap}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT/maplibre-4.7.1" "$OUT/pmtiles-4.5.0"

cd "$TMP"
ML_TGZ="$(npm pack maplibre-gl@4.7.1 --silent)"
tar -xzf "$ML_TGZ"
cp package/dist/maplibre-gl-csp.js "$OUT/maplibre-4.7.1/maplibre-gl-csp.js"
cp package/dist/maplibre-gl-csp-worker.js "$OUT/maplibre-4.7.1/maplibre-gl-csp-worker.js"
cp package/dist/maplibre-gl.css "$OUT/maplibre-4.7.1/maplibre-gl.css"
rm -rf package "$ML_TGZ"

PM_TGZ="$(npm pack pmtiles@4.5.0 --silent)"
tar -xzf "$PM_TGZ"
cp package/dist/pmtiles.js "$OUT/pmtiles-4.5.0/pmtiles.js"

cd "$ROOT"
cat > "$OUT/versions.json" <<'JSON'
{"maplibre-gl":"4.7.1","pmtiles":"4.5.0","licenses":{"maplibre-gl":"BSD-3-Clause","pmtiles":"BSD-3-Clause"}}
JSON
echo "Vendored Nepal Map runtime into public/vendor/nepalmap"
