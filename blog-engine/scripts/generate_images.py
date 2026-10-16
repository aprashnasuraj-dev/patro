#!/usr/bin/env python3
"""Generate a topic-specific image per draft with Pollinations; resumable and quota-aware.

If no valid key is configured, retain verified Commons media and report missing images.
Never stores the API key in a file or query string.
"""
import argparse, hashlib, json, os, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

def slug(value):
    value=re.sub(r"[^a-z0-9]+","-",value.casefold()).strip("-")
    return value[:90] or "article"

def request_image(prompt, key, timeout=90):
    url="https://gen.pollinations.ai/image/"+urllib.parse.quote(prompt, safe="")+"?width=768&height=768&safe=true"
    for attempt in range(5):
        req=urllib.request.Request(url,headers={"Authorization":"Bearer "+key,"User-Agent":"AafnaiPatroEditorialImageBot/1.0","Accept":"image/jpeg,image/png,image/webp"})
        try:
            with urllib.request.urlopen(req,timeout=timeout) as response:
                content_type=response.headers.get("Content-Type","").split(";",1)[0].lower()
                data=response.read(15_000_000)
            if content_type not in ("image/jpeg","image/png","image/webp") or len(data)<4096:
                raise ValueError("Provider response was not a valid image payload")
            ext={"image/jpeg":".jpg","image/png":".png","image/webp":".webp"}[content_type]
            return data,ext,content_type
        except urllib.error.HTTPError as e:
            if e.code not in (408,425,429,500,502,503,504) or attempt==4:
                raise
            retry=e.headers.get("Retry-After") if e.headers else None
            try: wait=min(180,max(1,float(retry))) if retry else min(120,10*(2**attempt))
            except (ValueError,TypeError): wait=min(120,10*(2**attempt))
            time.sleep(wait)
    raise RuntimeError("Image retry budget exhausted")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True)
    p.add_argument("--delay",type=float,default=2.0)
    p.add_argument("--max-new",type=int,default=2500)
    a=p.parse_args()
    root=Path(a.input);key=os.environ.get("POLLINATIONS_API_KEY","").strip()
    files=sorted(root.glob("*.json")) if root.exists() else []
    report={"draft_files":len(files),"generated":0,"existing":0,"commons_fallback":0,"missing":0,"failed":0,"provider":"pollinations","note":"Generated image files are staging assets; review them before publication."}
    asset_dir=root/"images";asset_dir.mkdir(parents=True,exist_ok=True)
    for i,file in enumerate(files):
        try:item=json.loads(file.read_text(encoding="utf-8"))
        except (OSError,ValueError):report["failed"]+=1;continue
        existing=item.get("generated_image")
        if existing and existing.get("path") and (root/existing["path"]).exists():
            report["existing"]+=1;continue
        if not key:
            if any(m.get("rights_verified") is True and str(m.get("url","")).startswith("https://") for m in item.get("media",[])):
                report["commons_fallback"]+=1
            else:report["missing"]+=1
            continue
        if report["generated"]>=a.max_new:
            report["missing"]+=1;continue
        title=str(item.get("title","")).strip()
        if not title:
            report["failed"]+=1;continue
        prompt=("Create a clear, original editorial illustration for an educational article titled: "+title+
                ". No text, letters, watermarks, logos, or misleading real-person depictions. Accurate conceptual imagery, clean composition, accessible contrast.")
        seed=int(hashlib.sha256(str(item.get("id",title)).encode()).hexdigest()[:8],16)
        prompt += " Consistent seed identifier "+str(seed)+"."
        try:
            data,ext,ctype=request_image(prompt,key)
            filename=slug(item.get("id",title))+ext
            target=asset_dir/filename
            target.write_bytes(data)
            item["generated_image"]={"path":"images/"+filename,"alt":"Editorial illustration for "+title,"provider":"Pollinations","content_type":ctype,"generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"review_required":True}
            file.write_text(json.dumps(item,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
            report["generated"]+=1
        except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,OSError,ValueError) as e:
            report["failed"]+=1
            print("Image failed for "+str(item.get("id","unknown"))+": "+type(e).__name__)
        if a.delay and i<len(files)-1:time.sleep(a.delay)
        if (i+1)%20==0:
            (root/"image-generation-report.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    (root/"image-generation-report.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))
if __name__=="__main__":main()
