#!/usr/bin/env python3
"""Ward, village and landmark data for the /nepal pages, from OpenStreetMap.

Reads the Geofabrik Nepal extract (one .osm.pbf file) and writes compact JSON under data/explore/nepal/:

  osm-admin.json        palika and ward geometry facts (centre point, area, neighbouring wards), district
                        headquarters points, keyed by the local-states-nepal ids the explore pages already use
  osm-settlements.json  every named city, town, village, hamlet and neighbourhood with its palika and ward
  osm-pois.json         named schools, health posts, temples, offices, banks, peaks, lakes... with palika and ward
  osm-report.json       coverage report: admin levels found, palika matching, ward coverage, unmatched names

How places are assigned: each OSM palika boundary is matched to one of the 753 local levels in
data/explore/places/source (same district, closest name in English or Nepali). Ward boundaries are assigned
to the palika that contains them and numbered from their `ward`/`ref` tag or the number in their name
("Chainpur-08", "वडा नं. ८"). Points (villages, schools...) are then placed in a ward by point-in-polygon.
Nothing is guessed: a point outside every ward boundary keeps only its palika or district.

Pure Python + pyosmium (`pip install osmium`); runs in about 10 minutes in GitHub Actions.
  python scripts/explore/nepal/osm_wards.py --pbf nepal-latest.osm.pbf [--out data/explore/nepal]

Data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import difflib
import json
import math
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "data/explore/places/source"

SETTLEMENT = ("city", "town", "village", "suburb", "quarter", "neighbourhood", "hamlet", "locality", "isolated_dwelling")
NE_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def notice(kind: str, title: str, text: str) -> None:
    """GitHub annotation (visible on the run page without log access) + plain print locally."""
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::{kind} title={title}::{text.replace(chr(10), ' ')[:3000]}")
    else:
        print(f"[{kind}] {title}: {text}")


# ----------------------------------------------------------------------------------------------------------
# Landmark categories (named features only)
# ----------------------------------------------------------------------------------------------------------
RELIGION = {"hindu": "hindu", "buddhist": "buddhist", "muslim": "muslim", "christian": "christian", "sikh": "sikh", "jain": "jain",
            "kirant": "kirat", "kirati": "kirat", "kirat": "kirat", "bon": "bon", "animist": "other"}


def poi_sub(cat: str, t) -> str:
    """Finer kind used by the map filters: religion for places of worship, amenity/healthcare/tourism value otherwise."""
    if cat == "worship":
        if t.get("historic") == "monastery" and not t.get("religion"):
            return "buddhist"
        return RELIGION.get(str(t.get("religion") or "").lower(), "other" if t.get("religion") else "")
    if cat == "school":
        return t.get("amenity") or ""
    if cat == "health":
        return t.get("amenity") if t.get("amenity") in ("hospital", "clinic", "doctors") else (t.get("healthcare") or t.get("amenity") or "")
    if cat == "sight":
        return t.get("tourism") or t.get("historic") or t.get("natural") or ""
    if cat == "stay":
        return t.get("tourism") or ""
    if cat == "park":
        return t.get("boundary") or t.get("leisure") or ""
    return ""


def poi_category(t) -> str | None:
    a, h, tour, hist, nat = t.get("amenity"), t.get("healthcare"), t.get("tourism"), t.get("historic"), t.get("natural")
    if a in ("school", "college", "university", "kindergarten"):
        return "school"
    if a in ("hospital", "clinic", "doctors", "health_post") or h in ("hospital", "clinic", "centre", "health_post", "doctor", "birthing_centre"):
        return "health"
    if a == "place_of_worship" or hist == "monastery":
        return "worship"
    if a == "townhall" or t.get("office") == "government":
        return "office"
    if a in ("bank",):
        return "bank"
    if a == "police":
        return "police"
    if a == "post_office":
        return "post"
    if a == "marketplace":
        return "market"
    if a == "bus_station":
        return "bus"
    if t.get("aeroway") in ("aerodrome", "airport"):
        return "airport"
    if nat in ("peak", "volcano"):
        return "peak"
    if nat == "water" and t.get("water") in (None, "lake", "pond", "reservoir", "oxbow") or t.get("water") == "lake":
        return "lake"
    if t.get("waterway") == "waterfall" or nat == "waterfall":
        return "waterfall"
    if tour in ("attraction", "viewpoint", "museum", "zoo") or hist in ("fort", "palace", "archaeological_site", "ruins", "castle", "monument") \
            or nat in ("cave_entrance", "hot_spring"):
        return "sight"
    if tour in ("hotel", "guest_house", "hostel", "motel"):
        return "stay"
    if t.get("leisure") in ("park", "nature_reserve") or t.get("boundary") in ("national_park", "protected_area"):
        return "park"
    return None


# ----------------------------------------------------------------------------------------------------------
# Geometry (lon, lat) — no GIS libraries
# ----------------------------------------------------------------------------------------------------------
def inside(lon: float, lat: float, ring) -> bool:
    res = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi:
            res = not res
        j = i
    return res


def ring_area_km2(ring) -> float:
    lat0 = sum(y for _, y in ring) / len(ring)
    kx, ky = 111.320 * math.cos(math.radians(lat0)), 110.574
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        s += (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky)
    return abs(s) / 2


def rep_point(rings) -> tuple[float, float]:
    """A point guaranteed inside the largest ring: centroid if inside, else the middle of the widest
    inside span on the horizontal line through the centroid."""
    ring = max(rings, key=ring_area_km2)
    a = cx = cy = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        f = x1 * y2 - x2 * y1
        a += f
        cx += (x1 + x2) * f
        cy += (y1 + y2) * f
    if abs(a) > 1e-14:
        cx, cy = cx / (3 * a), cy / (3 * a)
    else:
        cx, cy = sum(x for x, _ in ring) / len(ring), sum(y for _, y in ring) / len(ring)
    if inside(cx, cy, ring):
        return cx, cy
    xs = []
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        if (y1 > cy) != (y2 > cy):
            xs.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
    xs.sort()
    best = None
    for i in range(0, len(xs) - 1, 2):
        if best is None or xs[i + 1] - xs[i] > best[1] - best[0]:
            best = (xs[i], xs[i + 1])
    if best:
        return (best[0] + best[1]) / 2, cy
    return ring[0]


def km(lat1, lon1, lat2, lon2) -> float:
    p = math.pi / 180
    a = 0.5 - math.cos((lat2 - lat1) * p) / 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    return 12742 * math.asin(math.sqrt(a))


class Grid:
    """Bounding-box grid index (0.1° cells) over polygons."""

    def __init__(self, polys: list[dict]):
        self.polys = polys
        self.cells: dict[tuple[int, int], list[int]] = collections.defaultdict(list)
        for i, p in enumerate(polys):
            x0, y0, x1, y1 = p["bbox"]
            for cx in range(int(math.floor(x0 * 10)), int(math.floor(x1 * 10)) + 1):
                for cy in range(int(math.floor(y0 * 10)), int(math.floor(y1 * 10)) + 1):
                    self.cells[(cx, cy)].append(i)

    def find(self, lon: float, lat: float) -> dict | None:
        for i in self.cells.get((int(math.floor(lon * 10)), int(math.floor(lat * 10))), ()):
            p = self.polys[i]
            x0, y0, x1, y1 = p["bbox"]
            if x0 <= lon <= x1 and y0 <= lat <= y1 and any(inside(lon, lat, r) for r in p["rings"]):
                return p
        return None


# ----------------------------------------------------------------------------------------------------------
# Names
# ----------------------------------------------------------------------------------------------------------
EN_NOISE = re.compile(
    r"\b(sub[\s-]*metropolitan|metropolitan|municipality|municipal|rural|city|gaun\s*palika|gaunpalika|gaupalika|nagarpalika|"
    r"upa\s*maha\s*nagarpalika|mahanagarpalika|nagar\s*palika|palika|district|council|office|ward|no|n)\b\.?", re.I)
NE_NOISE = re.compile(r"(उपमहानगरपालिका|महानगरपालिका|नगरपालिका|गाउँपालिका|गाउंपालिका|गाँउपालिका|गाउपालिका|जिल्ला|वडा|नं\.?|कार्यालय)")


def skeleton(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    s = EN_NOISE.sub(" ", s)
    s = re.sub(r"[^a-z]", "", s)
    for a, b in (("chh", "c"), ("ch", "c"), ("sh", "s"), ("aa", "a"), ("ee", "i"), ("oo", "u"), ("w", "b"), ("v", "b"), ("y", "e"), ("z", "j"), ("q", "k")):
        s = s.replace(a, b)
    s = s.replace("h", "")
    s = re.sub(r"(.)\1+", r"\1", s)
    return s


def ne_skeleton(s: str) -> str:
    s = unicodedata.normalize("NFC", str(s or "")).replace("ाे", "ो")
    s = NE_NOISE.sub("", s)
    s = s.replace("ँ", "ं").replace("़", "").replace("्", "")
    return re.sub(r"[^ऀ-ॿ]", "", s)


def similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if min(len(a), len(b)) >= 4 and (a in b or b in a):
        return 0.9  # "Doramba" in "Doramba Shailung", "Bardaghat" in "Nawalparasi West / Bardaghat Susta West"
    return difflib.SequenceMatcher(None, a, b).ratio()


def ward_number(tags: dict) -> int | None:
    for key in ("ward", "ward:number", "ref", "admin_ward"):
        v = str(tags.get(key) or "").translate(NE_DIGITS).strip()
        if re.fullmatch(r"\d{1,2}", v):
            return int(v)
    for key in ("name:en", "name", "name:ne", "official_name"):
        v = str(tags.get(key) or "").translate(NE_DIGITS)
        m = re.search(r"(?:ward|वडा)\s*(?:no\.?|number|नं\.?|न\.)?\s*[-:#]?\s*(\d{1,2})\b", v, re.I) or re.search(r"[-\s_/](\d{1,2})\s*$", v)
        if m:
            return int(m.group(1))
    return None


def strip_ward(name: str) -> str:
    name = str(name or "").translate(NE_DIGITS)
    name = re.sub(r"(?:ward|वडा)\s*(?:no\.?|number|नं\.?|न\.)?\s*[-:#]?\s*\d{1,2}\b", " ", name, flags=re.I)
    return re.sub(r"[-\s_/]*\d{1,2}\s*$", "", name).strip()


# ----------------------------------------------------------------------------------------------------------
# Read the extract
# ----------------------------------------------------------------------------------------------------------
TAG_KEEP = ("name", "name:en", "name:ne", "official_name", "alt_name", "ward", "ward:number", "ref", "admin_ward", "admin_level", "boundary", "place", "ele", "population", "is_in")


def read_pbf(path: Path):
    import osmium

    areas, points = [], []

    def keep(tags) -> dict:
        return {k: tags.get(k) for k in TAG_KEEP if tags.get(k) is not None}

    def add_point(kind, tags, lon, lat, osm_id):
        wiki = tags.get("wikipedia") or ""
        if wiki and not re.match(r"^(en|ne):", wiki):
            wiki = ""
        points.append({"kind": kind, "id": osm_id, "lon": round(lon, 6), "lat": round(lat, 6),
                       "sub": poi_sub(kind, tags) if kind != "settlement" else "", "wiki": wiki[:120],
                       "name": tags.get("name:en") or tags.get("name"), "name_ne": tags.get("name:ne") or "",
                       "raw_name": tags.get("name"), "place": tags.get("place"), "ele": tags.get("ele"), "population": tags.get("population")})

    class H(osmium.SimpleHandler):
        def node(self, n):
            t = n.tags
            if "name" not in t:
                return
            if t.get("place") in SETTLEMENT:
                add_point("settlement", t, n.location.lon, n.location.lat, f"n{n.id}")
            else:
                cat = poi_category(t)
                if cat:
                    add_point(cat, t, n.location.lon, n.location.lat, f"n{n.id}")

        def way(self, w):
            t = w.tags
            if "name" not in t or t.get("boundary") == "administrative":
                return
            cat = "settlement" if t.get("place") in SETTLEMENT else poi_category(t)
            if not cat:
                return
            pts = [(nd.lon, nd.lat) for nd in w.nodes if nd.location.valid()]
            if pts:
                add_point(cat, t, sum(x for x, _ in pts) / len(pts), sum(y for _, y in pts) / len(pts), f"w{w.id}")

        def area(self, a):
            t = a.tags
            if t.get("boundary") != "administrative" or t.get("admin_level") not in tuple(str(i) for i in range(3, 12)):
                return
            rings = []
            for ring in a.outer_rings():
                pts = [(round(nd.lon, 6), round(nd.lat, 6)) for nd in ring if nd.location.valid()]
                if len(pts) >= 4:
                    if pts[0] != pts[-1]:
                        pts.append(pts[0])
                    rings.append(pts)
            if not rings:
                return
            xs = [x for r in rings for x, _ in r]
            ys = [y for r in rings for _, y in r]
            areas.append({"id": ("w" if a.from_way() else "r") + str(a.orig_id()), "level": int(t.get("admin_level")),
                          "tags": keep(t), "rings": rings, "bbox": (min(xs), min(ys), max(xs), max(ys))})

    H().apply_file(str(path), locations=True, idx="flex_mem")
    stamp = None
    try:
        hdr = osmium.io.Reader(str(path), osmium.osm.osm_entity_bits.NOTHING).header()
        stamp = hdr.get("osmosis_replication_timestamp") or None
    except Exception:  # noqa: BLE001 — the timestamp is only informative
        pass
    return areas, points, stamp


# ----------------------------------------------------------------------------------------------------------
# Local-states data (the ids every explore page uses)
# ----------------------------------------------------------------------------------------------------------
def load_source():
    def load(name):
        en = json.loads((SOURCE / name / "en.json").read_text("utf8"))
        ne = {r["id"]: r for r in json.loads((SOURCE / name / "np.json").read_text("utf8"))}
        for r in en:
            r["ne"] = ne.get(r["id"], {})
        return en
    return load("provinces"), load("districts"), load("municipalities")


# Spellings OSM uses for districts that the source spells differently.
DISTRICT_ALIASES = {
    "panchthar": "Pachthar", "tehrathum": "Terhathum", "terathum": "Terhathum", "parbat": "Parwat", "achham": "Acham",
    "ramechhap": "Ramechap", "rukum east": "Eastern Rukum", "eastern rukum": "Eastern Rukum", "rukum west": "Western Rukum",
    "western rukum": "Western Rukum", "nawalparasi east": "Nawalpur", "nawalpur": "Nawalpur", "nawalparasi west": "Parasi",
    "parasi": "Parasi", "kavrepalanchowk": "Kavrepalanchok", "kabhrepalanchok": "Kavrepalanchok", "sindhupalchowk": "Sindhupalchok",
    "chitawan": "Chitwan", "dhanusa": "Dhanusha", "kapilbastu": "Kapilvastu", "makawanpur": "Makwanpur", "tanahu": "Tanahun",
    "udaypur": "Udayapur", "syangja": "Syangja", "dang deukhuri": "Dang",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True, type=Path)
    ap.add_argument("--out", type=Path, default=ROOT / "data/explore/nepal")
    ap.add_argument("--levels", default="", help="force admin levels, e.g. district=6,palika=7,ward=9 (tests)")
    ap.add_argument("--min-palikas", type=int, default=300)
    args = ap.parse_args()

    provinces, districts, palikas = load_source()
    areas, points, stamp = read_pbf(args.pbf)
    print(f"read {len(areas)} admin areas, {len(points)} named points")

    by_level = collections.defaultdict(list)
    for a in areas:
        by_level[a["level"]].append(a)
    level_counts = {lv: len(v) for lv, v in sorted(by_level.items())}

    def pick(target, lo, hi):
        c = [(abs(len(v) - target), lv) for lv, v in by_level.items() if lo <= len(v) <= hi]
        return min(c)[1] if c else None

    lv_district = pick(77, 60, 100)
    lv_palika = pick(753, 450, 1200)
    lv_ward = pick(6743, 2000, 12000)
    forced = dict(kv.split("=") for kv in args.levels.split(",") if "=" in kv)
    lv_district = int(forced.get("district", lv_district or 0)) or None
    lv_palika = int(forced.get("palika", lv_palika or 0)) or None
    lv_ward = int(forced.get("ward", lv_ward or 0)) or None
    notice("notice", "OSM admin levels", f"counts={level_counts} district_level={lv_district} palika_level={lv_palika} ward_level={lv_ward}")

    report: dict = {"generated": dt.date.today().isoformat(), "osm_timestamp": stamp, "level_counts": level_counts,
                    "levels": {"district": lv_district, "palika": lv_palika, "ward": lv_ward},
                    "samples": {str(lv): [{"id": a["id"], **a["tags"]} for a in v[:12]] for lv, v in sorted(by_level.items())}}

    # ---- districts: OSM polygon -> source district id
    src_district_by_skel = {}
    for d in districts:
        src_district_by_skel[skeleton(d["name"])] = d
    for k, v in DISTRICT_ALIASES.items():
        d = next((x for x in districts if x["name"] == v), None)
        if d:
            src_district_by_skel[skeleton(k)] = d
    district_polys = []
    for a in by_level.get(lv_district, []):
        nm = re.sub(r"\s+district$", "", (a["tags"].get("name:en") or a["tags"].get("name") or ""), flags=re.I)
        d = src_district_by_skel.get(skeleton(nm))
        if not d:
            nes = ne_skeleton(a["tags"].get("name:ne") or a["tags"].get("name"))
            d = next((x for x in districts if ne_skeleton(x["ne"].get("name")) == nes), None)
        if not d:
            best = max(districts, key=lambda x: similarity(skeleton(x["name"]), skeleton(nm)))
            d = best if similarity(skeleton(best["name"]), skeleton(nm)) >= 0.8 else None
        if d:
            a["district_id"] = d["id"]
            district_polys.append(a)
    dgrid = Grid(district_polys)
    report["districts_matched"] = len({a["district_id"] for a in district_polys})
    report["districts_unmatched"] = {"source": [d["name"] for d in districts if d["id"] not in {a["district_id"] for a in district_polys}],
                                     "osm": [a["tags"].get("name:en") or a["tags"].get("name") for a in by_level.get(lv_district, []) if "district_id" not in a]}

    def district_at(lon, lat):
        p = dgrid.find(lon, lat)
        return p["district_id"] if p else None

    # ---- palikas: OSM polygon -> source palika id (same district, closest name)
    pal_by_district = collections.defaultdict(list)
    for m in palikas:
        pal_by_district[m["district_id"]].append(m)
    candidates = []
    osm_palikas = by_level.get(lv_palika, [])
    for a in osm_palikas:
        lon, lat = rep_point(a["rings"])
        a["rep"] = (lon, lat)
        did = district_at(lon, lat)
        a["district_id"] = did
        en = skeleton(a["tags"].get("name:en") or a["tags"].get("name"))
        ne = ne_skeleton(a["tags"].get("name:ne") or a["tags"].get("name"))
        for m in pal_by_district.get(did, palikas if did is None else []):
            s = max(similarity(en, skeleton(m["name"])), similarity(ne, ne_skeleton(m["ne"].get("name"))))
            if s >= 0.72:
                candidates.append((s, a["id"], m["id"]))
    candidates.sort(reverse=True)
    used_osm, palika_osm = set(), {}
    for s, oid, mid in candidates:
        if oid in used_osm or mid in palika_osm:
            continue
        used_osm.add(oid)
        palika_osm[mid] = oid
    osm_by_id = {a["id"]: a for a in osm_palikas}
    # Second pass, inside each district, for palikas renamed since the source was made (Sukidaha → Sunil Smriti...):
    # pair the leftovers by number of ward boundaries inside them (must equal the source ward count), then by name.
    ward_areas = by_level.get(lv_ward, []) if lv_ward else []
    ward_reps: list = []
    def wards_inside(a):
        if not ward_reps:
            ward_reps.extend(rep_point(w["rings"]) for w in ward_areas)
        g = Grid([a])
        x0, y0, x1, y1 = a["bbox"]
        return sum(1 for x, y in ward_reps if x0 <= x <= x1 and y0 <= y <= y1 and g.find(x, y))
    left_src = collections.defaultdict(list)
    for m in palikas:
        if m["id"] not in palika_osm:
            left_src[m["district_id"]].append(m)
    second = []
    for a in osm_palikas:
        if a["id"] in used_osm or a.get("district_id") not in left_src:
            continue
        n_wards = None
        for m in left_src[a["district_id"]]:
            if m["id"] in palika_osm:
                continue
            if n_wards is None:
                n_wards = wards_inside(a)
            same = n_wards == int(str(m["wards"]).replace(",", ""))
            score = max(similarity(skeleton(a["tags"].get("name:en") or a["tags"].get("name")), skeleton(m["name"])),
                        similarity(ne_skeleton(a["tags"].get("name:ne") or a["tags"].get("name")), ne_skeleton(m["ne"].get("name"))))
            if same or len(left_src[a["district_id"]]) == 1:
                second.append((same, score, a["id"], m["id"]))
    second.sort(reverse=True)
    for same, score, oid, mid in second:
        if oid in used_osm or mid in palika_osm:
            continue
        used_osm.add(oid)
        palika_osm[mid] = oid
        report.setdefault("palikas_second_pass", []).append(f"{osm_by_id[oid]['tags'].get('name')} → {next(m['name'] for m in palikas if m['id'] == mid)} (wards equal: {same})")
    matched_polys = []
    for mid, oid in palika_osm.items():
        a = osm_by_id[oid]
        a["palika_id"] = mid
        matched_polys.append(a)
    pgrid = Grid(matched_polys)
    report["palikas"] = {
        "source": len(palikas), "osm": len(osm_palikas), "matched": len(palika_osm),
        "unmatched_source": [f'{m["id"]}:{m["name"]}' for m in palikas if m["id"] not in palika_osm][:120],
        "unmatched_osm": [f'{a["id"]}:{a["tags"].get("name")}' for a in osm_palikas if a["id"] not in used_osm][:120],
    }
    notice("notice", "Palika matching", f'{len(palika_osm)} of {len(palikas)} local levels matched to OSM boundaries ({len(osm_palikas)} OSM palikas)')

    # ---- wards: assign to the containing palika, number from tags/name
    src_wards = {m["id"]: int(str(m["wards"]).replace(",", "")) for m in palikas}
    wards: dict[str, dict] = {}
    ward_problems = collections.Counter()
    ward_polys = []
    for a in by_level.get(lv_ward, []) if lv_ward else []:
        lon, lat = rep_point(a["rings"])
        p = pgrid.find(lon, lat)
        if not p:
            # No matched palika boundary here: use the palika name in the ward's own name ("Nepalgunj-05").
            did = district_at(lon, lat)
            base = skeleton(strip_ward(a["tags"].get("name:en") or a["tags"].get("name")))
            best = max(pal_by_district.get(did, []), key=lambda m: similarity(base, skeleton(m["name"])), default=None)
            if best is not None and similarity(base, skeleton(best["name"])) >= 0.8:
                p = {"palika_id": best["id"]}
                ward_problems["assigned-by-name"] += 1
            else:
                ward_problems["outside-matched-palika"] += 1
                continue
        n = ward_number(a["tags"])
        if not n or n > src_wards[p["palika_id"]]:
            ward_problems["no-or-bad-number"] += 1
            continue
        key = f'{p["palika_id"]}-{n}'
        area = sum(ring_area_km2(r) for r in a["rings"])
        if key in wards:
            # Two polygons with the same number: keep the bigger, count it.
            ward_problems["duplicate-number"] += 1
            if area <= wards[key]["a"]:
                continue
        a["ward_key"] = key
        wards[key] = {"c": [round(lat, 5), round(lon, 5)], "a": round(area, 2), "osm": a["id"]}
        ward_polys.append(a)
    ward_polys = [a for a in ward_polys if wards.get(a["ward_key"], {}).get("osm") == a["id"]]
    wgrid = Grid(ward_polys)

    # Neighbouring wards: boundaries that share at least two vertices.
    owners: dict[tuple[int, int], set] = collections.defaultdict(set)
    for a in ward_polys:
        for r in a["rings"]:
            for x, y in r[::1]:
                owners[(int(round(x * 1e5)), int(round(y * 1e5)))].add(a["ward_key"])
    shared = collections.Counter()
    for s in owners.values():
        if 1 < len(s) <= 6:
            ks = sorted(s)
            for i in range(len(ks)):
                for j in range(i + 1, len(ks)):
                    shared[(ks[i], ks[j])] += 1
    del owners
    nb = collections.defaultdict(set)
    for (k1, k2), c in shared.items():
        if c >= 2:
            nb[k1].add(k2)
            nb[k2].add(k1)
    for k, w in wards.items():
        w["nb"] = sorted(nb.get(k, ()), key=lambda s: tuple(int(x) for x in s.split("-")))

    complete = [m["id"] for m in palikas if all(f'{m["id"]}-{n}' in wards for n in range(1, src_wards[m["id"]] + 1))]
    total_src_wards = sum(src_wards.values())
    report["wards"] = {"source_total": total_src_wards, "osm_level_count": len(by_level.get(lv_ward, [])) if lv_ward else 0,
                       "matched": len(wards), "palikas_complete": len(complete), "problems": dict(ward_problems)}
    notice("notice", "Ward coverage", f"{len(wards)} of {total_src_wards} wards have an OSM boundary; {len(complete)} of {len(palikas)} palikas complete; problems={dict(ward_problems)}")

    # ---- points -> ward / palika / district
    def locate(lon, lat):
        w = wgrid.find(lon, lat)
        if w:
            pid, n = w["ward_key"].split("-")
            return int(pid), int(n), None
        p = pgrid.find(lon, lat)
        if p:
            return p["palika_id"], None, None
        return None, None, district_at(lon, lat)

    settlements, pois = [], []
    place_counts = collections.Counter()
    assigned = collections.Counter()
    for pt in points:
        pid, n, did = locate(pt["lon"], pt["lat"])
        if pid is None and did is None:
            continue  # outside Nepal (the extract has a small buffer)
        ele = None
        if pt.get("ele"):
            m = re.match(r"^\s*(\d{2,4}(?:\.\d+)?)\s*(m)?\s*$", str(pt["ele"]))
            ele = round(float(m.group(1))) if m else None
        pop = None
        if pt.get("population") and re.fullmatch(r"\d{1,8}", str(pt["population"]).replace(",", "")):
            pop = int(str(pt["population"]).replace(",", ""))
        name_ne = pt["name_ne"] or (pt["raw_name"] if re.search(r"[ऀ-ॿ]", pt["raw_name"] or "") else "")
        name = pt["name"] if not re.search(r"[ऀ-ॿ]", pt["name"] or "") else ""
        if not name and not name_ne:
            continue
        row = [name, name_ne if name_ne != name else "", round(pt["lat"], 5), round(pt["lon"], 5), ele, pid, n, did]
        if pt["kind"] == "settlement":
            place_counts[pt["place"]] += 1
            assigned["ward" if n else "palika" if pid else "district"] += 1
            settlements.append([pt["place"], *row, pop, pt["id"]])
        else:
            pois.append([pt["kind"], *row, pt["sub"], pt["id"], pt["wiki"]])

    # District headquarters point: the settlement in the district whose name matches the source headquarters.
    hq = {}
    pal_district = {m["id"]: m["district_id"] for m in palikas}
    by_district = collections.defaultdict(list)
    for s in settlements:  # [place, name, name_ne, lat, lng, ele, palika_id, ward, district_id, population]
        sdid = s[8] or pal_district.get(s[6])
        if sdid and s[0] in ("city", "town", "village", "suburb"):
            by_district[sdid].append(s)
    for d in districts:
        want = skeleton(d["headquarter"])
        best = None
        for s in by_district.get(d["id"], ()):
            sc = similarity(want, skeleton(s[1]))
            rank = {"city": 3, "town": 2, "suburb": 1}.get(s[0], 0)
            if sc >= 0.85 and (best is None or (sc, rank) > best[0]):
                best = ((sc, rank), s)
        if best:
            hq[str(d["id"])] = [best[1][3], best[1][4]]

    palika_out = {}
    for a in matched_polys:
        lon, lat = a["rep"]
        palika_out[str(a["palika_id"])] = {"c": [round(lat, 5), round(lon, 5)], "a": round(sum(ring_area_km2(r) for r in a["rings"]), 2), "osm": a["id"]}

    report["settlements"] = {"total": len(settlements), "by_place": dict(place_counts), "assigned": dict(assigned)}
    report["pois"] = {"total": len(pois), "by_category": dict(collections.Counter(p[0] for p in pois))}
    report["district_hq_points"] = len(hq)
    notice("notice", "Points", f"settlements={len(settlements)} {dict(place_counts)} assigned={dict(assigned)}; pois={len(pois)} {report['pois']['by_category']}")

    if len(palika_out) < args.min_palikas or len(settlements) < args.min_palikas * 3:
        notice("error", "Too little data", f"palikas={len(palika_out)} settlements={len(settlements)}; refusing to write")
        (args.out / "osm-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", "utf8")
        sys.exit(1)

    args.out.mkdir(parents=True, exist_ok=True)
    meta = {"generated": report["generated"], "osm_timestamp": stamp, "source": "OpenStreetMap via Geofabrik nepal-latest.osm.pbf",
            "licence": "© OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright"}
    settlements.sort(key=lambda r: (r[6] or 0, r[7] or 0, r[1] or r[2]))
    pois.sort(key=lambda r: (r[6] or 0, r[7] or 0, r[0], r[1] or r[2]))

    def dump(name, obj):
        text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        # one row per line keeps git diffs readable between monthly refreshes
        text = text.replace("],[", "],\n[")
        (args.out / name).write_text(text + "\n", "utf8")

    dump("osm-admin.json", {**meta, "palikas": palika_out, "wards": wards, "district_hq": hq})
    dump("osm-settlements.json", {**meta, "fields": ["place", "name", "name_ne", "lat", "lng", "ele", "palika_id", "ward", "district_id", "population", "osm_id"], "rows": settlements})
    dump("osm-pois.json", {**meta, "fields": ["category", "name", "name_ne", "lat", "lng", "ele", "palika_id", "ward", "district_id", "sub", "osm_id", "wikipedia"], "rows": pois})
    (args.out / "osm-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n", "utf8")
    print("wrote", ", ".join(f"{f.name} {f.stat().st_size // 1024} KB" for f in sorted(args.out.glob("osm-*.json"))))


if __name__ == "__main__":
    main()
