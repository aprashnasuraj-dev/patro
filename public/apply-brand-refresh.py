#!/usr/bin/env python3
"""Run in the root of aprashnasuraj-dev/patro after copying the public/ assets."""
from pathlib import Path
import re
root=Path.cwd()
sw=root/"public/sw.js"
if sw.exists():
    s=sw.read_text(encoding="utf-8")
    s=re.sub(r'(const VERSION = "aafnai-pwa-v)(\d+)(";)',lambda m:m[1]+str(int(m[2])+1)+m[3],s,count=1)
    s=re.sub(r'(const SHELL_CACHE = "aafnai-shell-v)(\d+)(";)',lambda m:m[1]+str(int(m[2])+1)+m[3],s,count=1)
    if '"/apple-touch-icon.png"' not in s:
        s=s.replace('"/maskable-512.png"', '"/maskable-512.png", "/apple-touch-icon.png"')
    sw.write_text(s,encoding="utf-8")
index=root/"index.html"
if index.exists():
    s=index.read_text(encoding="utf-8")
    if 'rel="shortcut icon"' not in s:
        s=s.replace('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
                    '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />\n'
                    '  <link rel="shortcut icon" href="/favicon.ico" sizes="any" />')
    index.write_text(s,encoding="utf-8")
print("Icon/PWA references updated. Confirm in-app logo usage separately; test and build before deployment.")
