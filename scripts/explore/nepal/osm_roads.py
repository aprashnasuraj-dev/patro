#!/usr/bin/env python3
"""Extract OSM road/trail metadata for Nepal Map route-quality and PMTiles layers.

Input: Geofabrik Nepal .osm.pbf.
Output: newline-delimited GeoJSON features suitable for tippecanoe >=2.17.

This does NOT claim a road is safe. It preserves OSM tags and derives a conservative
metadata quality class/warning vocabulary so the UI can say what is known vs unknown.
Data © OpenStreetMap contributors, ODbL 1.0.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path

KEEP = (
    "name","name:en","name:ne","ref","highway","surface","smoothness","tracktype",
    "sac_scale","trail_visibility","access","motor_vehicle","motorcar","foot","bicycle",
    "bridge","tunnel","ford","seasonal","winter_service","lit","maxspeed","lanes","oneway",
)

ROAD_TYPES = {
    "motorway","trunk","primary","secondary","tertiary","unclassified","residential",
    "service","living_street","track","path","footway","bridleway","cycleway","steps",
}

UNPAVED = {"unpaved","gravel","fine_gravel","compacted","ground","dirt","earth","sand","mud","grass","rock","pebblestone"}
POOR = {"very_bad","horrible","very_horrible","impassable"}

def quality(tags: dict) -> tuple[str, list[str], str]:
    h = tags.get("highway") or ""
    warnings: list[str] = []
    if tags.get("access") in {"no","private"} or tags.get("motor_vehicle") in {"no","private"}:
        warnings.append("restricted_access")
    if tags.get("ford") not in (None,"no"):
        warnings.append("ford")
    if tags.get("seasonal") == "yes":
        warnings.append("seasonal")
    if tags.get("surface") in UNPAVED:
        warnings.append("unpaved_surface")
    if tags.get("smoothness") in POOR:
        warnings.append("poor_smoothness")
    if tags.get("sac_scale"):
        warnings.append("mountain_hiking_scale")
    if h in {"track","path","footway","bridleway","steps"}:
        warnings.append("trail_or_track")
    if tags.get("bridge") not in (None,"no"):
        warnings.append("bridge")
    if tags.get("tunnel") not in (None,"no"):
        warnings.append("tunnel")

    known = sum(bool(tags.get(k)) for k in ("surface","smoothness","tracktype","sac_scale","access","motor_vehicle","maxspeed"))
    confidence = "high" if known >= 3 else "medium" if known >= 1 else "low"
    kind = "trail" if h in {"path","footway","bridleway","steps"} else "track" if h == "track" else "road"
    return confidence, warnings, kind

class Handler:
    def __init__(self, osmium, out):
        class H(osmium.SimpleHandler):
            def way(inner, w):
                t = w.tags
                h = t.get("highway")
                if h not in ROAD_TYPES:
                    return
                coords = [(round(n.lon,6),round(n.lat,6)) for n in w.nodes if n.location.valid()]
                if len(coords) < 2:
                    return
                tags = {k:t.get(k) for k in KEEP if t.get(k) is not None}
                confidence, warnings, kind = quality(tags)
                props = {
                    "osm_id": f"w{w.id}",
                    "kind": kind,
                    "metadata_confidence": confidence,
                    "warnings": ",".join(warnings),
                    **tags,
                }
                out.write(json.dumps({"type":"Feature","properties":props,"geometry":{"type":"LineString","coordinates":coords}},ensure_ascii=False,separators=(",",":"))+"\n")
        self.impl = H()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--pbf",required=True,type=Path)
    ap.add_argument("--out",required=True,type=Path)
    args=ap.parse_args()
    import osmium
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("w",encoding="utf8") as out:
        Handler(osmium,out).impl.apply_file(str(args.pbf),locations=True,idx="flex_mem")
    print(f"wrote {args.out} ({args.out.stat().st_size//1024} KB)")

if __name__=="__main__":
    main()
