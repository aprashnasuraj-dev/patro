#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT="${NEPALMAP_DEM_OUT:-$ROOT/public/data/nepalmap/dem}"
WORK="${NEPALMAP_DEM_WORK:-$ROOT/.cache/nepalmap-dem}"
RAW="$WORK/raw"
BASE="https://copernicus-dem-30m.s3.amazonaws.com"
ZOOMS="${NEPALMAP_DEM_ZOOMS:-5-13}"
PROCESSES="${NEPALMAP_DEM_PROCESSES:-4}"
ATTRIBUTION='produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved'
LIABILITY='The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30.'

for cmd in curl gdalbuildvrt gdalwarp gdal2tiles.py python3; do
  command -v "$cmd" >/dev/null || { echo "missing required command: $cmd" >&2; exit 2; }
done
python3 - <<'PY'
import importlib.util
for name in ("osgeo","numpy"):
    if importlib.util.find_spec(name) is None:
        raise SystemExit(f"missing Python dependency: {name}")
PY

mkdir -p "$RAW" "$OUT"
rm -rf "$OUT/tiles"
mkdir -p "$OUT/tiles"

# Nepal is approximately 26.35–30.45 N, 80.05–88.20 E.
# The Copernicus AWS GLO-30 layout uses 1° cells named by the SW corner.
expected=0
downloaded=0
for lat in 26 27 28 29 30; do
  for lon in 80 81 82 83 84 85 86 87 88; do
    expected=$((expected + 1))
    ns=$(printf "N%02d_00" "$lat")
    ew=$(printf "E%03d_00" "$lon")
    name="Copernicus_DSM_COG_10_${ns}_${ew}_DEM"
    file="$RAW/${name}.tif"
    url="$BASE/${name}/${name}.tif"
    if [[ ! -s "$file" ]]; then
      tmp="$file.part"
      rm -f "$tmp"
      echo "download $name"
      curl --fail --location --retry 3 --retry-all-errors --connect-timeout 20 --max-time 600 "$url" -o "$tmp"
      mv "$tmp" "$file"
    fi
    downloaded=$((downloaded + 1))
  done
done

if [[ "$downloaded" -ne "$expected" ]]; then
  echo "expected $expected Copernicus tiles, have $downloaded; refusing partial terrain build" >&2
  exit 3
fi

VRT="$WORK/copernicus-nepal.vrt"
PROJECTED="$WORK/copernicus-nepal-3857.tif"
RGB="$WORK/copernicus-nepal-terrain-rgb.tif"

gdalbuildvrt -overwrite "$VRT" "$RAW"/*.tif

# Crop slightly beyond Nepal so edge interpolation remains stable.
# Bilinear interpolation happens on scalar elevation values before RGB encoding.
gdalwarp -overwrite -multi -wo NUM_THREADS=ALL_CPUS \
  -t_srs EPSG:3857 -r bilinear \
  -te_srs EPSG:4326 -te 79.9 26.2 88.4 30.7 \
  -dstnodata -9999 \
  -co TILED=YES -co COMPRESS=DEFLATE -co PREDICTOR=3 -co BIGTIFF=IF_SAFER \
  "$VRT" "$PROJECTED"

python3 "$ROOT/scripts/explore/nepal/copernicus_dem_rgb.py" "$PROJECTED" "$RGB"

# Nearest-neighbour is deliberate after Terrain-RGB encoding.
gdal2tiles.py --xyz --webviewer=none -r near -z "$ZOOMS" --processes "$PROCESSES" "$RGB" "$OUT/tiles"

cat > "$OUT/tilejson.json" <<JSON
{
  "tilejson": "3.0.0",
  "name": "AafnaiPatro Nepal terrain — Copernicus DEM GLO-30",
  "description": "Same-origin Terrain-RGB derived from Copernicus DEM GLO-30 public COG tiles.",
  "scheme": "xyz",
  "tiles": ["/data/nepalmap/dem/tiles/{z}/{x}/{y}.png"],
  "minzoom": 5,
  "maxzoom": 13,
  "bounds": [79.9, 26.2, 88.4, 30.7],
  "attribution": "${ATTRIBUTION}",
  "encoding": "mapbox"
}
JSON

cat > "$OUT/manifest.json" <<JSON
{
  "dataset_id": "nepalmap-copernicus-dem-glo30-v1",
  "source": {
    "name": "Copernicus DEM GLO-30 Public",
    "aws_registry": "https://registry.opendata.aws/copernicus-dem/",
    "documentation": "https://copernicus-dem-30m.s3.amazonaws.com/readme.html",
    "doi": "10.5270/ESA-c5d3d65",
    "license": "Copernicus WorldDEM-30 licence"
  },
  "input": {
    "bucket": "https://copernicus-dem-30m.s3.amazonaws.com",
    "tile_pattern": "Copernicus_DSM_COG_10_[Nxx_00]_[Exxx_00]_DEM",
    "tile_count": ${downloaded},
    "bbox": [79.9, 26.2, 88.4, 30.7]
  },
  "output": {
    "format": "Mapbox Terrain-RGB PNG XYZ",
    "minzoom": 5,
    "maxzoom": 13,
    "tilejson": "/data/nepalmap/dem/tilejson.json"
  },
  "attribution": "${ATTRIBUTION}",
  "liability_notice": "${LIABILITY}",
  "note": "Copernicus DEM is a DSM (top-reflective surface), not a bare-earth DTM. AafnaiPatro route elevation is approximate and is not a trail-safety measure."
}
JSON

cat > "$OUT/NOTICE.txt" <<TXT
${ATTRIBUTION}

${LIABILITY}

Copernicus DEM GLO-30 DOI: 10.5270/ESA-c5d3d65
Collection: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
Public COG distribution: https://registry.opendata.aws/copernicus-dem/
TXT

echo "Copernicus terrain build complete: $OUT"
echo "Set NEPALMAP_TERRAIN=1"
echo "Set NEPALMAP_DEM_TILEJSON=/data/nepalmap/dem/tilejson.json"
echo "Set NEPALMAP_DEM_ATTRIBUTION='$ATTRIBUTION'"
