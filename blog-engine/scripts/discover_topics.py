#!/usr/bin/env python3
"""Discover unique candidate topics from curated seeds and Wikipedia's public search API."""
import argparse,json,sys,time,urllib.parse,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine.seo_opportunity import make_opportunity,rank_opportunities
from engine.ledger import load
def related_titles(query,limit=20):
 url="https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode({"action":"query","list":"search","srsearch":query,"srlimit":limit,"format":"json","utf8":1})
 req=urllib.request.Request(url,headers={"User-Agent":"AafnaiPatroResearchBot/1.0 (editorial topic discovery)"})
 try:
  with urllib.request.urlopen(req,timeout=15) as response:data=json.load(response)
 except (urllib.error.URLError,TimeoutError,OSError,ValueError):
  return []
 return [x.get("title","").strip() for x in data.get("query",{}).get("search",[]) if x.get("title")]
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--count",type=int,default=2000);p.add_argument("--output",default="topics.json")
 p.add_argument("--seeds",default=str(ROOT/"data"/"topic-seeds.json"));p.add_argument("--ledger",default=str(ROOT/"data"/"article_ledger.jsonl"))
 p.add_argument("--no-expand",action="store_true");p.add_argument("--results-per-seed",type=int,default=40);p.add_argument("--delay",type=float,default=.15)
 a=p.parse_args()
 if a.count<1 or a.count>10000:raise SystemExit("--count must be 1..10000")
 seeds=json.loads(Path(a.seeds).read_text(encoding="utf-8"));ledger=load(a.ledger);raw=[]
 for row in seeds:
  raw.append(row)
  if a.no_expand:continue
  query=row.get("title","")
  for title in related_titles(query,a.results_per_seed):
   title=" ".join(title.split())
   if len(title)<12 or len(title)>120 or title.casefold().startswith(("list of ","category:","portal:","template:","file:")):continue
   raw.append({"title":title,"category":row["category"],"type":"article","intent":title,"evidence_depth":0,"discovery_source":"wikipedia-search","seed":query})
  if a.delay:time.sleep(a.delay)
 items=[]
 for row in raw:
  try:
   item=make_opportunity(row["title"],row["category"],row.get("type","article"),row.get("intent"),row.get("evidence_depth",0),ledger)
   item["discovery_source"]=row.get("discovery_source","curated-seed")
   items.append(item)
  except (KeyError,ValueError) as e:print("Skipped invalid seed:",e,file=sys.stderr)
 ranked=rank_opportunities(items)[:a.count]
 out={"version":1,"requested":a.count,"curated_seed_count":len(seeds),"raw_candidates":len(raw),"available_unique_candidates":len(ranked),"count":len(ranked),"items":ranked,"note":"Wikipedia search titles are discovery leads, not verified facts or keyword-volume data. Topic count is limited by distinct results. Candidates still require evidence retrieval, intent review, claim verification, rights review and editorial approval."}
 Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Requested {a.count}; raw={len(raw)} unique candidates={len(ranked)}. See {a.output}.")
 if len(ranked)<a.count:print("NOTICE: available unique candidates are below requested count; no duplicate padding was added.",file=sys.stderr)
if __name__=="__main__":main()
