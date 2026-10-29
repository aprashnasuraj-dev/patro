#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$ROOT/source-manifest.json"
TARGET="${1:-$ROOT/data/staging}"

for cmd in curl python3 md5sum sha256sum wc; do
  command -v "$cmd" >/dev/null || { echo "missing required command: $cmd" >&2; exit 2; }
done

read_manifest() {
  python3 - "$MANIFEST" "$1" <<'PY'
import json,sys
with open(sys.argv[1],encoding="utf-8") as f:
    print(json.load(f)[sys.argv[2]])
PY
}

FILE="$(read_manifest file_name)"
URL="$(read_manifest url)"
MD5_URL="$(read_manifest md5_url)"
EXPECTED_BYTES="$(read_manifest expected_bytes)"
mkdir -p "$TARGET"
TMP="$TARGET/$FILE.part"
MD5_FILE="$TARGET/$FILE.md5"
FINAL="$TARGET/$FILE"
rm -f "$TMP" "$MD5_FILE"

echo "Downloading pinned Nepal OSM snapshot: $URL"
curl --fail --location --retry 4 --retry-all-errors --connect-timeout 20 --max-time 1800 "$URL" -o "$TMP"
curl --fail --location --retry 4 --retry-all-errors --connect-timeout 20 --max-time 60 "$MD5_URL" -o "$MD5_FILE"

ACTUAL_BYTES="$(wc -c < "$TMP" | tr -d '[:space:]')"
if [[ "$ACTUAL_BYTES" != "$EXPECTED_BYTES" ]]; then
  echo "byte-length mismatch: expected $EXPECTED_BYTES, got $ACTUAL_BYTES" >&2
  exit 3
fi

EXPECTED_MD5="$(awk 'NR==1 {print $1}' "$MD5_FILE" | tr '[:upper:]' '[:lower:]')"
ACTUAL_MD5="$(md5sum "$TMP" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
if [[ -z "$EXPECTED_MD5" || "$EXPECTED_MD5" != "$ACTUAL_MD5" ]]; then
  echo "MD5 mismatch: Geofabrik=$EXPECTED_MD5 local=$ACTUAL_MD5" >&2
  exit 4
fi

mv "$TMP" "$FINAL"
SHA256="$(sha256sum "$FINAL" | awk '{print $1}')"
python3 - "$MANIFEST" "$FINAL" "$EXPECTED_MD5" "$SHA256" "$ACTUAL_BYTES" "$TARGET/source-lock.json" <<'PY'
import json,sys,datetime,os
manifest_path,file_path,md5,sha256,size,lock_path=sys.argv[1:]
with open(manifest_path,encoding="utf-8") as f:
    source=json.load(f)
lock={
    "schema_version":1,
    "locked_at":datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00","Z"),
    "source":source,
    "artifact":{
        "path":os.path.basename(file_path),
        "bytes":int(size),
        "md5":md5,
        "sha256":sha256,
    },
}
with open(lock_path,"w",encoding="utf-8") as f:
    json.dump(lock,f,indent=2,ensure_ascii=False)
    f.write("\n")
PY

echo "Verified $FINAL"
echo "SHA-256 $SHA256"
