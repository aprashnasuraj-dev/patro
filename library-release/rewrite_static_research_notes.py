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

NOTE=re.compile(
    r'(<aside\b[^>]*class=["\'][^"\']*\bresearch-note\b[^"\']*["\'][^>]*>\s*'
    r'<b[^>]*>\s*Research note\s*</b>\s*<p[^>]*>)(.*?)(</p>)',
    re.I|re.S)
HEADING=re.compile(r'<h1\b[^>]*>(.*?)</h1>',re.I|re.S)
SOURCE=re.compile(r'<li\s+id=["\']ref-(\d+)["\'][^>]*>\s*<div[^>]*>\s*'
                  r'<strong[^>]*>.*?</strong>\s*<span[^>]*>(.*?)</span>',re.I|re.S)
OLD=re.compile(r'\b(?:researched|inspected) sources? with article text, claims and visuals kept under one article identity',re.I)
def plain(value):
    return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',value))).strip()

def update(path):
    before=path.read_text(encoding="utf-8")
    match=NOTE.search(before)
    title=HEADING.search(before)
    refs=SOURCE.findall(before)
    if not match or not title or not refs:
        raise ValueError(f"{path}: incomplete note, headline, or source references")
    numbers=[int(i) for i,_ in refs]
    if len(numbers)!=len(set(numbers)):
        raise ValueError(f"{path}: duplicate reference numbers")
    slug=path.stem if path.stem!="index" else path.parent.name
    note=make_research_note(plain(title.group(1)),len(refs),key=slug,publishers=[plain(v) for _,v in refs])
    after=before[:match.start(2)]+html.escape(note,quote=False)+before[match.end(2):]
    if OLD.search(after):
        raise ValueError(f"{path}: old note survived rewrite")
    if after!=before: path.write_text(after,encoding="utf-8")
    return note,after!=before

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
    for path in sorted(pages):
        note,did_change=update(path)
        notes.add(note)
        changed+=did_change
    if len(notes)!=len(pages):
        raise SystemExit(f"Only {len(notes)} distinct notes for {len(pages)} articles; deploy blocked")
    print(f"Validated {len(pages)} unique research notes; updated {changed} article HTML files")
    for path in pages:
        if path.stem=="utm-grid-convergence-vs-magnetic-declination":
            print("UTM example: "+plain(NOTE.search(path.read_text(encoding="utf-8")).group(2)))
            break

if __name__=="__main__":
    main()
