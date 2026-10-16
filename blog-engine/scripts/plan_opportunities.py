#!/usr/bin/env python3
"""Build a deterministic SEO opportunity queue from a curated UTF-8 JSON topic file."""
import argparse, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.seo_opportunity import make_opportunity,rank_opportunities
from engine.ledger import load

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--input",default=str(ROOT/"data"/"topic-seeds.json"))
 p.add_argument("--output",default=str(ROOT/"data"/"opportunity-queue.json"))
 p.add_argument("--limit",type=int,default=2500)
 p.add_argument("--ledger",default=str(ROOT/"data"/"article_ledger.jsonl"))
 a=p.parse_args()
 raw=json.loads(Path(a.input).read_text(encoding="utf-8"))
 if not isinstance(raw,list): raise SystemExit("Input must be a JSON array")
 ledger=load(a.ledger);items=[]
 for row in raw:
  try: items.append(make_opportunity(row["title"],row["category"],row.get("type","article"),row.get("intent"),row.get("evidence_depth",0),ledger))
  except (KeyError,ValueError) as e: print("SKIP:",str(e),file=sys.stderr)
 ranked=rank_opportunities(items)
 selected=ranked[:max(1,min(a.limit,10000))]
 result={"version":1,"site":"https://aafnaipatro.com","generated_by":"plan_opportunities.py","total_input":len(raw),"unique_candidates":len(ranked),"selected":len(selected),"publishable_articles":0,"note":"Candidates are not researched articles. Scores are heuristic, not search-volume/ranking estimates. Each item needs source research, semantic duplicate review, rights checks, fact-checking and editorial approval.","items":selected}
 Path(a.output).parent.mkdir(parents=True,exist_ok=True)
 Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Candidate queue written: {a.output}; unique={len(ranked)} selected={len(selected)} duplicates={sum(x['duplicate'] for x in ranked)}")
if __name__=="__main__":main()
