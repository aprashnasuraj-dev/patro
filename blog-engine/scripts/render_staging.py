#!/usr/bin/env python3
"""Render isolated noindex previews and one sitemap containing approved pages only."""
import argparse,html,json,re
from pathlib import Path
from urllib.parse import urlparse
ALLOWED={"articles","blog","facts","what"}
def md_to_html(text):
 out=[];paragraph=[];in_list=False
 def flush():
  if paragraph:out.append("<p>"+html.escape(" ".join(paragraph))+"</p>");paragraph.clear()
 for raw in (text or "").splitlines():
  line=raw.strip()
  if not line:
   flush()
   if in_list:out.append("</ul>");in_list=False
   continue
  if line.startswith("#"):
   flush()
   if in_list:out.append("</ul>");in_list=False
   n=min(6,len(line)-len(line.lstrip("#")));out.append(f"<h{n}>"+html.escape(line[n:].strip())+f"</h{n}>")
  elif line.startswith(("- ","* ")):
   flush()
   if not in_list:out.append("<ul>");in_list=True
   out.append("<li>"+html.escape(line[2:])+"</li>")
  else:paragraph.append(line)
 flush()
 if in_list:out.append("</ul>")
 return "\n".join(out)
def main():
 p=argparse.ArgumentParser();p.add_argument("--input",required=True);p.add_argument("--output",required=True);a=p.parse_args()
 source=Path(a.input);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
 files=sorted(source.glob("*.json")) if source.exists() else []
 rendered=[];approved=[]
 for file in files:
  try:item=json.loads(file.read_text(encoding="utf-8"))
  except (OSError,ValueError):continue
  title=str(item.get("title","")).strip();url=str(item.get("url","")).strip();body=item.get("draft","")
  parsed=urlparse(url)
  if not title or parsed.scheme!="https" or parsed.netloc!="aafnaipatro.com":continue
  parts=[x for x in parsed.path.split("/") if x]
  if len(parts)!=2 or parts[0] not in ALLOWED or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",parts[1]):continue
  dest=out/parts[0]/parts[1];dest.mkdir(parents=True,exist_ok=True)
  html_doc='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Editorial preview — not approved for publication"><link rel="canonical" href="'''+html.escape(url,quote=True)+'''"><title>'''+html.escape(title)+''' | AafnaiPatro Preview</title><style>body{font:18px/1.7 system-ui,sans-serif;max-width:850px;margin:3rem auto;padding:0 1.2rem;color:#172033}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f6f8;padding:1rem;border-radius:8px}.notice{background:#fff4d7;padding:1rem;border-radius:8px}</style></head><body><p class="notice">STAGING PREVIEW — not approved, not indexed, not in the public sitemap.</p><h1>'''+html.escape(title)+'''</h1><main>'''+md_to_html(body)+'''</main><h2>Sources for editorial review</h2><ul>'''
  for src in item.get("sources",[]):
   su=src.get("url","");st=src.get("title","Source")
   if su.startswith("https://"):html_doc+="<li><a rel=\\"nofollow noopener\\" href=\\""+html.escape(su,quote=True)+"\\">"+html.escape(st)+"</a> — "+html.escape(src.get("publisher",""))+"</li>"
  html_doc+="</ul></body></html>"
  (dest/"index.html").write_text(html_doc,encoding="utf-8");rendered.append(url)
  if item.get("publishable") is True and item.get("status") in ("approved","published") and item.get("verification_passed") is True:approved.append(url)
 sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
 for url in sorted(set(approved)):sitemap+="  <url><loc>"+html.escape(url)+"</loc></url>\n"
 sitemap+="</urlset>\n";(out/"sitemap-missionmangal.xml").write_text(sitemap,encoding="utf-8")
 report={"preview_pages":len(rendered),"approved_urls_in_sitemap":len(set(approved)),"sitemap_path":str(out/"sitemap.xml"),"production_changed":False,"note":"Preview pages carry noindex/nofollow. Only explicitly approved and verified records enter the single sitemap; no drafts are auto-approved."}
 (out/"render-report.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8");print(json.dumps(report,indent=2))
if __name__=="__main__":main()
