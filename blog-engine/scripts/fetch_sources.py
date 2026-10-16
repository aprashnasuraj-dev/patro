#!/usr/bin/env python3
"""Fetch real source passages and provenance; no search snippet is treated as full evidence."""
import argparse,json,re,time,urllib.parse,urllib.request,urllib.error
from pathlib import Path
UA="AafnaiPatroResearchBot/1.0 (editorial research; contact: meroaafnaipatro@gmail.com)"
def get_json(url,headers=None):
 for attempt in range(5):
  req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json",**(headers or {})})
  try:
   time.sleep(.15)
   with urllib.request.urlopen(req,timeout=18) as r:return json.load(r)
  except urllib.error.HTTPError as e:
   if e.code not in (408,425,429,500,502,503,504) or attempt==4:return {"_error":"HTTP "+str(e.code)}
   retry=e.headers.get("Retry-After") if e.headers else None
   try:delay=min(30,max(1,float(retry))) if retry else min(16,2**attempt)
   except (ValueError,TypeError):delay=min(16,2**attempt)
   time.sleep(delay)
  except (urllib.error.URLError,TimeoutError,OSError,ValueError) as e:
   if attempt==4:return {"_error":type(e).__name__}
   time.sleep(min(16,2**attempt))
 return {"_error":"retry-exhausted"}
def clean(text):
 return re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",text or "")).strip()
def now():return time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
def search_wikipedia(query):
 url="https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode({"action":"query","list":"search","srsearch":query,"srlimit":3,"format":"json","utf8":1})
 payload=get_json(url);out=[]
 hits=payload.get("query",{}).get("search",[])
 ids="|".join(str(h.get("pageid")) for h in hits if h.get("pageid"))
 details={}
 if ids:
  detail_url="https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode({"action":"query","pageids":ids,"prop":"extracts|info","exintro":1,"explaintext":1,"inprop":"url","format":"json"})
  details=get_json(detail_url).get("query",{}).get("pages",{})
 for hit in hits:
  page=details.get(str(hit.get("pageid")),{});title=page.get("title") or hit.get("title","")
  extract=clean(page.get("extract",""))
  page_url=page.get("fullurl") or ("https://en.wikipedia.org/wiki/"+urllib.parse.quote(title.replace(" ","_")))
  out.append({"id":"wiki-"+str(hit.get("pageid")),"url":page_url,"title":title,"publisher":"Wikipedia contributors","author":"Wikipedia contributors","published_at":"not supplied by source API","retrieved_at":now(),"extract":extract,"claims_supported":[],"license":"CC BY-SA; attribution/share-alike may apply to reused text","rights_verified":False,"verified":bool(extract and len(extract)>=80 and page_url.startswith("https://")),"source_type":"encyclopedia","verification_basis":"direct HTTPS MediaWiki API extract"})
 return out
def search_crossref(query):
 url="https://api.crossref.org/works?"+urllib.parse.urlencode({"query.title":query,"rows":5,"select":"DOI,title,author,published,container-title,URL,abstract"})
 payload=get_json(url);out=[]
 for row in payload.get("message",{}).get("items",[]):
  title=(row.get("title") or [""])[0];doi=row.get("DOI")
  abstract=clean(row.get("abstract",""))
  if not doi or not title or len(abstract)<80:continue
  authors=row.get("author") or [];author=", ".join(" ".join(filter(None,[a.get("given"),a.get("family")])) for a in authors) or "Not supplied"
  date=row.get("published",{}).get("date-parts",[["not supplied by source API"]])[0]
  out.append({"id":"doi-"+doi,"url":"https://doi.org/"+doi,"title":title,"publisher":(row.get("container-title") or ["Crossref-indexed publication"])[0],"author":author,"published_at":str(date),"retrieved_at":now(),"extract":abstract,"claims_supported":[],"license":"Abstract metadata does not grant full-text reuse rights","rights_verified":False,"verified":True,"source_type":"scholarly-metadata","verification_basis":"Crossref metadata API; abstract text available"})
 return out
def search_commons(query):
 params={"action":"query","generator":"search","gsrsearch":"filetype:bitmap "+query,"gsrnamespace":6,"gsrlimit":5,"prop":"imageinfo","iiprop":"url|extmetadata","iiurlwidth":1200,"format":"json"}
 payload=get_json("https://commons.wikimedia.org/w/api.php?"+urllib.parse.urlencode(params));pages=payload.get("query",{}).get("pages",{});out=[]
 for page in pages.values():
  info=(page.get("imageinfo") or [{}])[0];meta=info.get("extmetadata",{})
  def val(k):return clean((meta.get(k) or {}).get("value",""))
  license_name=val("LicenseShortName");license_url=val("LicenseUrl");artist=val("Artist");credit=val("Credit") or artist;description=val("ImageDescription") or page.get("title","")
  allowed=any(term in license_name.casefold() for term in ("cc0","public domain","cc by ","cc by-sa"))
  source_url="https://commons.wikimedia.org/wiki/"+urllib.parse.quote(page.get("title","").replace(" ","_"))
  direct=info.get("thumburl") or info.get("url")
  out.append({"id":"commons-"+str(page.get("pageid")),"type":"image","url":direct,"source_page":source_url,"title":page.get("title",""),"alt":description[:300],"credit":credit,"license":license_name,"license_url":license_url,"rights_verified":bool(allowed and license_url and credit and description and direct),"publisher":"Wikimedia Commons","retrieved_at":now()})
 return out
def main():
 p=argparse.ArgumentParser();p.add_argument("--topics",required=True);p.add_argument("--output",required=True);p.add_argument("--delay",type=float,default=.25);a=p.parse_args()
 topics=json.loads(Path(a.topics).read_text(encoding="utf-8")).get("items",[]);out_path=Path(a.output);out_path.parent.mkdir(parents=True,exist_ok=True)
 prior={}
 if out_path.exists():
  try:prior={v["id"]:v for v in json.loads(out_path.read_text(encoding="utf-8")).get("items",[])}
  except (ValueError,KeyError,TypeError):prior={}
 results=[];done=0
 for i,t in enumerate(topics):
  old=prior.get(t["id"])
  if old and old.get("sources") and old.get("research_status")=="evidence-candidates":
   results.append(old);done+=1;continue
  q=t.get("primary_query") or t.get("title","");hits=search_wikipedia(q)+search_crossref(q)
  unique={s["url"]:s for s in hits if s.get("url")}
  sources=list(unique.values());media=search_commons(q)
  row={"id":t["id"],"title":t.get("title",q),"url":t["url"],"query":q,"sources":sources,"media":media,"source_count":len(sources),"verified_source_count":sum(bool(s.get("verified")) for s in sources),"licensed_media_count":sum(bool(m.get("rights_verified")) for m in media),"research_status":"evidence-candidates" if sources else "source-fetch-failed","publishable":False}
  results.append(row);done+=1
  if a.delay:time.sleep(a.delay)
  if done%10==0 or done==len(topics):
   completed_ids={r["id"] for r in results};results.extend(v for k,v in prior.items() if k not in completed_ids)
   out_path.write_text(json.dumps({"version":1,"topics":len(topics),"completed":done,"items":results,"note":"Verified means retrieved source provenance and a usable passage, not that every claim is proven. Each article still requires 5-20 distinct sources, claim mapping, rights-cleared media, fact checks and editorial review."},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
   results=[r for r in results if r["id"] in completed_ids]
  if done%25==0:print(f"Processed {done}/{len(topics)} topics (checkpoint saved)")
 completed_ids={r["id"] for r in results};results.extend(v for k,v in prior.items() if k not in completed_ids)
 out_path.write_text(json.dumps({"version":1,"topics":len(topics),"completed":done,"items":results,"note":"Verified means retrieved source provenance and a usable passage, not that every claim is proven. Each article still requires 5-20 distinct sources, claim mapping, rights-cleared media, fact checks and editorial review."},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Wrote source records for {len(results)} topics to {a.output}")
if __name__=="__main__":main()
