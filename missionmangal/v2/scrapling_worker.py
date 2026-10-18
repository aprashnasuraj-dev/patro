#!/usr/bin/env python3
"""Polite page extractor built on Scrapling (https://github.com/D4Vinci/Scrapling).
stdin: JSON list of URLs. stdout: JSON list of {url, ok, title, published, text, error}.
Rules: robots.txt is checked BEFORE every fetch (our own UA, then '*'), >=delay between hits to the same host, noai/noindex opt-outs honoured,
plain HTTP fetch only (no stealth / anti-bot evasion, no CAPTCHA tricks). Text is returned transiently; the Node side stores only short excerpts + a hash."""
import sys, json, time, re, socket, ipaddress
from urllib.parse import urlparse
from urllib import robotparser, request, error
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
def safe_public_url(url):
    p = urlparse(url)
    if p.scheme != "https" or not p.hostname or p.username or p.password:
        raise PermissionError("HTTPS URL required")
    host = p.hostname.lower()
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
        raise PermissionError("local host blocked")
    try:
        addresses = {x[4][0] for x in socket.getaddrinfo(host, p.port or 443, type=socket.SOCK_STREAM)}
    except Exception:
        raise PermissionError("host DNS resolution failed")
    if not addresses:
        raise PermissionError("host has no addresses")
    for address in addresses:
        ip = ipaddress.ip_address(address.split("%")[0])
        if not ip.is_global:
            raise PermissionError("non-public IP blocked")
    return p

def allowed(url):
    p = safe_public_url(url)
    origin = p.scheme + "://" + p.netloc
    if origin not in robots:
        rp = robotparser.RobotFileParser()
        robots_url = origin + "/robots.txt"
        try:
            req = request.Request(robots_url, headers={"user-agent": UA})
            with request.urlopen(req, timeout=5) as response:
                if response.status != 200:
                    raise PermissionError("robots policy status unknown")
                raw = response.read(262144).decode("utf-8", "replace")
            rp.set_url(robots_url)
            rp.parse(raw.splitlines())
            robots[origin] = rp
        except error.HTTPError as e:
            if e.code == 404:
                rp.set_url(robots_url)
                rp.parse([])
                robots[origin] = rp
            else:
                robots[origin] = None
                raise PermissionError("robots policy unavailable")
        except Exception:
            robots[origin] = None
            raise PermissionError("robots policy unavailable")
    rp = robots[origin]
    if rp is None:
        raise PermissionError("robots policy unknown")
    if not rp.can_fetch(UA, url):
        raise PermissionError("disallowed by robots.txt")
    return True
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
        safe_public_url(url)
        if not allowed(url): raise PermissionError("disallowed by robots.txt")
        host = urlparse(url).netloc; wait = DELAY - (time.time() - last.get(host, 0))
        if wait > 0: time.sleep(wait)
        last[host] = time.time()
        page = Fetcher.get(url, timeout=20, follow_redirects=False, headers={"user-agent": UA})
        status = getattr(page, "status", 200)
        if 300 <= status < 400: raise PermissionError("redirect not followed; use canonical URL")
        if status != 200: raise RuntimeError("HTTP %s" % status)
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
