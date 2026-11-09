"""Normalize provenance. A model answer is never a source."""
from urllib.parse import urlparse
def source(record):
    keys=("id","url","title","publisher","retrieved_at","claims_supported")
    if not all(record.get(k) for k in keys): raise ValueError("Missing research provenance")
    u=urlparse(record["url"])
    if u.scheme not in ("https","http") or not u.hostname: raise ValueError("Unsafe source URL")
    if not record.get("verified"): raise ValueError("Unverified source")
    return {**record,"verified":True}
def source_pack(records):
    if not 5<=len(records)<=20: raise ValueError("Each article requires 5–20 distinct vetted sources")
    normalized=[source(x) for x in records]
    if len({x["id"] for x in normalized})!=len(records) or len({x["url"] for x in normalized})!=len(records):raise ValueError("Duplicate source")
    return normalized
