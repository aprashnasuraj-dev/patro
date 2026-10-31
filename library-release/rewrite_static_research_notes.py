#!/usr/bin/env python3
"""Rewrite research note copy after extracting the existing release archive.

Preserves article text, claims, images, links, and the 2640 page identities.
"""
from __future__ import annotations
import argparse
import html
from pathlib import Path
import re
from research_note_copy import make_research_note
from article_dek_copy import clean_dek

NOTE=re.compile(
    r'(<aside\b[^>]*class=["\'][^"\']*\bresearch-note\b[^"\']*["\'][^>]*>\s*'
    r'<b[^>]*>\s*Research note\s*</b>\s*<p[^>]*>)(.*?)(</p>)',
    re.I|re.S)
HEADING=re.compile(r'<h1\b[^>]*>(.*?)</h1>',re.I|re.S)
DEK=re.compile(r'(<p\b[^>]*class=["\'][^"\']*\bdek\b[^"\']*["\'][^>]*>)(.*?)(</p>)',re.I|re.S)
PARAGRAPH=re.compile(r'<p\b[^>]*>(.*?)</p>',re.I|re.S)
BODY=re.compile(r'<div\b[^>]*\bid=["\']article-body["\'][^>]*>',re.I|re.S)
SOURCE=re.compile(r'<li\s+id=["\']ref-(\d+)["\'][^>]*>\s*<div[^>]*>\s*'
                  r'<strong[^>]*>.*?</strong>\s*<span[^>]*>(.*?)</span>',re.I|re.S)
OLD=re.compile(r'\b(?:researched|inspected) sources? with article text, claims and visuals kept under one article identity',re.I)
def plain(value):
    return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',value))).strip()

def update(path):
    before=path.read_text(encoding="utf-8")
    match=NOTE.search(before)
    title=HEADING.search(before)
    dek_match=DEK.search(before)
    refs=SOURCE.findall(before)
    if not match or not title or not dek_match or not refs:
        raise ValueError(f"{path}: incomplete note, headline, subtitle, or source references")
    numbers=[int(i) for i,_ in refs]
    if len(numbers)!=len(set(numbers)):
        raise ValueError(f"{path}: duplicate reference numbers")
    slug=path.stem if path.stem!="index" else path.parent.name
    headline=plain(title.group(1))
    note=make_research_note(headline,len(refs),key=slug,publishers=[plain(v) for _,v in refs])
    after=before[:match.start(2)]+html.escape(note,quote=False)+before[match.end(2):]

    # Source-specific prose rather than a repeated headline or truncated snippet.
    body=BODY.search(before)
    paragraphs=[]
    if body:
        paragraphs=[plain(p) for p in PARAGRAPH.findall(before[body.end():body.end()+90000])[:22]]
    if not paragraphs:
        quick=re.search(r'<aside\b[^>]*class=["\'][^"\']*\bquick\b[^"\']*["\'][^>]*>(.*?)</aside>',before,re.I|re.S)
        if quick: paragraphs=[plain(p) for p in PARAGRAPH.findall(quick.group(1))]
    existing_dek=plain(dek_match.group(2))
    new_dek=clean_dek(headline,existing_dek,paragraphs,slug=slug)
    m=DEK.search(after)
    if not m: raise ValueError(f"{path}: subtitle lost after note rewrite")
    after=after[:m.start(2)]+html.escape(new_dek,quote=False)+after[m.end(2):]
    # Correct stale duplicated titles in search and social snippets as well.
    for attribute in ('name="description"','property="og:description"'):
        meta_rx=re.compile(r'(<meta\s+'+re.escape(attribute)+r'\s+content=")([^"]*)(")',re.I)
        def fix_meta(m):
            current=html.unescape(m.group(2))
            if current.casefold().startswith(headline.casefold()) or current.endswith(("…","...")):
                return m.group(1)+html.escape(new_dek,quote=True)+m.group(3)
            return m.group(0)
        after=meta_rx.sub(fix_meta,after)
    if OLD.search(after):
        raise ValueError(f"{path}: old note survived rewrite")
    if new_dek.casefold().startswith(headline.casefold()):
        raise ValueError(f"{path}: subtitle still repeats H1")
    if new_dek.endswith(("\u2026","...")) or "\u2014" in new_dek:
        raise ValueError(f"{path}: subtitle is truncated or has em dash")
    if after!=before: path.write_text(after,encoding="utf-8")
    return note,after!=before,existing_dek!=new_dek,new_dek

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("static_root",type=Path)
    parser.add_argument("--expected",type=int,default=2640)
    args=parser.parse_args()
    pages=[p for p in args.static_root.rglob("*.html") if "research-note" in p.read_text(encoding="utf-8")]
    if len(pages)!=args.expected:
        raise SystemExit(f"Expected {args.expected} articles, got {len(pages)}; deploy blocked")
    notes=set()
    changed=0
    deks_changed=0
    for path in sorted(pages):
        note,did_change,dek_changed,_=update(path)
        notes.add(note)
        changed+=did_change
        deks_changed+=dek_changed
    if len(notes)!=len(pages):
        raise SystemExit(f"Only {len(notes)} distinct notes for {len(pages)} articles; deploy blocked")
    print(f"Validated {len(pages)} unique research notes; updated {changed} article HTML files and {deks_changed} subtitles")
    for path in pages:
        if path.stem=="utm-grid-convergence-vs-magnetic-declination":
            rendered=path.read_text(encoding="utf-8")
            print("UTM note: "+plain(NOTE.search(rendered).group(2)))
            print("UTM dek: "+plain(DEK.search(rendered).group(2)))
            break

if __name__=="__main__":
    main()
