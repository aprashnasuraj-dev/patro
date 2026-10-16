"""Allowlisted model selection; no implicit network access or quota bypass."""
import json
from pathlib import Path
def eligible(config_path,capability,usage=None):
    config=json.loads(Path(config_path).read_text(encoding="utf-8")); usage=usage or {}
    if not config.get("enabled"):return []
    result=[]
    for item in config.get("adapters",[]):
        if not all(item.get(k) is True for k in ("enabled","official_terms_verified","commercial_use_verified")):continue
        if capability not in item.get("capabilities",[]):continue
        cap=item.get("daily_limit")
        if not isinstance(cap,int) or cap<=0 or usage.get(item["id"],0)>=cap:continue
        result.append(item)
    return sorted(result,key=lambda x:usage.get(x["id"],0)/x["daily_limit"])
