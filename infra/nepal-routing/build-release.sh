#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SNAPSHOT="$(python3 - "$ROOT/source-manifest.json" <<'PY'
import json,sys
with open(sys.argv[1],encoding="utf-8") as f: print(json.load(f)["snapshot_label"])
PY
)"
RELEASE="$ROOT/data/releases/$SNAPSHOT"
REPORT_DIR="$ROOT/reports"
PORT="${VALHALLA_CANDIDATE_PORT:-18002}"
PROJECT="nepal-routing-candidate-${SNAPSHOT//-/}"
START="$(date +%s)"
mkdir -p "$RELEASE" "$REPORT_DIR"

"$ROOT/fetch-pinned-osm.sh" "$RELEASE"

cleanup() {
  VALHALLA_DATA_DIR="$RELEASE" VALHALLA_PORT="$PORT" \
    NEPAL_ROUTING_HOST="${NEPAL_ROUTING_HOST:-build-only.invalid}" \
    NEPAL_ROUTING_TOKEN="${NEPAL_ROUTING_TOKEN:-build-only-not-used}" \
    CADDY_ACME_EMAIL="${CADDY_ACME_EMAIL:-build-only@example.invalid}" \
    docker compose -p "$PROJECT" -f "$ROOT/docker-compose.yml" down >/dev/null 2>&1 || true
}
trap cleanup EXIT

VALHALLA_DATA_DIR="$RELEASE" VALHALLA_PORT="$PORT" VALHALLA_USE_TILES_IGNORE_PBF=False \
  NEPAL_ROUTING_HOST="${NEPAL_ROUTING_HOST:-build-only.invalid}" \
  NEPAL_ROUTING_TOKEN="${NEPAL_ROUTING_TOKEN:-build-only-not-used}" \
  CADDY_ACME_EMAIL="${CADDY_ACME_EMAIL:-build-only@example.invalid}" \
  docker compose -p "$PROJECT" -f "$ROOT/docker-compose.yml" up -d valhalla

ready=0
for _ in $(seq 1 240); do
  if curl -fsS "http://127.0.0.1:$PORT/status" > "$REPORT_DIR/status-$SNAPSHOT.json" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 5
done
if [[ "$ready" != "1" ]]; then
  echo "Valhalla candidate did not become healthy within 20 minutes" >&2
  exit 5
fi

python3 "$ROOT/verify_routes.py" \
  --base "http://127.0.0.1:$PORT" \
  --health-path /status \
  --output "$REPORT_DIR/routes-$SNAPSHOT.json"

END="$(date +%s)"
python3 - "$RELEASE" "$ROOT/source-manifest.json" "$REPORT_DIR/routes-$SNAPSHOT.json" "$REPORT_DIR/status-$SNAPSHOT.json" "$((END-START))" "$REPORT_DIR/build-$SNAPSHOT.json" <<'PY'
import json,os,sys,datetime
release,manifest_path,routes_path,status_path,duration,out=sys.argv[1:]
def load(path):
    with open(path,encoding="utf-8") as f:return json.load(f)
sizes={}
total=0
for root,_,files in os.walk(release):
    for name in files:
        path=os.path.join(root,name)
        size=os.path.getsize(path)
        total+=size
        rel=os.path.relpath(path,release)
        if rel.endswith((".osm.pbf",".tar",".sqlite",".json")):
            sizes[rel]=size
report={
    "schema_version":1,
    "generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00","Z"),
    "source":load(manifest_path),
    "source_lock":load(os.path.join(release,"source-lock.json")),
    "generation_seconds":int(duration),
    "release_bytes":total,
    "selected_file_bytes":sizes,
    "valhalla_status":load(status_path),
    "route_verification":load(routes_path),
}
with open(out,"w",encoding="utf-8") as f:
    json.dump(report,f,indent=2,ensure_ascii=False);f.write("\n")
PY

echo "Candidate release built and verified by fixture runner: $RELEASE"
echo "Review $REPORT_DIR/build-$SNAPSHOT.json before promotion."
