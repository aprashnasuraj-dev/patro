#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

FULL_TERRAIN=1
FULL_PMTILES=1
for arg in "$@"; do
  case "$arg" in
    --skip-terrain) FULL_TERRAIN=0 ;;
    --skip-pmtiles) FULL_PMTILES=0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

for cmd in node python3 curl; do command -v "$cmd" >/dev/null || { echo "missing $cmd" >&2; exit 2; }; done
python3 - <<'PY'
import importlib.util
if importlib.util.find_spec("osmium") is None:
    raise SystemExit("missing Python dependency: osmium (pyosmium)")
PY
if [[ "$FULL_PMTILES" == "1" ]]; then command -v tippecanoe >/dev/null || { echo "missing tippecanoe" >&2; exit 2; }; fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$ROOT/.cache/nepalmap-generation/$RUN_ID"
SOURCE="$WORK/source"
PREVIOUS="$WORK/previous"
STAGE="$WORK/public"
TIMINGS="$WORK/timings.tsv"
REPORT="$ROOT/docs/verification/nepal-data-generation-$RUN_ID.json"
mkdir -p "$SOURCE" "$PREVIOUS" "$STAGE" "$(dirname "$REPORT")"
: > "$TIMINGS"

run_step() {
  local name="$1"; shift
  local start end
  start="$(date +%s)"
  echo "==> $name"
  "$@"
  end="$(date +%s)"
  printf '%s\t%s\n' "$name" "$((end-start))" >> "$TIMINGS"
}

for f in osm-admin.json osm-settlements.json osm-pois.json osm-report.json place-id-map.json; do
  [[ -f "$ROOT/data/explore/nepal/$f" ]] && cp "$ROOT/data/explore/nepal/$f" "$PREVIOUS/$f"
done
for f in osm-pois.json osm-settlements.json place-id-map.json; do
  [[ -f "$PREVIOUS/$f" ]] || { echo "previous dataset missing $f; two-build persistence audit cannot run" >&2; exit 3; }
done

run_step osm_source "$ROOT/infra/nepal-routing/fetch-pinned-osm.sh" "$SOURCE"
PBF="$SOURCE/$(python3 - <<'PY'
import json
with open("infra/nepal-routing/source-manifest.json",encoding="utf-8") as f: print(json.load(f)["file_name"])
PY
)"

run_step osm_ingest python3 scripts/explore/nepal/osm_wards.py --pbf "$PBF" --out data/explore/nepal
run_step stable_ids node scripts/explore/nepal/update-place-ids.mjs
run_step road_metadata python3 scripts/explore/nepal/osm_roads.py --pbf "$PBF" --out data/explore/nepal/osm-roads.geojsonseq
run_step rebuild_audit node scripts/explore/nepal/audit-rebuild.mjs --previous "$PREVIOUS" --current data/explore/nepal --out "$WORK/rebuild-audit.json"

run_step vendor_runtime env NEPALMAP_VENDOR_OUT="$STAGE/vendor/nepalmap" bash scripts/explore/nepal/vendor-map-runtime.sh

MAP_ENV=(
  ROADMAP_PROVENANCE_UI=0
  NEPALMAP_STABLE_IDS=1
  NEPALMAP_BOUNDARY_CONFIDENCE=1
  NEPALMAP_API_BUILD=1
  NEPALMAP_OFFLINE_PACKS=1
  NEPALMAP_SELF_HOST_MAPLIBRE=1
  NEPALMAP_PMTILES=1
  NEPALMAP_POI_PAGES=1
)
if [[ -n "${NEPAL_BOUNDARY_GEOJSON:-}" ]]; then MAP_ENV+=("NEPAL_BOUNDARY_GEOJSON=$NEPAL_BOUNDARY_GEOJSON"); fi
run_step compact_map env "${MAP_ENV[@]}" node scripts/explore/nepal/build-map.mjs --out "$STAGE"
run_step map_quality node scripts/explore/nepal/map-quality-report.mjs \
  --data "$STAGE/data/nepalmap/v1" --rebuild "$WORK/rebuild-audit.json" --out "$WORK/map-quality.json"

if [[ "$FULL_PMTILES" == "1" ]]; then
  run_step pmtiles env \
    NEPALMAP_DATA_DIR="$STAGE/data/nepalmap/v1" \
    NEPALMAP_PMTILES_DIR="$STAGE/data/nepalmap/v2" \
    NEPALMAP_ROADS_NDJSON="$ROOT/data/explore/nepal/osm-roads.geojsonseq" \
    node scripts/explore/nepal/build-pmtiles.mjs
fi

if [[ "$FULL_TERRAIN" == "1" ]]; then
  run_step terrain env NEPALMAP_DEM_OUT="$STAGE/data/nepalmap/dem" bash scripts/explore/nepal/build-copernicus-dem.sh
fi

run_step report node scripts/explore/nepal/generation-report.mjs \
  --root "$ROOT" --stage "$STAGE" --timings "$TIMINGS" \
  --source-lock "$SOURCE/source-lock.json" --rebuild "$WORK/rebuild-audit.json" --quality "$WORK/map-quality.json" --out "$REPORT"

echo "Nepal data generation completed."
echo "Staged public artifacts: $STAGE"
echo "Reviewable report: $REPORT"
echo "Raw source-data changes remain in data/explore/nepal for explicit review/commit; nothing is deployed by this script."
