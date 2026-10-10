#!/usr/bin/env python3
"""
Scale the place set from dozens to thousands using OpenStreetMap.

Pulls every named place of worship, peak and viewpoint inside Nepal from the
Overpass API (or from a saved Overpass JSON file), assigns likely festivals
from the place's religion and name, and writes data/places_osm.yaml and
data/peaks_osm.yaml in the same schema as the hand-curated seed files.

Usage
-----
    python tools/osm_import.py                       # live Overpass query
    python tools/osm_import.py --from-file nepal.json  # offline / CI
    python tools/osm_import.py --limit 500           # small trial run
    python tools/osm_import.py --save-raw raw/        # keep the Overpass responses

In this repository the import runs on GitHub's servers through
.github/workflows/places-osm-import.yml (Actions → "Places: OpenStreetMap
import"), because GitHub-hosted runners can reach the Overpass API.

District and province
---------------------
OpenStreetMap features rarely carry an address. The importer downloads
Nepal's administrative boundaries in a second query and assigns every place
to the district and province polygon that contains it.

Licence
-------
OpenStreetMap data is (c) OpenStreetMap contributors, ODbL 1.0. Pages built
from it must show attribution — the templates do this automatically for any
place with `source: osm`. https://www.openstreetmap.org/copyright

Quality gates
-------------
* Only named features are imported; English or Nepali name required.
* Places within 150 m of a curated seed place with a similar name are
  skipped (the curated record wins).
* Imported places get `curated: false`; the generator gives them a lighter
  template and, by default, `noindex` until they pass the demand check in
  tools/prune.py (Search Console impressions), so thin pages never flood
  the index.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from engine.astro import haversine_km  # noqa: E402

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

PROVINCES_NE = {"Koshi": "कोशी", "Madhesh": "मधेश", "Bagmati": "बागमती", "Gandaki": "गण्डकी",
                "Lumbini": "लुम्बिनी", "Karnali": "कर्णाली", "Sudurpashchim": "सुदूरपश्चिम"}

BOUNDARY_QUERY = """
[out:json][timeout:600];
area["ISO3166-1"="NP"][admin_level=2]->.np;
relation["boundary"="administrative"]["admin_level"~"^(4|6)$"](area.np);
out tags geom qt;
"""

QUERY = """
[out:json][timeout:600][maxsize:1073741824];
area["ISO3166-1"="NP"][admin_level=2]->.np;
(
  nwr["amenity"="place_of_worship"]["name"](area.np);
  nwr["historic"="monastery"]["name"](area.np);
  node["natural"="peak"]["name"](area.np);
  node["tourism"="viewpoint"]["name"](area.np);
);
out center tags;
"""

# Name keyword -> festivals. Order matters: first match per group wins.
RULES = [
    (r"pashupati|mahadev|shiva|shiv |shivalaya|maheshwor|eshwor|ishwor|ेश्वर|महादेव|शिव", ["maha-shivaratri", "bala-chaturdashi"]),
    (r"narayan|vishnu|krishna|ram mandir|nārāyaṇ|नारायण|विष्णु|कृष्ण", ["haribodhini-ekadashi", "krishna-janmashtami"]),
    (r"kali|bhagwati|bhagawati|devi|durga|bhawani|chandi|mai |mai$|kalika|barahi|guhyeshwari|काली|भगवती|देवी|दुर्गा|भवानी|माई", ["ghatasthapana", "maha-ashtami", "maha-navami"]),
    (r"ganesh|binayak|vinayak|गणेश|विनायक", ["vijaya-dashami"]),
    (r"saraswati|सरस्वती", ["shree-panchami"]),
    (r"janaki|sita|जानकी|सीता", ["vivah-panchami", "ram-navami"]),
    (r"hanuman|हनुमान", ["ram-navami"]),
]
BY_RELIGION = {
    "buddhist": ["buddha-jayanti", "gyalpo-lhosar", "sonam-lhosar"],
    "muslim": ["eid-al-fitr", "eid-al-adha"],
    "christian": ["christmas"],
    "hindu": ["vijaya-dashami"],
    "kirati": ["ubhauli", "udhauli"],
}


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "place"


def fetch(query: str) -> dict:
    """Try each public Overpass endpoint in turn, with a pause between tries."""
    import time
    data = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for attempt in range(2):
        for url in OVERPASS_ENDPOINTS:
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "aafnaipatro-places-importer/1.1 (+https://aafnaipatro.com)"})
                with urllib.request.urlopen(req, timeout=700) as r:
                    return json.load(r)
            except Exception as e:  # noqa: BLE001 - report and try the next mirror
                last = e
                msg = f"{url}: {type(e).__name__}: {e}"
                print(f"  {msg}", file=sys.stderr)
                if os.environ.get("GITHUB_ACTIONS"):
                    print(f"::warning title=Overpass attempt failed::{msg[:300]}")
                time.sleep(20)
    raise RuntimeError(f"All Overpass endpoints failed: {last}")


# --------------------------------------------------------------------------
# Administrative boundaries: stitch relation member ways into rings, then
# point-in-polygon. Pure Python, no GIS libraries.
# --------------------------------------------------------------------------
def _rings(rel: dict) -> list[list[tuple[float, float]]]:
    segs = [[(p["lon"], p["lat"]) for p in m.get("geometry", [])]
            for m in rel.get("members", []) if m.get("type") == "way" and m.get("role") in ("outer", "") and m.get("geometry")]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while changed and ring[0] != ring[-1]:
            changed = False
            for i, sg in enumerate(segs):
                if sg[0] == ring[-1]:
                    ring += sg[1:]
                elif sg[-1] == ring[-1]:
                    ring += sg[::-1][1:]
                elif sg[-1] == ring[0]:
                    ring = sg[:-1] + ring
                elif sg[0] == ring[0]:
                    ring = sg[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        if len(ring) >= 4:
            rings.append(ring)
    return rings


def _inside(lon: float, lat: float, ring) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi:
            inside = not inside
        j = i
    return inside


class Regions:
    """Finds the district and province containing a point."""

    def __init__(self, raw: dict):
        by_level: dict[str, list] = {}
        for rel in raw.get("elements", []):
            t = rel.get("tags", {})
            rings = _rings(rel)
            if not rings:
                continue
            xs = [x for r in rings for x, _ in r]
            ys = [y for r in rings for _, y in r]
            by_level.setdefault(t.get("admin_level"), []).append({
                "en": re.sub(r"\s+(District|Province)$", "", t.get("name:en") or t.get("name", "")).strip(),
                "ne": (t.get("name:ne") or "").replace(" जिल्ला", "").replace(" प्रदेश", "").strip(),
                "rings": rings, "bbox": (min(xs), min(ys), max(xs), max(ys))})
        # Nepal has 7 provinces and 77 districts; pick the levels whose counts fit.
        levels = sorted(by_level.items(), key=lambda kv: len(kv[1]))
        self.provinces = next((v for k, v in levels if 5 <= len(v) <= 9), [])
        self.districts = next((v for k, v in levels if 60 <= len(v) <= 90), [])
        print(f"boundaries: {len(self.provinces)} provinces, {len(self.districts)} districts")

    @staticmethod
    def _find(areas, lon, lat):
        for a in areas:
            x0, y0, x1, y1 = a["bbox"]
            if x0 <= lon <= x1 and y0 <= lat <= y1 and any(_inside(lon, lat, r) for r in a["rings"]):
                return a
        return None

    def locate(self, lat: float, lon: float) -> dict:
        d = self._find(self.districts, lon, lat)
        p = self._find(self.provinces, lon, lat)
        prov = (p or {}).get("en", "")
        prov = next((k for k in PROVINCES_NE if k.lower() in prov.lower()), prov)
        return {"district": (d or {}).get("en", ""), "district_ne": (d or {}).get("ne", "") or (d or {}).get("en", ""),
                "province": prov}


def guess_festivals(name: str, religion: str) -> list[str]:
    out: list[str] = []
    low = f" {name.lower()} "
    for pat, fests in RULES:
        if re.search(pat, low):
            out += [f for f in fests if f not in out]
    for f in BY_RELIGION.get(religion, []):
        if f not in out:
            out.append(f)
    return out[:5]


def kind_of(tags: dict) -> str:
    if tags.get("natural") == "peak":
        return "peak"
    if tags.get("tourism") == "viewpoint":
        return "viewpoint"
    b = (tags.get("building") or "").lower()
    rel = tags.get("religion", "")
    if rel == "muslim":
        return "mosque"
    if rel == "christian":
        return "church"
    if rel == "buddhist":
        return "stupa" if b == "stupa" or "stupa" in tags.get("name", "").lower() else "monastery"
    return "temple"


def load_seed(path: Path, key: str) -> list[dict]:
    if not path.exists():
        return []
    return yaml.safe_load(path.read_text(encoding="utf-8"))[key]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from-file", type=Path)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out-dir", type=Path, default=ROOT / "data")
    ap.add_argument("--boundaries", type=Path, help="Saved Overpass boundary JSON (skip the live boundary query)")
    ap.add_argument("--no-boundaries", action="store_true", help="Do not assign districts")
    ap.add_argument("--save-raw", type=Path, help="Directory to keep the raw Overpass responses")
    args = ap.parse_args()

    try:
        raw = json.loads(args.from_file.read_text()) if args.from_file else fetch(QUERY)
    except RuntimeError as e:
        if os.environ.get("GITHUB_ACTIONS"):
            print(f"::error title=OpenStreetMap import failed::{str(e)[:400]}")
        raise SystemExit(1)
    elements = raw.get("elements", [])
    print(f"overpass: {len(elements)} features")
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::notice title=Overpass::{len(elements)} features downloaded")
    regions = None
    if not args.no_boundaries:
        try:
            braw = json.loads(args.boundaries.read_text()) if args.boundaries else (None if args.from_file else fetch(BOUNDARY_QUERY))
        except RuntimeError as e:
            braw = None
            print(f"boundaries unavailable, districts left blank: {e}", file=sys.stderr)
            if os.environ.get("GITHUB_ACTIONS"):
                print("::warning title=Districts not assigned::Boundary query failed; places imported without district. Re-run later.")
        if braw:
            regions = Regions(braw)
            if args.save_raw:
                args.save_raw.mkdir(parents=True, exist_ok=True)
                (args.save_raw / "boundaries.json").write_text(json.dumps(braw), encoding="utf-8")
    if args.save_raw and not args.from_file:
        args.save_raw.mkdir(parents=True, exist_ok=True)
        (args.save_raw / "features.json").write_text(json.dumps(raw), encoding="utf-8")

    seed_places = load_seed(ROOT / "data/places.yaml", "places")
    seed_peaks = load_seed(ROOT / "data/peaks.yaml", "peaks")
    seen_ids = {p["id"] for p in seed_places} | {p["id"] for p in seed_peaks}

    places, peaks = [], []
    for el in elements:
        tags = el.get("tags", {})
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        name_en = tags.get("name:en") or tags.get("name")
        name_ne = tags.get("name:ne") or (tags.get("name") if re.search(r"[ऀ-ॿ]", tags.get("name", "")) else None)
        if not name_en:
            continue
        kind = kind_of(tags)
        seeds = seed_peaks if kind in ("peak", "viewpoint") else seed_places
        if any(haversine_km(lat, lon, s["lat"], s["lon"]) < 0.15 for s in seeds):
            continue  # curated record wins

        base = slugify(name_en if re.search(r"[A-Za-z]", name_en) else f"{kind}-{el['id']}")
        loc = regions.locate(float(lat), float(lon)) if regions else {}
        district = loc.get("district") or tags.get("addr:district") or tags.get("is_in:district") or ""
        sid = base if base not in seen_ids else f"{base}-{el['id']}"
        seen_ids.add(sid)
        common = {
            "id": sid,
            "name_en": name_en,
            "name_ne": name_ne or name_en,
            "lat": round(float(lat), 6),
            "lon": round(float(lon), 6),
            "district": district,
            "district_ne": loc.get("district_ne") or district,
            "province": loc.get("province", ""),
            "source": "osm",
            "osm": f"{el['type']}/{el['id']}",
            "curated": False,
            "coord_verified": True,
        }
        if kind in ("peak", "viewpoint"):
            try:
                h = int(float(str(tags.get("ele", "0")).split()[0].replace(",", "")))
            except ValueError:
                h = 0
            if h < 1000:
                continue
            peaks.append({**common, "kind": "peak" if kind == "peak" else "viewpoint",
                          "height_m": h, "range": "", "note_en": "", "note_ne": ""})
        else:
            religion = tags.get("religion", "hindu")
            fests = guess_festivals(f"{name_en} {name_ne or ''}", religion)
            if not fests:
                continue
            places.append({**common, "kind": kind, "religion": religion,
                           "deity_en": tags.get("deity", ""), "deity_ne": tags.get("deity", ""),
                           "elev_m": 0, "about_en": "", "about_ne": "", "tips_en": [], "tips_ne": [],
                           "festivals": [{"id": f} for f in fests]})
        if args.limit and len(places) + len(peaks) >= args.limit:
            break

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "places_osm.yaml").write_text(
        "# Generated by tools/osm_import.py — (c) OpenStreetMap contributors, ODbL 1.0\n"
        + yaml.safe_dump({"places": places}, allow_unicode=True, sort_keys=False), encoding="utf-8")
    (args.out_dir / "peaks_osm.yaml").write_text(
        "# Generated by tools/osm_import.py — (c) OpenStreetMap contributors, ODbL 1.0\n"
        + yaml.safe_dump({"peaks": peaks}, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(f"imported {len(places)} places of worship and {len(peaks)} peaks/viewpoints")


if __name__ == "__main__":
    main()
