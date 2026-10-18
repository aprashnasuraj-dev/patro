#!/usr/bin/env python3
"""Polite page extractor built on Scrapling (https://github.com/D4Vinci/Scrapling).
stdin: JSON list of URLs. stdout: JSON list of {url, ok, title, published, text, error}.
Rules: robots.txt is checked BEFORE every fetch (our own UA, then '*'), >=delay between hits to the same host, noai/noindex opt-outs honoured,
plain HTTP fetch only (no stealth / anti-bot evasion, no CAPTCHA tricks). Text is returned transiently; the Node side stores only short excerpts + a hash."""
import sys, json, time, re
from urllib.parse import urlparse
from urllib import robotparser
UA = "AafnaiPatroResearchBot/1.0 (+https://aafnaipatro.com/editorial-guidelines/)"
DELAY = float(sys.argv[1]) if len(sys.argv) > 1 else 1.2
try:
    from scrapling.fetchers import Fetcher
except Exception:
    try:
        from scrapling import Fetcher
    except Exception as e:
        print(json.dumps([{"url": None, "ok": False, "error": "scrapling not installed: %s" % e}])); sys.exit(0)
robots, last = {}, {}
def allowed(url):
    p = urlparse(url); host = p.scheme + "://" + p.netloc
    if host not in robots:
        rp = robotparser.RobotFileParser(); rp.set_url(host + "/robots.txt")
        try: rp.read()
        except Exception: rp = None
        robots[host] = rp
    rp = robots[host]
    return True if rp is None else rp.can_fetch(UA, url)
def text_of(page):
    try:
        paras = [t.strip() for t in page.css("p::text").getall() if t and len(t.strip()) > 40]
        if paras: return " ".join(paras)
    except Exception: pass
    try: return page.get_all_text(separator=" ")
    except Exception: return ""
out = []
for url in json.load(sys.stdin):
    row = {"url": url, "ok": False}
    try:
        if not url.startswith("https://"): raise ValueError("https only")
        if not allowed(url): raise PermissionError("disallowed by robots.txt")
        host = urlparse(url).netloc; wait = DELAY - (time.time() - last.get(host, 0))
        if wait > 0: time.sleep(wait)
        last[host] = time.time()
        page = Fetcher.get(url, timeout=20, follow_redirects=True, headers={"user-agent": UA})
        if getattr(page, "status", 200) != 200: raise RuntimeError("HTTP %s" % page.status)
        hdr = {str(k).lower(): str(v) for k, v in (getattr(page, "headers", {}) or {}).items()}
        if re.search(r"noai|noindex|none", hdr.get("x-robots-tag", ""), re.I): raise PermissionError("X-Robots-Tag opt-out")
        html = str(getattr(page, "html_content", "") or "")
        if re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*(noai|noarchive)', html, re.I): raise PermissionError("meta robots opt-out")
        title = None
        try: title = page.css("title::text").get()
        except Exception: pass
        pub = None
        try: pub = page.css('meta[property="article:published_time"]::attr(content)').get()
        except Exception: pass
        row.update(ok=True, title=(title or "").strip() or None, published=pub, text=text_of(page)[:60000])
    except Exception as e:
        row["error"] = str(e)[:120]
    out.append(row)
print(json.dumps(out))
