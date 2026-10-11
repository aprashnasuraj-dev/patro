#!/usr/bin/env python3
"""Vendor the old VDC/municipality ward → new palika ward mapping used by the /nepal pages.

Source: https://github.com/en-shushant/nepal-address-data (CC0 1.0), file data/ward_mapping.csv. Only the
rows that come from the World Bank Nepal Poverty Team's 2011→2018 ward mapping (source = "wb_2011",
HLCIT-coded, all 3,954 pre-2017 VDCs and municipalities) are used; Nepali VDC names are joined from the same
file's "cg" rows where they exist. New palikas are matched to the local-states-nepal ids the explore pages use.

  git clone --depth 1 https://github.com/en-shushant/nepal-address-data /tmp/nad
  python scripts/explore/nepal/vendor_vdc.py /tmp/nad/data/ward_mapping.csv

Writes data/explore/nepal/vdc-wards.json and prints a matching report.
"""
from __future__ import annotations

import collections
import csv
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "data/explore/places/source"
OUT = ROOT / "data/explore/nepal/vdc-wards.json"
COLS = ("id norm_key fuzzy_key old_vdc old_vdc_np old_district old_district_np zone old_ward province new_district new_district_np "
        "new_palika new_palika_np palika_type new_ward new_ward_np old_vdc_code old_ward_code new_palika_code new_ward_code source").split()

# Mapping-file district spellings → local-states district names
DISTRICTS = {"Achham": "Acham", "Kavrepalanchowk": "Kavrepalanchok", "Nawalparasi East": "Nawalpur", "Nawalparasi West": "Parasi",
             "Panchthar": "Pachthar", "Parbat": "Parwat", "Ramechhap": "Ramechap", "Rukum East": "Eastern Rukum",
             "Rukum West": "Western Rukum", "Sindhupalchowk": "Sindhupalchok", "Tehrathum": "Terhathum"}
# Mapping-file palika names that differ too much from the local-states spelling to match by sound.
# Names the mapping file uses from the first (744-unit) structure that no longer exist are left unmatched on purpose.
PALIKA_NAMES = {("Gulmi", "Ruru"): "Rurukshetra", ("Kaski", "Pokhara Metropolitan"): "Pokhara", ("Doti", "Bogtan"): "Bogatan-Phudsil",
                ("Bajura", "Chhededaha"): "Khaptad Chhededaha", ("Sunsari", "Baraha"): "BarahaKshetra", ("Khotang", "Diprung"): "Diprung Chuichumma",
                ("Rasuwa", "Aamachodingmo"): "Parbatikunda"}
# HLCIT old-unit type digit
OLD_TYPE = {"1": "metropolitan", "2": "sub-metropolitan", "3": "municipality", "5": "vdc", "9": "protected-area"}


def skeleton(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z]", "", s)
    for a, b in (("chh", "c"), ("ch", "c"), ("sh", "s"), ("aa", "a"), ("ee", "i"), ("oo", "u"), ("w", "b"), ("v", "b"), ("y", "e"), ("z", "j")):
        s = s.replace(a, b)
    return re.sub(r"(.)\1+", r"\1", s.replace("h", ""))


def clean_old_name(name: str) -> str:
    name = re.sub(r"\s+M\.$", "", name.strip())                 # "Kathmandu M." → "Kathmandu"
    name = re.sub(r"\s*\(\s*", " (", name).replace(" )", ")")  # "Andheri(Narayansthan)" → "Andheri (Narayansthan)"
    name = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name)            # "GhartiGaun" → "Gharti Gaun"
    name = name.replace("Nartional", "National").replace("Royal ", "").replace("Shukla Phanta National Pa", "Shuklaphanta National Park")
    return re.sub(r"\s+", " ", name).strip(" .")


def main(csv_path: str) -> None:
    districts = json.loads((SOURCE / "districts/en.json").read_text("utf8"))
    palikas = json.loads((SOURCE / "municipalities/en.json").read_text("utf8"))
    did_by_name = {d["name"]: d["id"] for d in districts}
    pal_by_district = collections.defaultdict(list)
    for m in palikas:
        pal_by_district[m["district_id"]].append(m)

    rows = [dict(zip(COLS, r)) for r in csv.reader(open(csv_path, encoding="utf8"))]
    wb = [r for r in rows if r["source"] == "wb_2011"]
    ne_names = {}
    for r in rows:
        if r["source"] == "cg" and r["old_vdc_np"]:
            ne_names.setdefault((r["old_district"].lower(), r["fuzzy_key"]), r["old_vdc_np"])

    # New palika (district, name) → local-states id
    palika_id: dict[tuple[str, str], int | None] = {}
    unmatched = collections.Counter()
    for r in wb:
        key = (r["new_district"], r["new_palika"])
        if key in palika_id:
            continue
        did = did_by_name.get(DISTRICTS.get(r["new_district"], r["new_district"]))
        if did is None or r["palika_type"] in ("National Park", "Watershed and Wildlife Reserve", "Hunting Reserve", "Wildlife Reserve", "Development Area"):
            palika_id[key] = None
            continue
        sk = skeleton(PALIKA_NAMES.get(key, r["new_palika"]))
        best = max(pal_by_district[did], key=lambda m: difflib.SequenceMatcher(None, sk, skeleton(m["name"])).ratio())
        score = difflib.SequenceMatcher(None, sk, skeleton(best["name"])).ratio()
        palika_id[key] = best["id"] if score >= 0.7 else None
        if score < 0.7:
            unmatched[f'{r["new_district"]}/{r["new_palika"]} (best {best["name"]} {score:.2f})'] += 1
    # Two mapping-file palikas must not land on the same local-states palika.
    seen = collections.defaultdict(list)
    for k, v in palika_id.items():
        if v:
            seen[v].append(k)
    clashes = {v: ks for v, ks in seen.items() if len(ks) > 1}

    vdcs: dict[tuple[str, str], dict] = {}
    for r in wb:
        code = r["old_vdc_code"]
        vkey = (r["old_district"], code or r["old_vdc"])
        v = vdcs.get(vkey)
        if not v:
            v = vdcs[vkey] = {"name": clean_old_name(r["old_vdc"]), "ne": ne_names.get((r["old_district"].lower(), r["fuzzy_key"]), ""),
                              "old_district": r["old_district"], "type": OLD_TYPE.get(code.split()[4] if code else "", "vdc"),
                              "code": code, "wards": collections.defaultdict(set), "districts": collections.Counter(), "other": set()}
        pid = palika_id.get((r["new_district"], r["new_palika"]))
        did = did_by_name.get(DISTRICTS.get(r["new_district"], r["new_district"]))
        if did:
            v["districts"][did] += 1
        try:
            ow, nw = int(r["old_ward"]), int(r["new_ward"])
        except ValueError:
            continue
        if pid:
            v["wards"][ow].add((pid, nw))
        else:
            v["other"].add(f'{r["new_palika"]} {r["palika_type"]}'.strip())

    out = []
    for v in vdcs.values():
        if not v["districts"]:
            continue
        out.append({"d": v["districts"].most_common(1)[0][0], "n": v["name"], "ne": v["ne"], "t": v["type"], "od": v["old_district"], "code": v["code"],
                    "w": {str(k): sorted(s) for k, s in sorted(v["wards"].items())}, **({"x": sorted(v["other"])} if v["other"] else {})})
    out.sort(key=lambda x: (x["d"], x["n"]))
    meta = {"source": "World Bank Nepal Poverty Team ward mapping 2011→2018, via en-shushant/nepal-address-data (CC0 1.0)",
            "source_url": "https://github.com/en-shushant/nepal-address-data", "licence": "CC0 1.0",
            "fields": {"d": "local-states district id (where most of its wards went)", "n": "old name", "ne": "old name in Nepali",
                       "t": "old unit type", "od": "old district", "code": "HLCIT code", "w": "old ward → [[palika_id, new ward], ...]",
                       "x": "parts that went to a national park or reserve"}}
    text = json.dumps({**meta, "vdcs": out}, ensure_ascii=False, separators=(",", ":")).replace('},{"d"', '},\n{"d"')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text + "\n", "utf8")
    mapped = sum(1 for v in out if v["w"])
    covered = {(p, w) for v in out for s in v["w"].values() for p, w in s}
    print(f"{len(out)} old units ({collections.Counter(v['t'] for v in out)}), {mapped} with ward mapping, "
          f"{sum(1 for v in out if v['ne'])} with Nepali names; new wards covered: {len(covered)}; "
          f"palikas covered: {len({p for p, _ in covered})}/753; unmatched palikas: {len(unmatched)}; clashes: {len(clashes)}")
    for k in list(unmatched)[:40]:
        print("  unmatched", k)
    for v, ks in list(clashes.items())[:20]:
        print("  clash", v, ks)
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1])
