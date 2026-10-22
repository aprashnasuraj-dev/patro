"""Contextual hub/spoke suggestions based on actual approved published ledger entries."""
import re
def suggest(article,ledger,min_links=3,max_links=5):
 source=article.get("id"); cluster=article.get("cluster");words=set(re.findall(r"[a-z]{4,}",(article.get("intent","")+" "+article.get("title","")).lower()))
 result=[]
 for item in ledger.values():
  if item.get("id")==source or item.get("status")!="published" or not item.get("url","").startswith("https://aafnaipatro.com/"):continue
  overlap=len(words & set(re.findall(r"[a-z]{4,}",(item.get("intent","")+" "+item.get("title","")).lower())))
  score=overlap+(5 if cluster and cluster==item.get("cluster") else 0)
  if score>0:result.append((score,item))
 result.sort(key=lambda v:(-v[0],v[1]["url"]))
 links=[{"id":r["id"],"url":r["url"],"anchor":r.get("title") or r.get("intent")} for _,r in result[:max_links]]
 return {"links":links,"needs_review":len(links)<min_links,"reason":"Never invent links or force unrelated placements"}
