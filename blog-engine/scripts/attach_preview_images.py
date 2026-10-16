#!/usr/bin/env python3
"""Attach generated or rights-cleared lead images to isolated noindex preview pages."""
import argparse, html, json, shutil
from pathlib import Path
from urllib.parse import urlparse

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--drafts",required=True)
    p.add_argument("--site",required=True)
    a=p.parse_args()
    drafts=Path(a.drafts);site=Path(a.site)
    report={"attached_generated":0,"attached_commons":0,"missing":0,"errors":0}
    for file in sorted(drafts.glob("*.json")):
        try:item=json.loads(file.read_text(encoding="utf-8"))
        except (OSError,ValueError):
            report["errors"]+=1
            continue
        parsed=urlparse(str(item.get("url","")))
        parts=[x for x in parsed.path.split("/") if x]
        if parsed.scheme!="https" or parsed.netloc!="aafnaipatro.com" or len(parts)!=2:
            continue
        page=site/parts[0]/parts[1]/"index.html"
        if not page.is_file():
            continue
        markup=page.read_text(encoding="utf-8")
        if "<main>" not in markup or "<figure>" in markup:
            continue
        generated=item.get("generated_image") or {}
        filename=Path(str(generated.get("path",""))).name
        source=drafts/"images"/filename if filename else None
        if source and source.is_file():
            target_dir=page.parent/"images"
            target_dir.mkdir(parents=True,exist_ok=True)
            shutil.copy2(source,target_dir/filename)
            alt=html.escape(str(generated.get("alt") or "Editorial illustration for "+str(item.get("title",""))),quote=True)
            figure='<figure><img src="images/'+html.escape(filename,quote=True)+'" alt="'+alt+'" loading="lazy" decoding="async" style="max-width:100%;height:auto;border-radius:12px"><figcaption>AI-generated editorial illustration — review required before publication</figcaption></figure>'
            report["attached_generated"]+=1
        else:
            media=next((m for m in item.get("media",[]) if m.get("rights_verified") is True and str(m.get("url","")).startswith("https://")),None)
            if not media:
                report["missing"]+=1
                continue
            url=html.escape(media["url"],quote=True)
            alt=html.escape(str(media.get("alt") or media.get("title") or item.get("title","")),quote=True)
            credit=html.escape(str(media.get("credit") or media.get("publisher") or "Image attribution"))
            lic=html.escape(str(media.get("license") or "License metadata"))
            source_page=str(media.get("source_page") or "")
            attribution=credit+" — "+lic
            if source_page.startswith("https://"):
                attribution+=' <a rel="nofollow noopener" href="'+html.escape(source_page,quote=True)+'">Source and license</a>'
            figure='<figure><img src="'+url+'" alt="'+alt+'" loading="lazy" decoding="async" style="max-width:100%;height:auto;border-radius:12px"><figcaption>'+attribution+'</figcaption></figure>'
            report["attached_commons"]+=1
        page.write_text(markup.replace("<main>","<main>"+figure,1),encoding="utf-8")
    (site/"image-attachment-report.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))
if __name__=="__main__":
    main()
