#!/usr/bin/env python3
"""Validate and reconcile the extracted static release before deployment."""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re

def plain(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

H1=re.compile(r"<h1\b[^>]*>(.*?)</h1>",re.I|re.S)
DEK=re.compile(r"""<p\b[^>]*class=["'][^"']*\bdek\b[^"']*["'][^>]*>(.*?)</p>""",re.I|re.S)
NOTE=re.compile(r"""<aside\b[^>]*class=["'][^"']*\bresearch-note\b[^"']*["'][^>]*>.*?<p[^>]*>(.*?)</p>""",re.I|re.S)
QUICK=re.compile(r"""<aside\b[^>]*class=["'][^"']*\bquick\b[^"']*["'][^>]*>(.*?)</aside>""",re.I|re.S)
P=re.compile(r"<p\b[^>]*>(.*?)</p>",re.I|re.S)
REF=re.compile(r"""<li\b[^>]*id=["']ref-(\d+)["']""",re.I)
CANONICAL=re.compile(r"""<link\s+rel=["']canonical["']\s+href=["']([^"']+)""",re.I)
SCRIPT=re.compile(r"""(<script\s+type=["']application/ld\+json["'][^>]*>)(.*?)(</script>)""",re.I|re.S)
STALE=re.compile(r"(researched|inspected) sources? with article text, claims and visuals kept under one article identity",re.I)
DESCRIPTION_FIELDS=("dek","description","summary")

def change_metadata(text,dek):
    safe=html.escape(dek,quote=True)
    for key in ('name="description"','property="og:description"','name="twitter:description"'):
        pattern=re.compile(r'(<meta\s+'+re.escape(key)+r'\s+content=")([^"]*)(")',re.I)
        text=pattern.sub(lambda m:m.group(1)+safe+m.group(3),text)
    def jsonld(m):
        try: data=json.loads(m.group(2))
        except json.JSONDecodeError: raise ValueError("Invalid structured-data JSON")
        def visit(obj):
            if isinstance(obj,dict):
                if ("headline" in obj and "description" in obj) or obj.get("@type") in ("Article","TechArticle"):
                    obj["description"]=dek
                for v in obj.values(): visit(v)
            elif isinstance(obj,list):
                for v in obj: visit(v)
        visit(data)
        encoded=json.dumps(data,ensure_ascii=False,separators=(",",":")).replace("<",chr(92)+"u003c")
        return m.group(1)+encoded+m.group(3)
    return SCRIPT.sub(jsonld,text)

def update_index(value,by_slug):
    total=0
    def recurse(node):
        nonlocal total
        if isinstance(node,list):
            for entry in node: recurse(entry)
        elif isinstance(node,dict):
            slug=node.get("slug")
            if not slug:
                url=str(node.get("url",""))
                if "/article/" in url: slug=url.split("/article/")[-1].split("?")[0].split("#")[0]
            if slug in by_slug:
                target=by_slug[slug]
                for key in DESCRIPTION_FIELDS:
                    if key in node and isinstance(node[key],str):
                        if node[key]!=target: node[key]=target;total+=1
            else:
                for v in node.values():
                    if isinstance(v,(dict,list)): recurse(v)
    recurse(value)
    return total

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("root",type=Path)
    ap.add_argument("--expected",type=int,default=2640)
    args=ap.parse_args()
    root=args.root
    article_dir=root/"article"
    research_dir=root/"research"
    pages=sorted(article_dir.rglob("*.html"))
    if len(pages)!=args.expected:
        raise SystemExit(f"Unsafe release: expected {args.expected} article files, found {len(pages)}")
    by_slug={}
    research_notes=set()
    source_counts=Counter()
    output_hash=hashlib.sha256()
    for path in pages:
        slug=path.stem if path.stem!="index" else path.parent.name
        source=path.read_text(encoding="utf-8")
        if slug in by_slug: raise SystemExit(f"Duplicate slug {slug}")
        heading=H1.findall(source)
        dek_match=DEK.search(source)
        note_match=NOTE.search(source)
        refs=[int(n) for n in REF.findall(source)]
        canonical=CANONICAL.search(source)
        if len(heading)!=1 or not dek_match or not note_match or not refs or not canonical:
            raise SystemExit(f"Incomplete page identity or research markup: {slug}")
        if len(set(refs))!=len(refs) or sorted(refs)!=list(range(1,len(refs)+1)):
            raise SystemExit(f"Bad reference numbering: {slug}")
        if not (research_dir/(slug+".html")).is_file() and not (research_dir/slug/"index.html").is_file():
            raise SystemExit(f"Missing research page: {slug}")
        if canonical.group(1).strip()!=f"https://aafnaipatro.com/article/{slug}":
            raise SystemExit(f"Incorrect canonical: {slug}")
        title=plain(heading[0]);dek=plain(dek_match.group(1));note=plain(note_match.group(1))
        if not (55<=len(dek)<=320):
            raise SystemExit(f"Implausible subtitle length for {slug}: {len(dek)}")
        if dek.casefold().startswith(title.casefold()) or dek.endswith(("…","...")) or "—" in dek:
            raise SystemExit(f"Duplicated, truncated, or em-dash subtitle: {slug}")
        quick=QUICK.search(source)
        if quick:
            leads=[plain(x).casefold() for x in P.findall(quick.group(1))]
            if dek.casefold() in leads or any(x.startswith(dek.casefold()) for x in leads):
                raise SystemExit(f"Subtitle copied from Quick Answer: {slug}")
        if STALE.search(source) or not re.search(r"\b"+str(len(refs))+r"\b",note):
            raise SystemExit(f"Stale or inaccurate research note: {slug}")
        if "—" in note:
            raise SystemExit(f"Em dash in new research note: {slug}")
        if note in research_notes: raise SystemExit(f"Duplicate research note: {slug}")
        research_notes.add(note)
        changed=change_metadata(source,dek)
        # Prevent the repair pass from touching article bodies and original research data.
        before_body=source.split('<div class="prose" id="article-body">',1)
        after_body=changed.split('<div class="prose" id="article-body">',1)
        if len(before_body)==2 and len(after_body)==2 and before_body[1]!=after_body[1]:
            raise SystemExit(f"Editorial patch touched article body: {slug}")
        if changed!=source: path.write_text(changed,encoding="utf-8")
        by_slug[slug]=dek
        source_counts[len(refs)]+=1
        output_hash.update((slug+"\0"+title+"\0"+dek+"\0"+note+"\n").encode("utf-8"))
    catalogs=list(root.rglob("catalog.json"))
    if not catalogs: raise SystemExit("Missing catalog.json")
    catalogs_changed=0
    catalogs_validated=0
    for path in catalogs:
        data=json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data,dict) or not isinstance(data.get("articles"),list): continue
        articles=data["articles"]
        if len(articles)!=args.expected: raise SystemExit(f"Catalog count mismatch: {path}")
        catalog_slugs={x.get("slug") for x in articles}
        if catalog_slugs!=set(by_slug): raise SystemExit(f"Catalog identity mismatch: {path}")
        catalogs_validated+=len(articles)
        catalogs_changed+=update_index(data,by_slug)
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    for path in root.rglob("search-index.json"):
        data=json.loads(path.read_text(encoding="utf-8"))
        catalogs_changed+=update_index(data,by_slug)
        path.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    if catalogs_validated<args.expected: raise SystemExit("Catalog identity not fully validated")
    qa={
        "status":"pass","article_count":len(by_slug),"research_count":len(list(research_dir.rglob("*.html"))),
        "unique_research_notes":len(research_notes),
        "catalog_fields_reconciled":catalogs_changed,
        "catalog_entries_validated":catalogs_validated,
        "reference_count_distribution":dict(sorted(source_counts.items())),
        "editorial_sha256":output_hash.hexdigest(),
        "sample_slugs":[name for name in (
            "utm-grid-convergence-vs-magnetic-declination",
            "total-station-prism-constant-error-calculator",
            sorted(by_slug)[0],sorted(by_slug)[len(by_slug)//2],sorted(by_slug)[-1])
            if name in by_slug],
        "generated_at":datetime.now(timezone.utc).isoformat()
    }
    if qa["research_count"]!=args.expected: raise SystemExit("Research page count mismatch")
    qa_path=root/"library-data"/"editorial-qa.json"
    qa_path.parent.mkdir(parents=True,exist_ok=True)
    qa_path.write_text(json.dumps(qa,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(qa,ensure_ascii=False))
if __name__=="__main__": main()
