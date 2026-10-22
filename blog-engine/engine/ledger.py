"""Durable append-only JSONL ledger: replay on restart; stable IDs and idempotent stage transitions."""
from __future__ import annotations
import json, os, hashlib
from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager
STAGES=("discovered","researching","sourced","draft","editing","verifying","verified","blocked","review","approved","rendered","published","retired")
ALLOWED={"discovered":{"researching","blocked"},"researching":{"sourced","blocked"},"sourced":{"draft","blocked"},"draft":{"editing","blocked"},"editing":{"verifying","blocked"},"verifying":{"verified","blocked"},"verified":{"review","blocked"},"review":{"approved","blocked"},"approved":{"rendered","blocked"},"rendered":{"published","blocked"},"published":{"retired"},"blocked":{"researching","review"},"retired":set()}
AUTHOR="AafnaiPatro Editor Team"
@contextmanager
def lock(path):
    # Single-host lock; do not share JSONL over concurrent distributed runners.
    marker=Path(str(path)+".lock")
    fd=os.open(marker,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try: yield
    finally: os.close(fd); marker.unlink(missing_ok=True)
def load(path):
    latest={}
    p=Path(path)
    if not p.exists(): return latest
    with p.open(encoding="utf-8") as stream:
        for line in stream:
            if line.strip():
                event=json.loads(line)
                if "id" not in event or "status" not in event: raise ValueError("Invalid ledger event")
                latest[event["id"]]=event
    return latest
def transition(path, article_id, status, **changes):
    if status not in STAGES: raise ValueError("Unknown stage")
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    with lock(path):
        latest=load(path);previous=latest.get(article_id)
        if previous:
            if previous["status"]==status and all(previous.get(k)==v for k,v in changes.items()): return previous
            if status not in ALLOWED[previous["status"]]: raise ValueError("Illegal pipeline transition")
            event={**previous,**changes,"status":status}
        else:
            if status!="discovered": raise ValueError("First stage must be discovered")
            if any(x.get("id")==article_id for x in latest.values()): raise ValueError("Duplicate ID")
            event={"id":article_id,"author":AUTHOR,**changes,"status":status}
        if event.get("author")!=AUTHOR: raise ValueError("Editorial byline must be consistent")
        for id_,a in latest.items():
            if id_!=article_id and event.get("url") and event["url"]==a.get("url"): raise ValueError("Canonical URL collision")
        event["updated_at"]=datetime.now(timezone.utc).isoformat()
        event["revision"]=(previous or {}).get("revision",0)+1
        with path.open("a",encoding="utf-8") as stream:
            stream.write(json.dumps(event,ensure_ascii=False,sort_keys=True)+"\n")
            stream.flush();os.fsync(stream.fileno())
        return event
def stable_id(category,query):
    digest=hashlib.sha256((category+"\0"+query.strip().casefold()).encode()).hexdigest()[:12].upper()
    return category.upper()[:4]+"-"+digest
