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
    python tools/osm_import.py --pbf nepal-latest.osm.pbf   # Geofabrik extract (preferred)

The preferred source is the Geofabrik Nepal extract
(https://download.geofabrik.de/asia/nepal-latest.osm.pbf, about 100 MB),
read with pyosmium: no query server is involved, and district/province
boundaries come from the same file. Overpass is the fallback.

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
import collections
import json
import os
import time
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

PROVINCE_ALIASES = {"koshi": "Koshi", "province no. 1": "Koshi", "madhesh": "Madhesh", "province no. 2": "Madhesh",
                    "bagmati": "Bagmati", "bagamati": "Bagmati", "gandaki": "Gandaki", "lumbini": "Lumbini",
                    "karnali": "Karnali", "sudurpashchim": "Sudurpashchim", "sudurpaschim": "Sudurpashchim",
                    "far-western": "Sudurpashchim", "far western": "Sudurpashchim"}

PROVINCES_NE = {"Koshi": "कोशी", "Madhesh": "मधेश", "Bagmati": "बागमती", "Gandaki": "गण्डकी",
                "Lumbini": "लुम्बिनी", "Karnali": "कर्णाली", "Sudurpashchim": "सुदूरपश्चिम"}

NEPAL_AREA = '(area["ISO3166-1"="NP"][admin_level=2]; area(3600184633);)->.np;'

BOUNDARY_QUERY = f"""
[out:json][timeout:300];
{NEPAL_AREA}
relation["boundary"="administrative"]["admin_level"~"^(4|6)$"](area.np);
out tags geom qt;
"""

# Nepal spans roughly lon 80.0–88.3; querying in strips keeps each request small
# enough for the public Overpass servers.
STRIPS = [(80.0, 81.4), (81.4, 82.8), (82.8, 84.0), (84.0, 85.0), (85.0, 85.6), (85.6, 86.4), (86.4, 87.3), (87.3, 88.3)]


def strip_query(lon0: float, lon1: float) -> str:
    bbox = f"26.3,{lon0},30.5,{lon1}"
    return f"""
[out:json][timeout:180];
{NEPAL_AREA}
(
  nwr["amenity"="place_of_worship"]["name"](area.np)({bbox});
  nwr["historic"="monastery"]["name"](area.np)({bbox});
  node["natural"="peak"]["name"](area.np)({bbox});
  node["tourism"="viewpoint"]["name"](area.np)({bbox});
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
    data = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for attempt in range(3):
        if attempt:
            time.sleep(60 * attempt)
        for url in OVERPASS_ENDPOINTS:
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "aafnaipatro-places-importer/1.1 (+https://aafnaipatro.com)"})
                with urllib.request.urlopen(req, timeout=400) as r:
                    res = json.load(r)
                remark = res.get("remark", "")
                if not res.get("elements") or "error" in remark.lower():
                    raise RuntimeError(f"empty or failed result ({len(res.get('elements', []))} elements) {remark[:200]}")
                return res
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


def read_pbf(path: Path):
    """Read a Geofabrik .osm.pbf (or .osm) file into Overpass-style features
    plus administrative boundary rings. Requires `pip install osmium`."""
    import osmium

    feats, bounds, towns = [], [], []
    SETTLEMENT = {"city", "town", "village", "suburb", "quarter", "neighbourhood", "hamlet"}

    def wanted(tags) -> bool:
        if "name" not in tags:
            return False
        return (tags.get("amenity") == "place_of_worship" or tags.get("historic") == "monastery"
                or tags.get("natural") == "peak" or tags.get("tourism") == "viewpoint")

    class H(osmium.SimpleHandler):
        def node(self, n):
            if n.tags.get("place") in SETTLEMENT and "name" in n.tags:
                towns.append({"lat": n.location.lat, "lon": n.location.lon, "en": n.tags.get("name:en") or n.tags.get("name"),
                              "ne": n.tags.get("name:ne") or "", "rank": n.tags.get("place")})
            if wanted(n.tags):
                feats.append({"type": "node", "id": n.id, "lat": n.location.lat, "lon": n.location.lon,
                              "tags": {t.k: t.v for t in n.tags}})

        def way(self, w):
            t = w.tags
            if wanted(t) and t.get("natural") != "peak":
                pts = [(nd.lon, nd.lat) for nd in w.nodes if nd.location.valid()]
                if pts:
                    feats.append({"type": "way", "id": w.id, "center": {"lon": sum(x for x, _ in pts) / len(pts),
                                                                        "lat": sum(y for _, y in pts) / len(pts)},
                                  "tags": {k.k: k.v for k in t}})

        def area(self, a):
            t = a.tags
            if t.get("boundary") == "administrative" and t.get("admin_level") in ("4", "5", "6") and not a.from_way():
                members = []
                for ring in a.outer_rings():
                    geom = [{"lon": nd.lon, "lat": nd.lat} for nd in ring if nd.location.valid()]
                    if len(geom) >= 4:
                        members.append({"type": "way", "role": "outer", "geometry": geom})
                if members:
                    bounds.append({"type": "relation", "id": a.orig_id(), "members": members,
                                   "tags": {k.k: k.v for k in t}})
            elif wanted(t) and not a.from_way():
                pts = [(nd.lon, nd.lat) for r in a.outer_rings() for nd in r if nd.location.valid()]
                if pts:
                    feats.append({"type": "relation", "id": a.orig_id(),
                                  "center": {"lon": sum(x for x, _ in pts) / len(pts), "lat": sum(y for _, y in pts) / len(pts)},
                                  "tags": {k.k: k.v for k in t}})

    H().apply_file(str(path), locations=True)
    return {"elements": feats, "settlements": towns}, {"elements": bounds}


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
        low = prov.lower()
        prov = next((v for k, v in PROVINCE_ALIASES.items() if k in low), prov)
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


class Towns:
    """Nearest named settlement, used to tell apart places with generic names
    ("Hanuman Mandir, Gaur"). Grid buckets keep lookups fast."""
    CELL = 0.05

    def __init__(self, towns: list[dict]):
        self.grid: dict[tuple, list] = {}
        for t in towns:
            self.grid.setdefault((int(t["lat"] / self.CELL), int(t["lon"] / self.CELL)), []).append(t)

    def nearest(self, lat: float, lon: float, max_km: float = 8.0):
        ci, cj = int(lat / self.CELL), int(lon / self.CELL)
        best, bd = None, max_km
        for r in (1, 2):
            for i in range(ci - r, ci + r + 1):
                for j in range(cj - r, cj + r + 1):
                    for t in self.grid.get((i, j), ()):
                        d = haversine_km(lat, lon, t["lat"], t["lon"])
                        if d < bd:
                            best, bd = t, d
            if best:
                break
        return best


def norm_name(s: str) -> str:
    return re.sub(r"[^a-z0-9\u0900-\u097f]+", " ", s.lower()).strip()


def load_seed(path: Path, key: str) -> list[dict]:
    if not path.exists():
        return []
    return yaml.safe_load(path.read_text(encoding="utf-8"))[key]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from-file", type=Path)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out-dir", type=Path, default=ROOT / "data")
    ap.add_argument("--pbf", type=Path, help="Geofabrik nepal-latest.osm.pbf (preferred source)")
    ap.add_argument("--boundaries", type=Path, help="Saved Overpass boundary JSON (skip the live boundary query)")
    ap.add_argument("--no-boundaries", action="store_true", help="Do not assign districts")
    ap.add_argument("--save-raw", type=Path, help="Directory to keep the raw Overpass responses")
    args = ap.parse_args()

    braw_pbf = None
    try:
        if args.pbf:
            raw, braw_pbf = read_pbf(args.pbf)
        elif args.from_file:
            raw = json.loads(args.from_file.read_text())
        else:
            seen, elements = set(), []
            for i, (a, b) in enumerate(STRIPS, 1):
                part = fetch(strip_query(a, b))
                new = [e for e in part["elements"] if (e["type"], e["id"]) not in seen]
                seen.update((e["type"], e["id"]) for e in new)
                elements += new
                print(f"  strip {i}/{len(STRIPS)} lon {a}–{b}: {len(new)} features")
                time.sleep(5)
            raw = {"elements": elements}
    except RuntimeError as e:
        if os.environ.get("GITHUB_ACTIONS"):
            print(f"::error title=OpenStreetMap import failed::{str(e)[:400]}")
        raise SystemExit(1)
    elements = raw.get("elements", [])
    print(f"source: {len(elements)} features")
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::notice title=OpenStreetMap::{len(elements)} features read")
    regions = None
    if braw_pbf is not None and not args.no_boundaries:
        regions = Regions(braw_pbf)
    elif not args.no_boundaries:
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

    towns = Towns(raw.get("settlements", []))
    seed_peak_names = {slugify(re.sub(r"\(.*?\)|mount ", "", p["name_en"].lower())) for p in seed_peaks} | {p["id"] for p in seed_peaks}

    # pass 1: candidates
    cands = []
    for el in elements:
        tags = el.get("tags", {})
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        name_en = (tags.get("name:en") or tags.get("name") or "").strip()
        name_ne = tags.get("name:ne") or (tags.get("name") if re.search(r"[\u0900-\u097F]", tags.get("name", "")) else None)
        if not name_en:
            continue
        kind = kind_of(tags)
        lat, lon = float(lat), float(lon)
        if kind in ("peak", "viewpoint"):
            if any(haversine_km(lat, lon, p["lat"], p["lon"]) < 2.0 for p in seed_peaks):
                continue  # curated peak wins
            if slugify(name_en) in seed_peak_names and any(haversine_km(lat, lon, p["lat"], p["lon"]) < 15 for p in seed_peaks):
                continue
        elif any(haversine_km(lat, lon, p["lat"], p["lon"]) < 0.15 for p in seed_places):
            continue  # curated place wins
        loc = regions.locate(lat, lon) if regions else {}
        if regions and regions.districts and not loc.get("district"):
            continue   # outside Nepal (extracts include a margin beyond the border)
        cands.append({"el": el, "tags": tags, "lat": lat, "lon": lon, "en": name_en, "ne": name_ne, "kind": kind, "loc": loc})

    # pass 2: tell apart generic names with the nearest village/town, else the district
    counts = collections.Counter(norm_name(c["en"]) for c in cands if c["kind"] not in ("peak", "viewpoint"))
    for c in cands:
        if c["kind"] in ("peak", "viewpoint") or counts[norm_name(c["en"])] < 2:
            continue
        t = towns.nearest(c["lat"], c["lon"])
        d_en = c["loc"].get("district") or c["tags"].get("addr:district") or ""
        d_ne = c["loc"].get("district_ne") or d_en
        if t and norm_name(t["en"]) not in norm_name(c["en"]):
            c["en"] = f"{c['en']}, {t['en']}"
            if c["ne"]:
                c["ne"] = f"{c['ne']}, {t['ne'] or t['en']}"
        elif d_en:
            c["en"] = f"{c['en']}, {d_en}"
            if c["ne"]:
                c["ne"] = f"{c['ne']}, {d_ne}"

    places, peaks = [], []
    for c in cands:
        el, tags, kind, loc = c["el"], c["tags"], c["kind"], c["loc"]
        name_en, name_ne, lat, lon = c["en"], c["ne"], c["lat"], c["lon"]
        base = slugify(name_en if re.search(r"[A-Za-z]", name_en) else f"{kind}-{el['id']}")
        district = loc.get("district") or tags.get("addr:district") or tags.get("is_in:district") or ""
        sid = base if base not in seen_ids else f"{base}-{el['id']}"
        seen_ids.add(sid)
        common = {
            "id": sid,
            "name_en": name_en,
            "name_ne": name_ne or name_en,
            "lat": round(lat, 6),
            "lon": round(lon, 6),
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
            religion = (tags.get("religion") or "hindu").split(";")[0].strip().lower()
            fests = guess_festivals(f"{name_en} {name_ne or ''}", religion)
            if not fests:
                continue
            places.append({**common, "kind": kind, "religion": religion,
                           "deity_en": tags.get("deity", ""), "deity_ne": tags.get("deity", ""),
                           "elev_m": 0, "about_en": "", "about_ne": "", "tips_en": [], "tips_ne": [],
                           "festivals": [{"id": f} for f in fests]})
        if args.limit and len(places) + len(peaks) >= args.limit:
            break

    if len(places) < 100 and not args.from_file and not args.limit and not (args.pbf and args.pbf.suffix == ".osm"):
        msg = f"Only {len(places)} places imported; refusing to overwrite the data files."
        if os.environ.get("GITHUB_ACTIONS"):
            print(f"::error title=Import too small::{msg}")
        raise SystemExit(msg)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "places_osm.yaml").write_text(
        "# Generated by tools/osm_import.py — (c) OpenStreetMap contributors, ODbL 1.0\n"
        + yaml.safe_dump({"places": places}, allow_unicode=True, sort_keys=False), encoding="utf-8")
    (args.out_dir / "peaks_osm.yaml").write_text(
        "# Generated by tools/osm_import.py — (c) OpenStreetMap contributors, ODbL 1.0\n"
        + yaml.safe_dump({"peaks": peaks}, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(f"imported {len(places)} places of worship and {len(peaks)} peaks/viewpoints")
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::notice title=Imported::{len(places)} places of worship, {len(peaks)} peaks and viewpoints, "
              f"{sum(1 for p in places if p['district'])} with a district")


if __name__ == "__main__":
    main()
