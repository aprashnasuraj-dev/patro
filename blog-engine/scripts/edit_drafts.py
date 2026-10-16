#!/usr/bin/env python3
"""Optional editorial pass that must preserve claims, citations, and source IDs."""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from engine.model_router import Router,ExhaustedProviders
def main():
 p=argparse.ArgumentParser();p.add_argument("--input",required=True);p.add_argument("--providers",default=str(ROOT/".."/"missionmangal"/"config"/"adapter-allowlist.json"));a=p.parse_args()
 router=Router.from_file(a.providers);root=Path(a.input);files=sorted(root.glob("*.json")) if root.exists() else [];edited=blocked=skipped=0
 for file in files:
  try:item=json.loads(file.read_text(encoding="utf-8"))
  except (OSError,ValueError):blocked+=1;continue
  if item.get("edited_draft"):skipped+=1;continue
  if not item.get("draft") or not item.get("claims") or not item.get("sources"):blocked+=1;continue
  try:
   prompt={"draft":item["draft"],"claim_ledger":item["claims"],"source_ids":[s["id"] for s in item["sources"]],"instructions":"Improve clarity, structure, and natural English. Preserve every source ID and do not introduce any new factual claims, numbers, citations, quotations, or unsupported details. Return only the revised article text."}
   result=router.complete("edit",[{"role":"system","content":"You are a conservative copy editor. Editing must not add facts. Preserve citation markers exactly."},{"role":"user","content":json.dumps(prompt,ensure_ascii=False)}])
   item["raw_draft"]=item["draft"];item["edited_draft"]=result["text"];item["draft"]=result["text"];item["editor_provider"]=result.get("provider");item["editor_model"]=result.get("model")
   file.write_text(json.dumps(item,ensure_ascii=False,indent=2)+"\n",encoding="utf-8");edited+=1
  except Exception as e:
   blocked+=1;print(f"Edit blocked for {item.get('id','unknown')}: {type(e).__name__}")
 print(f"Edited: {edited}; existing edits reused: {skipped}; blocked: {blocked}")
if __name__=="__main__":main()
