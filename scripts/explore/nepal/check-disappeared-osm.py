#!/usr/bin/env python3
import argparse,json,time,urllib.request,urllib.error,xml.etree.ElementTree as ET
from pathlib import Path
ap=argparse.ArgumentParser()
ap.add_argument("--triage",required=True)
ap.add_argument("--out",required=True)
args=ap.parse_args()
triage=json.load(open(args.triage,encoding="utf-8"))
kind={"n":"node","w":"way","r":"relation"}
rows=[]
for item in triage.get("disappeared",[]):
    sid=str(item["source_id"]); typ=kind.get(sid[:1]); oid=sid[1:]
    row={"source_id":sid,"before":item.get("before"),"osm_type":typ,"osm_id":oid}
    if not typ or not oid.isdigit():
        row["status"]="invalid_source_id";rows.append(row);continue
    url=f"https://api.openstreetmap.org/api/0.6/{typ}/{oid}"
    req=urllib.request.Request(url,headers={"User-Agent":"AafnaiPatro-roadmap-QA/1.0","Accept":"application/xml"})
    try:
        with urllib.request.urlopen(req,timeout=20) as resp:
            raw=resp.read();row["http_status"]=resp.status
        root=ET.fromstring(raw)
        obj=root.find(typ)
        tags={x.attrib.get("k",""):x.attrib.get("v","") for x in (obj.findall("tag") if obj is not None else [])}
        row.update({"status":"exists","visible":obj.attrib.get("visible","true") if obj is not None else None,"version":int(obj.attrib.get("version","0")) if obj is not None else None,"timestamp":obj.attrib.get("timestamp") if obj is not None else None,"current_name":tags.get("name") or tags.get("name:en") or tags.get("name:ne"),"current_tags":tags})
    except urllib.error.HTTPError as exc:
        row["http_status"]=exc.code
        row["status"]="deleted_or_unavailable" if exc.code in (404,410) else "http_error"
    except Exception as exc:
        row["status"]="request_error";row["error"]=str(exc)
    rows.append(row);time.sleep(0.6)
report={"schema_version":1,"checked_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"api":"OpenStreetMap API 0.6","objects":rows,"summary":{}}
for r in rows: report["summary"][r["status"]]=report["summary"].get(r["status"],0)+1
Path(args.out).parent.mkdir(parents=True,exist_ok=True)
json.dump(report,open(args.out,"w",encoding="utf-8"),indent=2,ensure_ascii=False);open(args.out,"a").write("\n")
print(json.dumps({"out":args.out,"summary":report["summary"],"objects":[{"source_id":r["source_id"],"status":r["status"],"http_status":r.get("http_status"),"current_name":r.get("current_name")} for r in rows]},indent=2,ensure_ascii=False))
