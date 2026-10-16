"""SEO opportunity generation: score intent fit without inventing search-volume metrics."""
import re
from .seo import canonical
from .discovery import candidate, CATEGORIES
from .duplicate_checker import check

    return re.sub(r"\s+", " ", str(q or "")).strip(" \t\r\n?.!")
    return re.sub(r"\\s+", " ", str(q or "")).strip(" \\t\\r\\n?.!")

def score_opportunity(title, category, intent, evidence_depth=0, duplicate=False):
    """Transparent heuristic score (0-100); not a traffic or ranking prediction."""
    title=normalize_query(title)
    words=re.findall(r"[a-z0-9]+", title.casefold())
    score=30
    if 6 <= len(words) <= 13: score += 15
    if title.endswith("?"): score += 8
    if any(w in words for w in ("why","how","what","when","where","can","does","are","is")): score += 8
    if any(w in words for w in ("explained","guide","difference","cause","work","history","meaning")): score += 6
    if len(set(words)) / max(1,len(words)) > .75: score += 5
    if len(intent.strip()) >= 24: score += 8
    score += min(15, max(0, int(evidence_depth))*3)
    if duplicate: score -= 50
    return max(0,min(100,score))

def make_opportunity(title, category, kind="article", intent=None, evidence_depth=0, ledger=None):
    title=normalize_query(title)
    item=candidate(category,title,kind,intent or title)
    item["title"]=title
    item["url"]=canonical(kind,title)
    item["primary_query"]=title
    dupe=check(item,ledger or {})
    item["duplicate"]=bool(dupe["duplicate"])
    item["requires_semantic_review"]=True
    item["seo_score"]=score_opportunity(title,category,item["intent"],evidence_depth,item["duplicate"])
    item["score_method"]="transparent heuristic; no keyword-volume or ranking claims"
    return item

def rank_opportunities(items):
    seen=set();out=[]
    for item in items:
        key=(item["url"],item["intent"].casefold())
        if key in seen: continue
        seen.add(key);out.append(item)
    return sorted(out,key=lambda x:(x["duplicate"],-x["seo_score"],x["url"]))
