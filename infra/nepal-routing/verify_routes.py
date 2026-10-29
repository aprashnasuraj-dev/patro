#!/usr/bin/env python3
import argparse, json, math, os, sys, time
from datetime import datetime, timezone
from urllib import request, error

def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00","Z")

def http_json(url, token=None, payload=None, timeout=20):
    headers={"accept":"application/json"}
    data=None
    method="GET"
    if token:
        headers["authorization"]="Bearer "+token
    if payload is not None:
        method="POST"
        headers["content-type"]="application/json"
        data=json.dumps(payload,separators=(",",":")).encode()
    req=request.Request(url,data=data,headers=headers,method=method)
    started=time.perf_counter()
    try:
        with request.urlopen(req,timeout=timeout) as resp:
            raw=resp.read()
            elapsed=(time.perf_counter()-started)*1000
            return resp.status, elapsed, json.loads(raw.decode("utf-8"))
    except error.HTTPError as exc:
        body=exc.read(4096).decode("utf-8","replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {body}") from exc

def payload(points,costing):
    return {
        "locations":[{"lat":p["lat"],"lon":p["lon"],"type":"break"} for p in points],
        "costing":costing,
        "units":"kilometers",
        "format":"osrm",
        "shape_format":"geojson",
        "directions_type":"instructions",
        "banner_instructions":False,
        "voice_instructions":False,
        "alternates":0,
    }

def validate_route(data):
    routes=data.get("routes") if isinstance(data,dict) else None
    if not isinstance(routes,list) or not routes:
        raise ValueError("missing routes[0]")
    route=routes[0]
    geom=route.get("geometry")
    if not isinstance(geom,dict) or geom.get("type")!="LineString":
        raise ValueError("geometry is not GeoJSON LineString")
    coords=geom.get("coordinates")
    if not isinstance(coords,list) or len(coords)<2:
        raise ValueError("route geometry has fewer than two points")
    distance=route.get("distance")
    duration=route.get("duration")
    if not isinstance(distance,(int,float)) or not math.isfinite(distance) or distance<=0:
        raise ValueError("invalid route distance")
    if not isinstance(duration,(int,float)) or not math.isfinite(duration) or duration<=0:
        raise ValueError("invalid route duration")
    return route

def run_one(base,token,points,costing,max_ms):
    status,elapsed,data=http_json(base.rstrip("/")+"/route",token,payload(points,costing),timeout=max(20,int(max_ms/1000)+5))
    route=validate_route(data)
    if status!=200:
        raise ValueError(f"unexpected HTTP status {status}")
    if elapsed>max_ms:
        raise TimeoutError(f"route took {elapsed:.1f} ms > {max_ms} ms fixture budget")
    return {
        "http_status":status,
        "elapsed_ms":round(elapsed,1),
        "distance":route["distance"],
        "duration_s":route["duration"],
        "geometry_points":len(route["geometry"]["coordinates"]),
        "legs":len(route.get("legs") or []),
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--base",default="http://127.0.0.1:8002")
    ap.add_argument("--token",default=os.environ.get("NEPAL_ROUTING_TOKEN"))
    ap.add_argument("--health-path",default="/status")
    ap.add_argument("--fixtures",default=os.path.join(os.path.dirname(__file__),"fixtures","routes.json"))
    ap.add_argument("--output")
    args=ap.parse_args()

    with open(args.fixtures,encoding="utf-8") as f:
        spec=json.load(f)
    report={"schema_version":1,"started_at":iso_now(),"base":args.base,"health_path":args.health_path,"results":[]}
    failures=0
    try:
        status,elapsed,health=http_json(args.base.rstrip("/")+args.health_path,args.token,timeout=20)
        if status!=200:
            raise RuntimeError(f"health returned {status}")
        report["health"]={"http_status":status,"elapsed_ms":round(elapsed,1),"payload":health}
    except Exception as exc:
        report["health"]={"ok":False,"error":str(exc)}
        failures+=1

    for fixture in spec.get("fixtures",[]):
        row={"name":fixture["name"],"region":fixture.get("region"),"kind":fixture["kind"],"costing":fixture["costing"]}
        try:
            if fixture["kind"]=="route":
                row["route"]=run_one(args.base,args.token,fixture["points"],fixture["costing"],fixture.get("max_ms",15000))
            elif fixture["kind"]=="detour":
                base_result=run_one(args.base,args.token,fixture["base_points"],fixture["costing"],fixture.get("max_ms",15000))
                via_result=run_one(args.base,args.token,fixture["via_points"],fixture["costing"],fixture.get("max_ms",15000))
                added_duration=via_result["duration_s"]-base_result["duration_s"]
                row["base_route"]=base_result
                row["via_route"]=via_result
                row["detour"]={
                    "added_duration_s":added_duration,
                    "added_distance":via_result["distance"]-base_result["distance"],
                    "duration_ratio":round(via_result["duration_s"]/base_result["duration_s"],4),
                }
                if added_duration<0:
                    raise ValueError("detour fixture unexpectedly produced a faster via route; review fixture/data")
            else:
                raise ValueError("unknown fixture kind")
            row["ok"]=True
        except Exception as exc:
            row["ok"]=False
            row["error"]=str(exc)
            failures+=1
        report["results"].append(row)

    report["finished_at"]=iso_now()
    report["ok"]=failures==0
    report["failure_count"]=failures
    rendered=json.dumps(report,indent=2,ensure_ascii=False)+"\n"
    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)),exist_ok=True)
        with open(args.output,"w",encoding="utf-8") as f:
            f.write(rendered)
    print(rendered,end="")
    return 0 if failures==0 else 1

if __name__=="__main__":
    raise SystemExit(main())
