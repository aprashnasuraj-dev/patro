#!/usr/bin/env python3
"""
Build the static site: HTML pages (en + ne), social images, JSON API,
sitemaps and a build report.

    python -m generator.build                         # current BS year to 2100 (no past years)
    python -m generator.build --years 2083-2086       # smaller build
    python -m generator.build --no-images             # HTML only (fast)
    python -m generator.build --only festivals,treks  # some sections

Output (default ./build):
    build/places/...  build/ne/places/...   HTML pages
    build/og/...                            1200x630 social cards
    build/places-data/...                   JSON for the app/backend
    build/sitemaps/*.xml + sitemap-places.xml   sitemap index
    build/static/places/...                 CSS, JS, fonts
    build/report.json                       counts, approximations, overrides
    build/redirects-places.conf             301s for past-year URLs (include in nginx)
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from jinja2 import Environment, FileSystemLoader, select_autoescape  # noqa: E402

from engine import festivals as F  # noqa: E402
from generator import images, kati, life, model  # noqa: E402

TEMPLATES = {
    "place_festival": "place_festival.html", "place": "place.html", "festival": "festival.html",
    "festival_year": "festival_year.html", "peak": "peak.html", "peak_year": "peak_year.html",
    "trek": "trek.html", "trek_stop": "trek_stop.html", "index": "index.html",
    "kati_q": "kati_q.html", "kati_pair": "kati_pair.html", "kati_group": "kati_group.html",
    "kati_index": "kati_index.html", "kati_age": "kati_age.html", "kati_age_index": "kati_age_index.html",
    "janma_month": "janma_month.html", "janma_year": "janma_year.html", "janma_index": "janma_index.html",
    "shraddha": "shraddha.html", "sorha": "sorha.html", "shraddha_index": "shraddha_index.html",
}
SECTIONS = "places,festivals,mountains,treks,kati,janma,shraddha"

_env = None
_out: Path | None = None
_images = True


def _init(cfg_kwargs: dict, out: str, want_images: bool):
    global _env, _out, _images
    for k, v in cfg_kwargs.items():
        setattr(model.CFG, k, v)
    _env = Environment(loader=FileSystemLoader(str(ROOT / "generator" / "templates")),
                       autoescape=select_autoescape(["html"]), trim_blocks=True, lstrip_blocks=True)
    _out = Path(out)
    _images = want_images


def _ctx(task: tuple):
    kind, args = task[0], task[1:]
    fn = {
        "place_festival": model.place_festival_ctx, "place": model.place_ctx, "festival": model.festival_ctx,
        "festival_year": model.festival_year_ctx, "peak": model.peak_ctx, "peak_year": model.peak_year_ctx,
        "trek": model.trek_ctx, "trek_stop": model.trek_stop_ctx, "index": model.index_ctx,
        "kati_q": kati.question_ctx, "kati_pair": kati.pair_ctx, "kati_group": kati.group_ctx,
        "kati_index": kati.index_ctx, "kati_age": kati.age_ctx, "kati_age_index": kati.age_index_ctx,
        "janma_month": life.janma_month_ctx, "janma_year": life.janma_year_ctx, "janma_index": life.janma_index_ctx,
        "shraddha": life.shraddha_ctx, "sorha": life.sorha_ctx, "shraddha_index": life.shraddha_index_ctx,
    }[kind]
    return fn(*args)


def _write_og(spec: dict):
    path = _out / spec["path"].lstrip("/")
    if path.exists():
        return
    k = spec["kind"]
    if k == "festival":
        images.festival_card(path, seed=spec["seed"], day=spec.get("day", ""), month=spec.get("month", ""),
                             year=spec.get("year", ""), title=spec["title"], subtitle=spec["subtitle"],
                             place=spec["place"], line3=spec["line3"], tithi=spec.get("tithi"))
    elif k == "place":
        images.place_card(path, seed=spec["seed"], title=spec["title"], subtitle=spec["subtitle"],
                          line3=spec["line3"], line4=spec.get("line4", ""))
    elif k == "peak":
        images.peak_card(path, seed=spec["seed"], title=spec["title"], height=spec["height"],
                         line3=spec["line3"], line4=spec.get("line4", ""))
    elif k == "kati":
        images.kati_card(path, seed=spec["seed"], question=spec["question"], answer=spec["answer"], sub=spec["sub"])
    elif k == "trek":
        images.trek_card(path, seed=spec["seed"], title=spec["title"], subtitle=spec["subtitle"],
                         line3=spec["line3"], profile=spec["profile"], labels=spec.get("labels"))


def render(task: tuple) -> dict | None:
    ctx = _ctx(task)
    if ctx is None:
        return None
    html = _env.get_template(TEMPLATES[ctx["kind"]]).render(**ctx)
    rel = ctx["canonical"].split("://", 1)[1].split("/", 1)[1]
    path = _out / rel / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    if _images and ctx.get("_og"):
        _write_og(ctx["_og"])
    return {"kind": ctx["kind"], "lang": ctx["lang"], "loc": ctx["canonical"], "alt_en": ctx["alt_en"],
            "alt_ne": ctx["alt_ne"], "noindex": ctx["noindex"], "bytes": len(html.encode()), "json": ctx.get("_json")}


def tasks(langs: list[str], only: set[str], y0: int, y1: int) -> list[tuple]:
    out = []
    for lang in langs:
        for sec in ("places", "festivals", "mountains", "treks"):
            if sec in only:
                out.append(("index", sec, lang))
        if "places" in only:
            for pid, p in model.places().items():
                out.append(("place", pid, lang))
                for fe in p.get("festivals", []):
                    if fe["id"] not in model.rules():
                        continue
                    for it in model.instances(fe["id"]):
                        out.append(("place_festival", pid, fe["id"], it.key, lang))
        if "festivals" in only:
            for fid in model.rules():
                out.append(("festival", fid, lang))
                for it in model.instances(fid):
                    out.append(("festival_year", fid, it.key, lang))
        if "mountains" in only:
            for kid in model.peaks():
                out.append(("peak", kid, lang))
                for y in range(y0, y1 + 1):
                    out.append(("peak_year", kid, y, lang))
        if "treks" in only:
            for tid, tk in model.treks().items():
                out.append(("trek", tid, lang))
                for s in tk["stops"]:
                    out.append(("trek_stop", tid, s["id"], lang))
        if "kati" in only:
            out.extend(kati.all_tasks(lang))
        out.extend(life.all_tasks(lang, only))
    return out


def write_sitemaps(out: Path, results: list[dict], base_url: str, today: date):
    by_sec: dict[str, list] = defaultdict(list)
    for r in results:
        if r["noindex"] or r["lang"] != "en":
            continue  # one entry per page pair; alternates carry the Nepali URL
        segs = [x for x in r["loc"].split("://", 1)[1].split("/")[1:] if x]
        root_n = len([x for x in model.CFG.path_root.split("/") if x])
        sec = segs[root_n] if len(segs) > root_n else "root"
        by_sec[sec].append(r)
    sm_dir = out / "sitemaps"
    sm_dir.mkdir(parents=True, exist_ok=True)
    files = []
    for sec, rows in sorted(by_sec.items()):
        for i in range(0, len(rows), 20000):   # 20k pairs = 40k URLs, under the 50k limit
            chunk = rows[i:i + 20000]
            name = f"{sec}-{i // 20000 + 1}.xml"
            lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
            for r in chunk:
                for loc in (r["alt_en"], r["alt_ne"]):
                    lines.append(f"<url><loc>{escape(loc)}</loc><lastmod>{today.isoformat()}</lastmod>"
                                 f'<xhtml:link rel="alternate" hreflang="en" href="{escape(r["alt_en"])}"/>'
                                 f'<xhtml:link rel="alternate" hreflang="ne" href="{escape(r["alt_ne"])}"/>'
                                 f'<xhtml:link rel="alternate" hreflang="x-default" href="{escape(r["alt_en"])}"/></url>')
            lines.append("</urlset>")
            (sm_dir / name).write_text("\n".join(lines), encoding="utf-8")
            files.append(name)
    idx = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for f in files:
        idx.append(f"<sitemap><loc>{escape(base_url.rstrip('/'))}/sitemaps/{f}</loc><lastmod>{today.isoformat()}</lastmod></sitemap>")
    idx.append("</sitemapindex>")
    (out / "sitemap-places.xml").write_text("\n".join(idx), encoding="utf-8")
    (out / "robots-places.txt").write_text(
        "# Add this line to aafnaipatro.com/robots.txt\n"
        f"Sitemap: {base_url.rstrip('/')}/sitemap-places.xml\n", encoding="utf-8")
    return files


def write_api(out: Path, results: list[dict], y0: int, y1: int):
    api = out / "places-data"      # own namespace: never collides with the main site's /api
    for r in results:
        j = r.get("json")
        if not j or r["lang"] != "en":
            continue
        if r["kind"] == "place":
            p = api / "places" / f"{j['id']}.json"
        elif r["kind"] == "festival":
            p = api / "festivals" / "by-id" / f"{j['id']}.json"
        elif r["kind"] == "peak":
            p = api / "mountains" / f"{j['id']}.json"
        elif r["kind"] == "trek":
            p = api / "treks" / f"{j['id']}.json"
        else:
            continue
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(j, ensure_ascii=False, indent=1), encoding="utf-8")
    for y in range(y0, y1 + 1):
        occs = F.year_occurrences(y)
        data = [{"id": o.festival_id, "name_en": model.rules()[o.festival_id]["name_en"],
                 "name_ne": model.rules()[o.festival_id]["name_ne"], "date": o.date.isoformat(),
                 "bs": "-".join(map(str, o.bs)), "source": o.source, "approximate": o.approximate,
                 "tithi_start": o.tithi_start.isoformat() if o.tithi_start else None,
                 "tithi_end": o.tithi_end.isoformat() if o.tithi_end else None,
                 "places": [pl["id"] for pl, _ in model.festival_places().get(o.festival_id, [])]} for o in occs]
        p = api / "festivals" / f"{y}.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps({"bs_year": y, "festivals": data}, ensure_ascii=False, indent=1), encoding="utf-8")


def write_by_date(out: Path, y0: int, y1: int):
    """places-data/festivals/by-date.json: {"2026-11-08": [{id, name_en, name_ne, url_en, url_ne}]}.
    Used by static/places/festival-links.js on the site's existing /date/ pages."""
    m: dict[str, list] = defaultdict(list)
    for fid, rule in model.rules().items():
        for it in model.instances(fid):
            for k in range(it.occ.span_days):
                d = it.occ.date + __import__("datetime").timedelta(days=k)
                m[d.isoformat()].append({"id": fid, "name_en": rule["name_en"], "name_ne": rule["name_ne"],
                                         "day": k + 1, "url_en": model.url("en", "festivals", fid, it.key),
                                         "url_ne": model.url("ne", "festivals", fid, it.key)})
    p = out / "places-data" / "festivals" / "by-date.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(dict(sorted(m.items())), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_redirects(out: Path, first_year: int):
    """nginx rules: when the build moves past a year, its URLs 301 to the hub
    page instead of returning 404 (keeps links and rankings)."""
    old = "|".join(str(y) for y in range(2070, first_year))
    root = model.CFG.path_root.rstrip("/")
    lines = ["# Generated by generator/build.py. Include inside your server {} block.",
             f"# Years before {first_year} are no longer built; send them to the hub pages."]
    if old:
        lines += [
            f"rewrite ^(/ne)?{root}/festivals/([a-z0-9-]+)/({old})(-[a-z0-9-]+)?/?$ $1{root}/festivals/$2/ permanent;",
            f"rewrite ^(/ne)?{root}/places/([a-z0-9-]+)/[a-z0-9-]+?-({old})(-[a-z0-9-]+)?/?$ $1{root}/places/$2/ permanent;",
            f"rewrite ^(/ne)?{root}/mountains/([a-z0-9-]+)/({old})/?$ $1{root}/mountains/$2/ permanent;",
            f"rewrite ^(/ne)?{root}/shraddha/sorha-shraddha/({old})/?$ $1{root}/shraddha/ permanent;",
        ]
    (out / "redirects-places.conf").write_text("\n".join(lines) + "\n", encoding="utf-8")


def report(out: Path, results: list[dict], y0: int, y1: int, secs: float):
    kinds = Counter((r["kind"], r["lang"]) for r in results)
    approx, disagree = [], []
    gaps = []
    for fid in model.rules():
        have = {it.year for it in model.instances(fid)}
        missing = [y for y in range(y0, y1 + 1) if y not in have]
        if missing:
            gaps.append({"festival": fid, "bs_years_without": missing})
        for it in model.instances(fid):
            o = it.occ
            if o.approximate:
                approx.append({"festival": fid, "key": it.key, "date": o.date.isoformat(), "why": o.note})
            if o.source == "official-override" and o.computed_date != o.date:
                disagree.append({"festival": fid, "key": it.key, "computed": o.computed_date.isoformat(), "official": o.date.isoformat()})
    og_files = list((out / "og").rglob("*.jpg")) if (out / "og").exists() else []
    rep = {
        "built": model.CFG.today.isoformat(), "years": [y0, y1], "seconds": round(secs, 1),
        "pages_total": len(results), "pages_indexable": sum(1 for r in results if not r["noindex"]),
        "pages_by_kind": {f"{k}/{lang}": n for (k, lang), n in sorted(kinds.items())},
        "html_bytes": sum(r["bytes"] for r in results),
        "og_images": len(og_files), "og_bytes": sum(f.stat().st_size for f in og_files),
        "approximate_dates": approx, "override_disagreements": disagree,
        "years_without_occurrence": gaps,
    }
    (out / "report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    return rep


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(ROOT / "build"))
    ap.add_argument("--years", default=None, help="BS year range, e.g. 2083-2090 (default: current BS year to 2100)")
    ap.add_argument("--langs", default="en,ne")
    ap.add_argument("--only", default=SECTIONS, help=f"Sections to build (default: {SECTIONS})")
    ap.add_argument("--base-url", default="https://aafnaipatro.com")
    ap.add_argument("--asset-prefix", default="/static/places")
    ap.add_argument("--path-root", default="", help='Mount all sections under a prefix, e.g. "/explore"')
    ap.add_argument("--today", default=None, help="Build date YYYY-MM-DD (default: today in Nepal)")
    ap.add_argument("--image-years", default=None, help="BS years with per-page cards, e.g. 2082-2085")
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--index-osm", action="store_true", help="Index OSM-imported places immediately")
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 2)
    ap.add_argument("--clean", action="store_true")
    a = ap.parse_args()

    if a.today:
        model.CFG.today = date.fromisoformat(a.today)
    years = a.years or f"{model.CFG.current_bs_year}-2100"
    y0, y1 = (int(x) for x in years.split("-"))
    cfg = {"base_url": a.base_url, "first_year": y0, "last_year": y1, "asset_prefix": a.asset_prefix,
           "index_osm": a.index_osm, "path_root": a.path_root.rstrip("/"),
           "sections": tuple(x.strip() for x in a.only.split(",") if x.strip())}
    if a.today:
        cfg["today"] = date.fromisoformat(a.today)
    if a.image_years:
        i0, i1 = (int(x) for x in a.image_years.split("-"))
        cfg["image_years"] = tuple(range(i0, i1 + 1))
    out = Path(a.out)
    if a.clean and out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)

    # static assets
    st = out / a.asset_prefix.strip("/")
    shutil.copytree(ROOT / "generator" / "static", st, dirs_exist_ok=True)

    _init(cfg, str(out), not a.no_images)
    if not a.no_images:
        images.place_card(st / "og-default.jpg", seed="aafnaipatro", title="आफ्नै पात्रो",
                          subtitle="Aafnai Patro", line3="चाडपर्व, धार्मिक स्थल, हिमाल र पदयात्रा",
                          line4="Festivals, sacred places, mountains, treks and everyday measurements")

    # warm caches in the parent so forked workers inherit them
    t0 = time.time()
    model.places(); model.peaks(); model.treks(); model.festival_places()
    from engine import lunar
    lunar.month_table()
    for fid in model.rules():
        if model.rules()[fid]["type"] == "lunar":
            F._all_lunar(fid)
    for fid in model.rules():
        model.instances(fid)

    todo = tasks(a.langs.split(","), set(a.only.split(",")), y0, y1)
    print(f"{len(todo):,} pages to render with {a.workers} workers")
    results = []
    if a.workers <= 1:
        for i, tk in enumerate(todo):
            r = render(tk)
            if r:
                results.append(r)
    else:
        import multiprocessing as mp
        ctx = mp.get_context("fork")
        with ProcessPoolExecutor(a.workers, mp_context=ctx, initializer=_init,
                                 initargs=(cfg, str(out), not a.no_images)) as ex:
            futs = [ex.submit(render, tk) for tk in todo]
            for i, f in enumerate(as_completed(futs)):
                r = f.result()
                if r:
                    results.append(r)
                if (i + 1) % 2000 == 0:
                    print(f"  {i + 1:,}/{len(todo):,}  {time.time() - t0:.0f}s", flush=True)

    sub = out / a.path_root.strip("/") if a.path_root.strip("/") else out
    files = write_sitemaps(sub, results, a.base_url.rstrip("/") + a.path_root.rstrip("/"), model.CFG.today)
    write_api(sub, results, y0, y1)
    write_by_date(sub, y0, y1)
    write_redirects(out, y0)
    rep = report(out, results, y0, y1, time.time() - t0)
    print(json.dumps({k: rep[k] for k in ("pages_total", "pages_indexable", "og_images", "seconds")}, indent=1))
    print(f"sitemaps: {len(files)} files, index at {out / 'sitemap-places.xml'}")


if __name__ == "__main__":
    main()
