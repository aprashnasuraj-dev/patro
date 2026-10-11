#!/usr/bin/env python3
"""
Post-build checks. Run after `python -m generator.build`:

    python tests/check_build.py build/

Fails (exit 1) if any of these are wrong:
  * an internal link points to a page that wasn't built
  * a JSON-LD block doesn't parse, or an Event lacks startDate/location
  * a page's hreflang partner (en <-> ne) is missing
  * a title or meta description is empty, or a title is duplicated across indexable pages
  * a page references a social image that wasn't generated (when images were built)
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

HREF = re.compile(r'href="(/[^"#?]*)"')
LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
TITLE = re.compile(r"<title>(.*?)</title>", re.S)
DESC = re.compile(r'<meta name="description" content="(.*?)">')
OG = re.compile(r'<meta property="og:image" content="https?://[^/]+(/og/[^"]+)">')
# Paths served by the existing aafnaipatro.com app, not by this build
SITE_PATHS = ("/date/", "/tools/", "/calendar/", "/convert", "/rashifal", "/guides/", "/samudaya", "/methodology", "/nepalmap")
ALT = re.compile(r'<link rel="alternate" hreflang="(en|ne)" href="https?://[^/]+(/[^"]*)">')


def main(root: Path) -> int:
    pages = sorted(root.rglob("index.html"))
    built = {"/" + str(p.parent.relative_to(root)).replace("\\", "/").strip(".") + "/" for p in pages}
    built = {b.replace("//", "/") for b in built}
    errors: list[str] = []
    titles, descs = Counter(), Counter()
    images_built = (root / "og").exists()
    for p in pages:
        html = p.read_text(encoding="utf-8")
        me = "/" + str(p.parent.relative_to(root)).replace("\\", "/") + "/"
        for href in HREF.findall(html):
            if href.startswith("/static/") or href.endswith((".css", ".js", ".xml", ".json", ".jpg", ".png", ".woff2")):
                continue
            if href in ("/", "/ne/") or href.startswith(SITE_PATHS):
                continue  # pages that belong to the existing aafnaipatro.com site
            if href not in built:
                errors.append(f"{me}: broken link {href}")
        for block in LD.findall(html):
            try:
                j = json.loads(block)
            except json.JSONDecodeError as e:
                errors.append(f"{me}: bad JSON-LD ({e})")
                continue
            if j.get("@type") == "Event" and not (j.get("startDate") and j.get("location")):
                errors.append(f"{me}: Event missing startDate/location")
        alts = dict(ALT.findall(html))
        for lang in ("en", "ne"):
            if lang not in alts:
                errors.append(f"{me}: no hreflang {lang}")
            elif alts[lang] not in built:
                errors.append(f"{me}: hreflang {lang} -> {alts[lang]} not built")
        t = TITLE.search(html)
        d = DESC.search(html)
        indexable = 'content="noindex' not in html
        if not t or not t.group(1).strip():
            errors.append(f"{me}: empty title")
        elif indexable:
            titles[t.group(1)] += 1   # duplicates only matter among pages competing in search
        if not d or not d.group(1).strip():
            errors.append(f"{me}: empty description")
        else:
            descs[d.group(1)] += 1
        if images_built:
            m = OG.search(html)
            if m and not (root / m.group(1).lstrip("/")).exists():
                errors.append(f"{me}: social image missing {m.group(1)}")
    for t, n in titles.items():
        if n > 1:
            errors.append(f"duplicate title x{n}: {t}")
    dup_desc = sum(1 for n in descs.values() if n > 1)
    print(f"checked {len(pages):,} pages: {len(errors)} problems, {dup_desc} repeated descriptions")
    for e in errors[:50]:
        print("  -", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1] if len(sys.argv) > 1 else "build")))
