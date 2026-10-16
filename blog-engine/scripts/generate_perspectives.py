#!/usr/bin/env python3
"""Turn research leads into an editorial evidence checklist, not invented facts."""
import argparse,json
from pathlib import Path
def main():
 p=argparse.ArgumentParser();p.add_argument("--sources",required=True);p.add_argument("--output",required=True);a=p.parse_args()
 data=json.loads(Path(a.sources).read_text(encoding="utf-8"));out=[]
 for item in data.get("items",[]):
  sources=item.get("sources",[])
  out.append({"id":item["id"],"title":item["title"],"url":item["url"],"primary_query":item["query"],"sources":sources,"perspectives":[{"angle":"Core explanation","question":"What mechanism or evidence directly answers the primary query?","source_ids":[]},{"angle":"Context and limitations","question":"What qualifications, exceptions, or uncertainties do sources document?","source_ids":[]},{"angle":"Practical significance","question":"What supported implication helps a reader understand why this matters?","source_ids":[]}],"claims":[],"publishable":False,"blockers":["Source hits are not verified","Map each claim to exact source passages","Need 5-20 distinct vetted sources","Need rights-cleared visual and human review"]})
 Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps({"version":1,"items":out},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Wrote {len(out)} perspective checklists; none are marked publishable.")
if __name__=="__main__":main()
