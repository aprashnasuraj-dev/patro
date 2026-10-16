"""Fail closed: metadata checks do not substitute for checking source passages."""
from .research import source_pack
def structural_verify(article):
    pack=source_pack(article.get("sources",[]));source_ids={s["id"] for s in pack}
    claims=article.get("claims",[])
    if not claims:raise ValueError("Missing claims")
    for claim in claims:
        if not claim.get("source_ids") or not set(claim["source_ids"]).issubset(source_ids):raise ValueError("Unsupported claim")
    if any(not s.get("claims_supported") for s in pack):raise ValueError("Citation padding")
    media=article.get("media",[])
    if not any(m.get("type") in ("image","chart","diagram") and m.get("rights_verified") and all(m.get(k) for k in ("alt","credit","license","url")) for m in media):raise ValueError("Licensed visual required")
    return True
