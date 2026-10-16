#!/usr/bin/env python3
"""Fail-closed content audit. This CLI never promotes drafts to approved/published."""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.verify_content import passage_audit,excessive_copy
def main():
 p=argparse.ArgumentParser();p.add_argument("--input",required=True);p.add_argument("--output",required=True);a=p.parse_args()
 root=Path(a.input);files=[f for f in sorted(root.glob("*.json")) if f.name != "image-generation-report.json"] if root.is_dir() else [root]
 results=[];approved=0
 for file in files:
  try:
   item=json.loads(file.read_text(encoding="utf-8"));errors=[]
   if not item.get("title") or not item.get("url"):errors.append("missing title/canonical URL")
   if not item.get("draft"):errors.append("missing draft body")
   if not item.get("sources") or not item.get("claims"):errors.append("missing source/claim ledger")
   if item.get("sources") and item.get("claims"):
    try:errors.extend(str(e) for e in passage_audit(item))
    except (ValueError,KeyError,TypeError) as e:errors.append("structural audit: "+str(e))
    if item.get("draft") and excessive_copy(item["draft"],[s.get("extract","") for s in item["sources"]]):errors.append("possible excessive copying")
   errors.append("human editorial review and licensed visual verification are still required")
   results.append({"file":str(file),"id":item.get("id"),"status":"blocked" if errors else "needs-review","errors":errors,"publishable":False})
  except (OSError,ValueError,json.JSONDecodeError) as e:results.append({"file":str(file),"status":"blocked","errors":["cannot read/parse: "+str(e)],"publishable":False})
 report={"version":1,"checked":len(results),"approved":approved,"publishable":0,"results":results,"note":"Automated checks are not editorial approval. This tool never marks an article approved or published."}
 Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Audited {len(results)} files; publishable=0; report={a.output}")
if __name__=="__main__":main()
