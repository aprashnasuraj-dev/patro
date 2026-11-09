"""Offline evidence and integrity gate. Semantic relevance is a REVIEW signal, not proof."""
import re
from difflib import SequenceMatcher
from .fact_checker import structural_verify
WORD=re.compile(r"(?u)\b[\w-]{4,}\b")
NUM=re.compile(r"(?<!\w)\d[\d.,%/-]*(?!\w)")
def tokens(text):return set(WORD.findall((text or "").casefold()))
def passage_audit(article):
 structural_verify(article)
 by_id={s["id"]:s for s in article["sources"]}
 errors=[]
 for s in article["sources"]:
  if not s.get("extract") or len(s["extract"].strip())<35:errors.append((s["id"],"missing source passage snapshot"))
  for field in ("title","publisher","retrieved_at","author","published_at"):
   if not s.get(field):errors.append((s["id"],"APA/provenance missing "+field))
 for c in article["claims"]:
  claim_words=tokens(c.get("text",""))
  numbers=NUM.findall(c.get("text",""))
  for sid in c["source_ids"]:
   src=by_id[sid];excerpt=src.get("extract","")
   if not excerpt:continue
   for n in numbers:
    if n not in excerpt:errors.append((c["id"],"number "+n+" absent from cited source "+sid))
   overlap=len(claim_words & tokens(excerpt))/max(1,len(claim_words))
   if overlap<0.18 and not numbers:errors.append((c["id"],"low keyword overlap with "+sid+"; human evidence review required"))
 return errors
def require_passage_audit(article):
 errors=passage_audit(article)
 if errors:raise ValueError("Evidence passage audit failed: "+repr(errors))
 return True
def excessive_copy(draft,extracts,window=12):
 def words(s):return re.findall(r"\b\w+\b",s.casefold())
 text=words(draft)
 if len(text)<window:return False
 for e in extracts:
  chunks={tuple(words(e)[i:i+window]) for i in range(max(0,len(words(e))-window+1))}
  if any(tuple(text[i:i+window]) in chunks for i in range(len(text)-window+1)):return True
 return False
