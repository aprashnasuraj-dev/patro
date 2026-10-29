#!/usr/bin/env python3
import argparse,datetime,json,math,subprocess,urllib.request
from pathlib import Path
ap=argparse.ArgumentParser()
ap.add_argument("--cache",default=".cache/nepalmap-dem-samples")
ap.add_argument("--out",default="docs/verification/nepal-elevation-samples.json")
args=ap.parse_args()
fixtures=[
 {"name":"Tribhuvan International Airport ARP","lat":27.6959917,"lon":85.3606093,"reference_m":1339.596,"reference":"CAAN AIP VNKT aerodrome elevation 4395 ft","source_url":"https://e-aip.caanepal.gov.np/_uploads/_pdf/3839761b7d9019fac9827f043f77fadc.pdf"},
 {"name":"Biratnagar Airport ARP","lat":26.4841667,"lon":87.2644444,"reference_m":73.8,"reference":"CAAN AIP VNVT aerodrome elevation 73.8 m","source_url":"https://e-aip.caanepal.gov.np/_uploads/_pdf/02c617f6b7858137b51bf6e92e5bb1c1.pdf"},
 {"name":"Pokhara International Airport ARP","lat":28.1838028,"lon":84.0148944,"reference_m":803.38,"reference":"CAAN AIP VNPR aerodrome elevation 803.38 m","source_url":"https://e-aip.caanepal.gov.np/_uploads/_pdf/299c69060acf48b2ddb5b98409dbba9e.pdf"},
 {"name":"Jomsom Airport RWY 24 threshold","lat":28.7822611,"lon":83.7262111,"reference_m":2743.005,"reference":"CAAN AIP AFIS RWY 24 threshold elevation 2743.005 m","source_url":"https://e-aip.caanepal.gov.np/_uploads/_pdf/8c5703aa00dc603d398a2df014583e39.pdf"}
]
cache=Path(args.cache);cache.mkdir(parents=True,exist_ok=True);base="https://copernicus-dem-30m.s3.amazonaws.com";results=[]
for f in fixtures:
 lat=float(f["lat"]);lon=float(f["lon"]);ilat=math.floor(lat);ilon=math.floor(lon)
 ns=f"N{ilat:02d}_00" if ilat>=0 else f"S{abs(ilat):02d}_00";ew=f"E{ilon:03d}_00" if ilon>=0 else f"W{abs(ilon):03d}_00"
 name=f"Copernicus_DSM_COG_10_{ns}_{ew}_DEM";path=cache/(name+".tif");url=f"{base}/{name}/{name}.tif"
 if not path.exists() or path.stat().st_size==0:
  tmp=path.with_suffix(".tif.part");urllib.request.urlretrieve(url,tmp);tmp.replace(path)
 raw=subprocess.check_output(["gdallocationinfo","-valonly","-wgs84",str(path),str(lon),str(lat)],text=True).strip().splitlines()
 value=float(raw[-1]);error=value-float(f["reference_m"])
 results.append({**f,"copernicus_tile":name,"copernicus_m":round(value,3),"error_m":round(error,3),"absolute_error_m":round(abs(error),3),"review":abs(error)>100})
abses=[r["absolute_error_m"] for r in results];rmse=math.sqrt(sum(r["error_m"]**2 for r in results)/len(results))
report={"schema_version":1,"generated_at":datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00","Z"),"source":"Copernicus DEM GLO-30 public COGs","reference_authority":"Civil Aviation Authority of Nepal (CAAN) AIP","samples":results,"summary":{"count":len(results),"mean_absolute_error_m":round(sum(abses)/len(abses),3),"max_absolute_error_m":round(max(abses),3),"rmse_m":round(rmse,3),"review_over_100m":sum(1 for r in results if r["review"])},"interpretation":"CAAN values are official aerodrome/threshold elevations. Copernicus GLO-30 is a DSM; differences can include surface representation, 30 m raster resolution and vertical-datum effects. Errors are reported, not silently calibrated away."}
Path(args.out).parent.mkdir(parents=True,exist_ok=True);json.dump(report,open(args.out,"w",encoding="utf-8"),indent=2,ensure_ascii=False);open(args.out,"a").write("\n")
print(json.dumps({"out":args.out,"summary":report["summary"],"samples":[{"name":r["name"],"error_m":r["error_m"]} for r in results]},indent=2))
