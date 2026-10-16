#!/usr/bin/env python3
"""Discover a deterministic queue of unique topic candidates; never invent keyword metrics."""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.seo_opportunity import make_opportunity,rank_opportunities
from engine.ledger import load
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--count",type=int,default=2000);p.add_argument("--output",default="topics.json")
 p.add_argument("--seeds",default=str(ROOT/"data"/"topic-seeds.json"));p.add_argument("--ledger",default=str(ROOT/"data"/"article_ledger.jsonl"))
 a=p.parse_args()
 if a.count<1 or a.count>10000:raise SystemExit("--count must be 1..10000")
 seeds=json.loads(Path(a.seeds).read_text(encoding="utf-8"));ledger=load(a.ledger);items=[]
 for row in seeds:
  try:items.append(make_opportunity(row["title"],row["category"],row.get("type","article"),row.get("intent"),row.get("evidence_depth",0),ledger))
  except (KeyError,ValueError) as e:print("Skipped invalid seed:",e,file=sys.stderr)
 items=rank_opportunities(items)[:a.count]
 out={"version":1,"requested":a.count,"available_unique_candidates":len(items),"count":len(items),"items":items,"note":"Candidate count is limited by available distinct seeds. No synthetic topic inflation, search-volume claims, or publication approval."}
 Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Requested {a.count}; discovered {len(items)} unique candidates. See {a.output}.")
 if len(items)<a.count: print("NOTICE: seed supply is below requested count; add vetted seeds or a real keyword source.",file=sys.stderr)
if __name__=="__main__":main()
