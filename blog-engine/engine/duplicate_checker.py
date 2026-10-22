"""Stable ID and intent collision checks (semantic human review remains necessary)."""
def check(candidate,ledger):
    if candidate["id"] in ledger: return {"duplicate":True,"existing_id":candidate["id"]}
    intent=candidate.get("intent","").strip().casefold()
    for item in ledger.values():
        if item.get("intent","").strip().casefold()==intent:return {"duplicate":True,"existing_id":item["id"]}
    return {"duplicate":False,"requires_semantic_review":True}
