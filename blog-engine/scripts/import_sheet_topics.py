#!/usr/bin/env python3
"""Import existing editorial topics from a published Google Sheets CSV export.

This intentionally accepts a read-only export URL, never an OAuth token. It supports
common column names and preserves every non-empty unique topic while merging seed rows.
"""
import argparse, csv, io, json, os, re, sys, urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError

ALIASES = {
    "title": ("title", "topic", "article", "article title", "headline", "subject", "question", "keyword", "primary keyword", "blog title", "name"),
    "category": ("category", "section", "niche", "topic category", "content category"),
    "intent": ("intent", "search intent", "description", "brief", "query", "primary query"),
    "type": ("type", "content type", "format"),
}

def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).strip()

def find_col(headers, names):
    by_norm = {norm(h): i for i, h in enumerate(headers)}
    for name in names:
        if norm(name) in by_norm:
            return by_norm[norm(name)]
    return None

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", default=os.environ.get("TOPIC_SHEET_CSV_URL", "https://docs.google.com/spreadsheets/d/1E7QpDpKjDEo4DVRc5IZM7hlo5YI1SeJK/export?format=csv&gid=0"))
    p.add_argument("--seeds", default="blog-engine/data/topic-seeds.json")
    p.add_argument("--output", default=".missionmangal-staging/sheet-import-report.json")
    p.add_argument("--merged-seeds", default=".missionmangal-staging/merged-topic-seeds.json")
    a = p.parse_args()
    report = {"status": "not-configured", "imported": 0, "skipped": 0, "errors": []}
    seeds_path = Path(a.seeds)
    seeds = json.loads(seeds_path.read_text(encoding="utf-8"))
    merged = list(seeds)
    seen = {norm(row.get("title")) for row in merged if row.get("title")}
    if not a.url:
        report["errors"].append("No sheet CSV export URL configured.")
    else:
        req = urllib.request.Request(a.url, headers={"User-Agent": "AafnaiPatroTopicImporter/1.0", "Accept": "text/csv,text/plain,*/*"})
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                raw = response.read(30_000_000)
            text = raw.decode("utf-8-sig", errors="replace")
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                raise ValueError("Sheet export was empty.")
            headers = rows[0]
            title_i = find_col(headers, ALIASES["title"])
            if title_i is None:
                raise ValueError("No recognized topic/title column. Headers: " + ", ".join(headers[:30]))
            indexes = {k: find_col(headers, v) for k, v in ALIASES.items()}
            for row_num, row in enumerate(rows[1:], start=2):
                if title_i >= len(row):
                    report["skipped"] += 1
                    continue
                title = " ".join(row[title_i].split()).strip()
                key = norm(title)
                if len(title) < 8 or not key or key in seen:
                    report["skipped"] += 1
                    continue
                def cell(name, default=""):
                    i = indexes.get(name)
                    return row[i].strip() if i is not None and i < len(row) else default
                category = cell("category", "general").strip() or "general"
                merged.append({
                    "title": title,
                    "category": category.casefold(),
                    "type": cell("type", "article").strip().casefold() or "article",
                    "intent": cell("intent", title).strip() or title,
                    "evidence_depth": 0,
                    "discovery_source": "google-sheets",
                    "sheet_row": row_num,
                })
                seen.add(key)
                report["imported"] += 1
            report["status"] = "imported"
            report["sheet_rows_seen"] = max(0, len(rows) - 1)
            report["headers"] = headers[:50]
        except (HTTPError, URLError, TimeoutError, OSError, UnicodeError, ValueError) as e:
            report["status"] = "failed"
            report["errors"].append(type(e).__name__ + ": " + str(e)[:500])
            print("Sheet import failed; retaining curated seeds and recording the failure.", file=sys.stderr)
    Path(a.merged_seeds).parent.mkdir(parents=True, exist_ok=True)
    Path(a.merged_seeds).write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(a.output).parent.mkdir(parents=True, exist_ok=True)
    report["curated_seed_count"] = len(seeds)
    report["merged_unique_count"] = len(merged)
    Path(a.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("status", "imported", "skipped", "curated_seed_count", "merged_unique_count", "errors")}, ensure_ascii=False))
    # Keep workflow resilient; the report explicitly records when the sheet was unavailable.
if __name__ == "__main__":
    main()
