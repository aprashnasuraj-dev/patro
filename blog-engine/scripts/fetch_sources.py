#!/usr/bin/env python3
"""Fetch real public metadata/excerpts for candidate topics. Raw hits are unverified research leads."""
import argparse,json,time,urllib.parse,urllib.request,urllib.error
from pathlib import Path
def get_json(url,headers=None):
 req=urllib.request.Request(url,headers={"User-Agent":"AafnaiPatroResearchBot/1.0 (editorial research; contact: meroaafnaipatro@gmail.com)","Accept":"application/json",**(headers or {})})
 try:
  with urllib.request.urlopen(req,timeout=18) as r:return json.load(r)
 except (urllib.error.URLError,TimeoutError,OSError,ValueError) as e:
  return {"_error":type(e).__name__}
def search_wikipedia(query):
 url="https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode({"action":"query","list":"search","srsearch":query,"srlimit":3,"format":"json","utf8":1})
 payload=get_json(url);out=[]
 for hit in payload.get("query",{}).get("search",[]):
  title=hit.get("title","");page="https://en.wikipedia.org/wiki/"+urllib.parse.quote(title.replace(" ","_"))
  extract=__import__("re").sub("<[^>]+>"," ",hit.get("snippet",""))
  out.append({"id":"wiki-"+str(hit.get("pageid")),"url":page,"title":title,"publisher":"Wikipedia contributors","author":"Wikipedia contributors","published_at":"unknown","retrieved_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"extract":extract,"claims_supported":[],"license":"CC BY-SA; confirm attribution/share-alike for reuse","rights_verified":False,"verified":False,"source_type":"discovery-lead"})
 return out
def search_crossref(query):
 url="https://api.crossref.org/works?"+urllib.parse.urlencode({"query.title":query,"rows":3,"select":"DOI,title,author,published,container-title,URL,abstract"})
 payload=get_json(url);out=[]
 for row in payload.get("message",{}).get("items",[]):
  title=(row.get("title") or [""])[0];doi=row.get("DOI")
  if not doi or not title:continue
  authors=row.get("author") or [];author=", ".join(" ".join(filter(None,[a.get("given"),a.get("family")])) for a in authors) or "Not supplied"
  out.append({"id":"doi-"+doi,"url":"https://doi.org/"+doi,"title":title,"publisher":(row.get("container-title") or ["Crossref metadata"])[0],"author":author,"published_at":str(row.get("published",{}).get("date-parts",[["unknown"]])[0]),"retrieved_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"extract":__import__("re").sub("<[^>]+>"," ",row.get("abstract","") or title),"claims_supported":[],"license":"Metadata only; abstract/full-text rights not inferred","rights_verified":False,"verified":False,"source_type":"bibliographic-lead"})
 return out
def main():
 p=argparse.ArgumentParser();p.add_argument("--topics",required=True);p.add_argument("--output",required=True);p.add_argument("--delay",type=float,default=.25);a=p.parse_args()
 topics=json.loads(Path(a.topics).read_text(encoding="utf-8")).get("items",[]);results=[]
 for i,t in enumerate(topics):
  q=t.get("primary_query") or t.get("title","");hits=[]
  hits.extend(search_wikipedia(q));hits.extend(search_crossref(q))
  unique={s["url"]:s for s in hits if s.get("url")}
  results.append({"id":t["id"],"title":t.get("title",q),"url":t["url"],"query":q,"sources":list(unique.values()),"source_count":len(unique),"research_status":"leads-only" if unique else "source-fetch-failed","publishable":False})
  if a.delay:time.sleep(a.delay)
  if (i+1)%25==0:print(f"Fetched source leads for {i+1}/{len(topics)} topics")
 Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps({"version":1,"topics":len(topics),"items":results,"note":"Search results and metadata are leads only; not verified citations. 5-20 distinct source pages, source passages, claim mapping, license checks and editorial review remain mandatory."},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Wrote source leads for {len(results)} topics to {a.output}")
if __name__=="__main__":main()
