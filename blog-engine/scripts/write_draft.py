#!/usr/bin/env python3
"""Draft only when reviewed provider adapters and verified evidence packets exist."""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from engine.model_router import Router,ExhaustedProviders
from engine.ledger import transition,load
def main():
 p=argparse.ArgumentParser();p.add_argument("--perspectives",required=True);p.add_argument("--output",required=True);p.add_argument("--providers",default=str(ROOT/".."/"missionmangal"/"config"/"adapter-allowlist.json"));p.add_argument("--ledger",default=str(ROOT/"data"/"article_ledger.jsonl"));a=p.parse_args()
 router=Router.from_file(a.providers);data=json.loads(Path(a.perspectives).read_text(encoding="utf-8"));out=Path(a.output);out.mkdir(parents=True,exist_ok=True);latest=load(a.ledger);made=blocked=0
 for item in data.get("items",[]):
  # Deliberately require reviewed, source-mapped claims before spending model calls.
  sources=item.get("sources",[]);claims=item.get("claims",[])
  if not (5<=len(sources)<=20 and claims and all(s.get("verified") and s.get("extract") and s.get("rights_verified") for s in sources)):
   blocked+=1;continue
  try:
   result=router.complete("draft",[{"role":"system","content":"Write original, helpful English using only the supplied source passages. Cite source IDs for each factual claim. Do not invent details, citations, quotations, or media."},{"role":"user","content":json.dumps(item,ensure_ascii=False)}])
   doc={**item,"draft":result["text"],"provider":result["provider"],"model":result["model"],"status":"draft","publishable":False}
   (out/(item["id"]+".json")).write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");made+=1
  except ExhaustedProviders:blocked+=1
 print(f"Drafts created: {made}; blocked for evidence/provider: {blocked}")
if __name__=="__main__":main()
