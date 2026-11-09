"""The writer accepts only an evidence brief and creates a private draft."""
AUTHOR="AafnaiPatro Editor Team"
def brief(article,sources,claims):
    if not 5<=len(sources)<=20:raise ValueError("Insufficient sources")
    if not claims:raise ValueError("Claim ledger required")
    ids={s["id"] for s in sources}
    for claim in claims:
        if not claim.get("source_ids") or not set(claim["source_ids"]).issubset(ids):raise ValueError("Unsupported claim")
    return {"id":article["id"],"title":article.get("title"),"primary_query":article["primary_query"],"author":AUTHOR,"source_ids":sorted(ids),"claims":claims,"instructions":"Write fluent original English, specific and explanatory rather than mechanical. Cite every nontrivial sourced claim; do not invent evidence or media.","status":"draft"}
