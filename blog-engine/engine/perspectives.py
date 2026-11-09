"""Editorial lenses tied to source IDs; no fabricated expert endorsements."""
def supported_lenses(lenses,source_ids):
    valid=set(source_ids);out=[]
    for lens in lenses:
        if not lens.get("angle") or not set(lens.get("source_ids",[])).intersection(valid):raise ValueError("Unsupported perspective")
        out.append(lens)
    return out
