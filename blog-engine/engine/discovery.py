"""Evidence-driven opportunity intake; candidates are not automatically published."""
from .ledger import stable_id
CATEGORIES=("science","technology","nature","history","culture","geography","engineering","daily-life","arts","language","data","space")
def candidate(category,primary_query,type="article",intent=None):
    if category not in CATEGORIES: raise ValueError("Unsupported category")
    if type not in ("article","blog","fact","answer"): raise ValueError("Unsupported format")
    if not primary_query or len(primary_query.strip())<12: raise ValueError("Distinct question/query required")
    return dict(id=stable_id(category,primary_query),category=category,type=type,primary_query=primary_query.strip(),intent=intent or primary_query.strip(),status="discovered",author="AafnaiPatro Editor Team")
