#!/usr/bin/env python3
"""Generate source-ID-mapped claim candidates; source-grounded model output is not final approval."""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.model_router import Router,ExhaustedProviders
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--sources",required=True);p.add_argument("--output",required=True)
 p.add_argument("--providers",default=str(ROOT/".."/"missionmangal"/"config"/"adapter-allowlist.json"))
 p.add_argument("--offline",action="store_true");a=p.parse_args()
 out_path=Path(a.output);out_path.parent.mkdir(parents=True,exist_ok=True)
 prior={}
 if out_path.exists():
  try:prior={v["id"]:v for v in json.loads(out_path.read_text(encoding="utf-8")).get("items",[])}
  except (ValueError,KeyError,TypeError):prior={}
 router=Router.from_file(a.providers);data=json.loads(Path(a.sources).read_text(encoding="utf-8"));out=[];blocked=0;processed=0
 def checkpoint():
  done={v["id"] for v in out}
  combined=out+[v for k,v in prior.items() if k not in done]
  out_path.write_text(json.dumps({"version":1,"items":combined,"blocked":blocked,"completed":processed,"note":"Claim mappings are machine-generated candidates. Independent source passage checks and human editorial approval remain mandatory."},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 for item in data.get("items",[]):
  old=prior.get(item["id"])
  if old and len(old.get("claims",[]))>=3 and len(old.get("sources",[]))>=5 and not a.offline:
   out.append(old);processed+=1
   if processed%10==0:checkpoint()
   continue
  sources=[s for s in item.get("sources",[]) if s.get("verified") and len(s.get("extract",""))>=80][:20]
  record={"id":item["id"],"title":item["title"],"url":item["url"],"primary_query":item["query"],"sources":sources,"media":[m for m in item.get("media",[]) if m.get("rights_verified")],"perspectives":[],"claims":[],"publishable":False,"blockers":[]}
  if len(sources)<5:
   record["blockers"].append("Fewer than five verified source passages; no claims generated")
   out.append(record);blocked+=1;processed+=1
  elif a.offline:
   record["blockers"].append("AI stage disabled by workflow input; no model calls made")
   out.append(record);blocked+=1;processed+=1
  else:
   allowed={s["id"] for s in sources}
   packet={"title":item["title"],"primary_query":item["query"],"sources":[{"id":s["id"],"title":s["title"],"publisher":s["publisher"],"url":s["url"],"extract":s["extract"][:5000]} for s in sources]}
   prompt='Return JSON only: {"claims":[{"id":"C1","text":"one factual claim supported by the provided passages","source_ids":["exact source id"]}],"perspectives":[{"angle":"...","question":"..."}]}. Create 5-10 concise claims only when a provided passage supports them. Each claim must cite one or more exact source IDs from the packet. Never add external facts, invented citations, numbers not in passages, or claim a source supports something it does not. No markdown fences. Packet: '+json.dumps(packet,ensure_ascii=False)
   try:
    result=router.complete("draft",[{"role":"system","content":"You are a cautious research editor. Output valid JSON only, grounded exclusively in the supplied source passages."},{"role":"user","content":prompt}])
    payload=json.loads(result["text"]);valid=[]
    for i,claim in enumerate(payload.get("claims",[])):
     ids=claim.get("source_ids",[])
     if claim.get("text") and ids and set(ids).issubset(allowed):
      valid.append({"id":claim.get("id") or "C"+str(i+1),"text":claim["text"],"source_ids":sorted(set(ids))})
    if len(valid)<3:raise ValueError("Model did not return at least three valid source-mapped claims")
    claimed={sid for claim in valid for sid in claim["source_ids"]}
    record["sources"]=[{**s,"claims_supported":[claim["id"] for claim in valid if s["id"] in claim["source_ids"]]} for s in sources if s["id"] in claimed]
    record["claims"]=valid;record["perspectives"]=payload.get("perspectives",[])
    record["provider"]=result.get("provider");record["model"]=result.get("model")
    if len(record["sources"])<5:record["blockers"].append("Fewer than five sources mapped to claims");blocked+=1
   except (ExhaustedProviders,ValueError,KeyError,TypeError,json.JSONDecodeError) as e:
    record["blockers"].append("Claim mapping unavailable or invalid: "+type(e).__name__);blocked+=1
   out.append(record);processed+=1
  if processed%10==0:checkpoint()
 checkpoint()
 print(f"Prepared perspectives for {len(out)} topics; {blocked} blocked for evidence/provider requirements.")
if __name__=="__main__":main()
