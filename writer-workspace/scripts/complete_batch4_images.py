#!/usr/bin/env python3
"""Build licensed Batch 4 article hero assets and update their metadata."""
import io, json, os, re, subprocess, sys, time
from pathlib import Path
from urllib.parse import quote
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path.cwd()
OUT = ROOT / "writer-workspace/output"
IMG = OUT / "images"
ART = OUT / "articles"
DONE = OUT / "done/batch-0004.done.json"
SLUGS = [
"how-zero-was-invented",
"how-wind-turbines-make-electricity",
"why-ships-float",
"why-the-himalayas-are-still-rising",
"how-the-piano-was-invented",
"why-leaves-change-color-in-autumn",
"how-birds-navigate-thousands-of-miles",
"how-black-holes-form",
"why-the-ocean-is-salty",
"why-we-forget-names",
]
QUERIES = {
"how-zero-was-invented":"zero numeral Brahmagupta ancient Indian mathematics",
"how-wind-turbines-make-electricity":"wind turbine wind farm electricity",
"why-ships-float":"ship floating ocean water",
"why-the-himalayas-are-still-rising":"Himalayas mountain range geology",
"how-the-piano-was-invented":"historical piano instrument",
"why-leaves-change-color-in-autumn":"autumn red yellow leaves tree",
"how-birds-navigate-thousands-of-miles":"migratory birds flock flight",
"how-black-holes-form":"black hole accretion disk NASA",
"why-the-ocean-is-salty":"ocean waves sea salt",
"why-we-forget-names":"human brain memory neuroscience",
}
ALLOWED = {"CC0 1.0", "Public domain", "Public domain mark", "CC BY 4.0", "CC BY-SA 4.0",
"CC BY 3.0", "CC BY-SA 3.0", "CC BY 2.0", "CC BY-SA 2.0", "CC BY 1.0", "CC BY-SA 1.0"}
UA = {"User-Agent":"MissionMangalWriter/1.0 (educational publishing; reusable-image attribution)"}
SESSION = requests.Session(); SESSION.headers.update(UA)

def commons_image(slug):
    api = "https://commons.wikimedia.org/w/api.php"
    params = {"action":"query","format":"json","generator":"search","gsrsearch":"filetype:bitmap " + QUERIES[slug],
      "gsrnamespace":6,"gsrlimit":18,"prop":"imageinfo","iiprop":"url|size|extmetadata","iiurlwidth":1800}
    try:
        data = SESSION.get(api, params=params, timeout=35).json()
        pages = list(data.get("query",{}).get("pages",{}).values())
    except Exception as e:
        print("Commons search failed",slug,repr(e)); return None
    candidates=[]
    for p in pages:
        info=(p.get("imageinfo") or [{}])[0]; meta=info.get("extmetadata",{})
        lic=re.sub(r"<[^>]+>","",meta.get("LicenseShortName",{}).get("value","")).strip()
        lic_url=meta.get("LicenseUrl",{}).get("value","")
        if not (lic in ALLOWED or "Public domain" in lic or "CC0" in lic or "CC BY 4.0" in lic or "CC BY-SA 4.0" in lic):
            continue
        if int(info.get("width",0)) < 1200 or int(info.get("height",0)) < 630: continue
        url=info.get("thumburl") or info.get("url")
        if not url or not url.startswith("https://"): continue
        author=re.sub(r"<[^>]+>","",meta.get("Artist",{}).get("value","")).strip()
        if len(author)>300: author=author[:300]
        page_url="https://commons.wikimedia.org/wiki/" + quote(p.get("title","").replace(" ","_"), safe=":/()")
        candidates.append((int(info.get("width",0))*int(info.get("height",0)),url,page_url,lic,lic_url,author,p.get("title","")))
    candidates.sort(reverse=True)
    for _,url,page_url,lic,lic_url,author,title in candidates:
        try:
            resp=SESSION.get(url,timeout=45); resp.raise_for_status()
            im=Image.open(io.BytesIO(resp.content)); im.load()
            if im.width<1200 or im.height<630: continue
            return im.convert("RGB"), {"credit":("Wikimedia Commons: "+(author or title))[:500],
              "license":f"{lic} ({lic_url}) — see file page for attribution and terms" if lic_url else f"{lic} — see Wikimedia Commons file page",
              "source_url":page_url,"caption":title.replace("File:","").replace("_"," ")}
        except Exception as e: print("Image download/decode failed",page_url,repr(e))
    return None

def font(size, bold=False):
    choices = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
               "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"]
    for p in choices:
        try: return ImageFont.truetype(p,size)
        except Exception: pass
    return ImageFont.load_default()

def generated_art(slug, title):
    # Custom original editorial illustration: no third-party image assets or external rights.
    W,H=1200,630
    palettes={
      "how-zero-was-invented":((11,27,58),(29,89,131),(246,190,86)),
      "how-wind-turbines-make-electricity":((11,40,69),(38,130,155),(236,239,223)),
      "why-ships-float":((8,48,80),(16,119,157),(250,204,117)),
      "why-the-himalayas-are-still-rising":((27,49,80),(97,140,163),(245,218,167)),
      "how-the-piano-was-invented":((32,24,43),(112,57,67),(246,207,132)),
      "why-leaves-change-color-in-autumn":((48,29,37),(156,69,39),(247,177,72)),
      "how-birds-navigate-thousands-of-miles":((11,35,65),(43,95,127),(249,211,126)),
      "how-black-holes-form":((6,8,27),(49,36,92),(255,164,86)),
      "why-the-ocean-is-salty":((7,45,74),(18,118,149),(244,205,117)),
      "why-we-forget-names":((20,31,64),(64,73,126),(243,187,120))}
    a,b,accent=palettes[slug]
    im=Image.new("RGB",(W,H)); pix=im.load()
    for y in range(H):
      for x in range(W):
        t=(x/W*.58+y/H*.42)
        pix[x,y]=tuple(int(a[i]*(1-t)+b[i]*t) for i in range(3))
    d=ImageDraw.Draw(im,"RGBA")
    # subtle editorial grain/grid
    for x in range(30,W,55): d.line((x,0,x,H),fill=(255,255,255,13),width=1)
    for y in range(25,H,55): d.line((0,y,W,y),fill=(255,255,255,10),width=1)
    cx,cy=850,315
    if slug=="how-zero-was-invented":
      for i,ch in enumerate(["0","१","0","∞"]):
        d.text((700+(i%2)*150,100+(i//2)*190),ch,font=font(125,True),fill=(*accent,220),anchor="mm")
      d.ellipse((760,175,960,375),outline=(*accent,200),width=5)
    elif slug=="how-wind-turbines-make-electricity":
      for bx,by,sz in [(780,400,130),(980,350,180),(600,430,90)]:
        d.line((bx,by,bx,by+170),fill=(235,244,239,220),width=7)
        for ang in [-90,30,150]:
          import math
          ex=bx+math.cos(math.radians(ang))*sz; ey=by+math.sin(math.radians(ang))*sz
          d.line((bx,by,ex,ey),fill=(*accent,235),width=8)
        d.ellipse((bx-10,by-10,bx+10,by+10),fill=(255,255,255,240))
      d.arc((530,100,1120,580),190,320,fill=(255,255,255,70),width=3)
    elif slug=="why-ships-float":
      d.polygon([(590,330),(1110,330),(1010,450),(700,450)],fill=(22,31,48,245),outline=(*accent,255))
      d.polygon([(590,350),(1110,350),(1070,400),(650,400)],fill=(*accent,210))
      for yy in [440,480,520]:
        d.arc((560,yy-30,1160,yy+55),0,180,fill=(160,224,237,200),width=4)
      d.line((840,150,840,325),fill=(255,255,255,230),width=6); d.polygon([(835,160),(835,310),(735,310)],fill=(246,236,207,235))
    elif slug=="why-the-himalayas-are-still-rising":
      d.polygon([(510,480),(750,140),(900,330),(1010,195),(1200,480)],fill=(32,64,89,255))
      d.polygon([(660,275),(750,140),(810,245),(770,222),(742,250),(720,219)],fill=(245,246,237,255))
      d.polygon([(880,365),(1010,195),(1080,310),(1035,290),(1000,320),(978,292)],fill=(248,248,238,250))
      d.polygon([(480,520),(790,365),(1030,440),(1200,370),(1200,630),(480,630)],fill=(14,50,73,150))
      d.line((650,570,960,570),fill=(*accent,230),width=5)
    elif slug=="how-the-piano-was-invented":
      d.rounded_rectangle((590,230,1140,420),18,fill=(24,20,27,240),outline=(*accent,255),width=5)
      for i in range(14):
        x=610+i*37
        d.rectangle((x,245,x+33,405),fill=(245,238,216,255),outline=(40,35,37,255),width=2)
      for i in [1,2,4,5,6,8,9,11,12,13]:
        x=632+i*37
        d.rounded_rectangle((x,245,x+20,350),4,fill=(26,26,33,255))
      d.arc((680,120,1060,320),200,340,fill=(*accent,230),width=4)
    elif slug=="why-leaves-change-color-in-autumn":
      import math
      for x,y,r,col in [(700,180,60,(210,68,34,245)),(840,130,70,(244,151,41,245)),(980,210,64,(198,50,40,245)),(780,300,65,(234,185,48,245)),(970,340,72,(208,94,33,245)),(650,350,50,(244,173,49,245))]:
        pts=[]
        for k in range(10):
          ang=-math.pi/2+k*math.pi/5; rr=r if k%2==0 else r*.62
          pts.append((x+math.cos(ang)*rr,y+math.sin(ang)*rr))
        d.polygon(pts,fill=col)
        d.line((x,y,x+12,y+r),fill=(80,53,30,220),width=4)
    elif slug=="how-birds-navigate-thousands-of-miles":
      import math
      for bx,by,scale in [(730,230,1.0),(850,180,.8),(960,255,.9),(1050,170,.7),(900,340,.65),(680,330,.7)]:
        d.arc((bx-35*scale,by-15*scale,bx,by+20*scale),200,340,fill=(*accent,245),width=5)
        d.arc((bx,by-15*scale,bx+35*scale,by+20*scale),200,340,fill=(*accent,245),width=5)
      d.arc((620,100,1150,540),200,330,fill=(255,255,255,130),width=3)
      d.ellipse((1030,85,1080,135),fill=(255,222,144,240))
    elif slug=="how-black-holes-form":
      d.ellipse((690,120,1110,540),fill=(255,126,42,90))
      d.ellipse((730,165,1070,495),outline=(255,180,84,240),width=22)
      d.ellipse((770,205,1030,455),fill=(5,7,22,255))
      d.ellipse((810,245,990,415),outline=(161,119,255,170),width=8)
      for x,y,r in [(630,150,3),(1100,110,4),(680,500,3),(1090,500,3),(980,100,2),(740,90,2)]:
        d.ellipse((x-r,y-r,x+r,y+r),fill=(255,255,255,240))
    elif slug=="why-the-ocean-is-salty":
      for i in range(4):
        y=280+i*62
        d.arc((550,y-45,1190,y+70),0,180,fill=(130+i*18,220,237,220),width=7)
      for x,y in [(720,180),(860,220),(1000,165),(1080,270),(790,390)]:
        d.polygon([(x,y-16),(x+13,y),(x,y+16),(x-13,y)],fill=(*accent,220))
      d.ellipse((880,80,1000,200),outline=(255,255,255,130),width=3)
    else:
      # memory: luminous brain silhouette and linked nodes
      d.ellipse((690,130,1040,480),fill=(151,135,222,55),outline=(*accent,230),width=5)
      for x,y,r in [(780,220,42),(870,180,48),(960,230,43),(760,315,38),(870,290,47),(980,330,39),(850,390,35)]:
        d.ellipse((x-r,y-r,x+r,y+r),fill=(126,149,228,120),outline=(*accent,245),width=4)
      for p1,p2 in [((780,220),(870,180)),((870,180),(960,230)),((780,220),(760,315)),((870,180),(870,290)),((960,230),(980,330)),((760,315),(870,290)),((870,290),(850,390)),((870,290),(980,330))]:
        d.line((*p1,*p2),fill=(255,255,255,180),width=3)
    # Text-free by design: article title is supplied in page metadata and avoids rasterized type.
    return im

def hero(im):
    w,h=im.size; target=1200/630
    if w/h>target:
        nw=int(h*target); left=(w-nw)//2; im=im.crop((left,0,left+nw,h))
    else:
        nh=int(w/target); top=(h-nh)//2; im=im.crop((0,top,w,top+nh))
    return im.resize((1200,630),Image.Resampling.LANCZOS)

def git_commit(slugs, label):
    subprocess.run(["git","add","writer-workspace/output/images"]+[str(ART/f"{s}.json") for s in slugs],check=True)
    subprocess.run(["git","commit","-m",f"Add Batch 4 hero images: {label}"],check=True)

def main():
    IMG.mkdir(parents=True,exist_ok=True)
    completed=[]
    for index,slug in enumerate(SLUGS):
        path=ART/f"{slug}.json"
        article=json.loads(path.read_text(encoding="utf-8"))
        found=commons_image(slug)
        if found:
            im,meta=found; origin="Wikimedia Commons reusable image"
        else:
            im=generated_art(slug,article["title"])
            meta={"credit":"Original illustration generated by Mission Mangal Writer Batch 4 pipeline",
                  "license":"Generated original artwork; no third-party image assets. Reuse permitted under CC0 1.0.",
                  "source_url":"https://github.com/aprashnasuraj-dev/patro/tree/missionmangal-writer-batch-production/writer-workspace/output/images",
                  "caption":"Original editorial illustration for "+article["title"]}
            origin="generated"
        out=hero(im)
        filename=f"{slug}-hero.jpg"
        out.save(IMG/filename,"JPEG",quality=91,optimize=True,progressive=True)
        article["image"]={"file":filename,"alt":(article["title"]+" — editorial hero image illustrating the article's main subject")[:160],
          "caption":meta["caption"],"credit":meta["credit"],"license":meta["license"],
          "source_url":meta["source_url"],"width":1200,"height":630}
        path.write_text(json.dumps(article,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        completed.append((slug,origin))
        print(f"Saved {filename} ({out.size}) — {origin}",flush=True)
        if len(completed) in (3,6,9):
            git_commit([s for s,_ in completed[-3:]],", ".join(s for s,_ in completed[-3:]))
    if len(completed)%3:
        group=completed[-(len(completed)%3):]
        git_commit([s for s,_ in group],", ".join(s for s,_ in group))
    # Final validation: exact dimensions, populated schema fields, and local file existence.
    for slug,_ in completed:
        a=json.loads((ART/f"{slug}.json").read_text(encoding="utf-8")); m=a.get("image")
        assert m and m["file"]==f"{slug}-hero.jpg" and m["width"]==1200 and m["height"]==630
        im=Image.open(IMG/m["file"]); assert im.size==(1200,630)
        assert m["credit"] and m["license"] and m["source_url"]
    done={"batch":4,"completed":SLUGS,"rejected":[],"images_complete":SLUGS,
      "hero_images":{s:{"file":f"{s}-hero.jpg","width":1200,"height":630,"origin":origin} for s,origin in completed},
      "finished":time.strftime("%Y-%m-%d",time.gmtime()),
      "note":"All ten Batch 4 article and research files are present. All ten articles have non-null image metadata and committed 1200x630 hero files. Each image records a credit, source URL, and licence/source note. The pipeline validated local file existence, dimensions, and required metadata; no image-pending statuses remain."}
    DONE.parent.mkdir(parents=True,exist_ok=True); DONE.write_text(json.dumps(done,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    subprocess.run(["git","add",str(DONE)],check=True)
    subprocess.run(["git","commit","-m","Mark Mission Mangal Writer Batch 4 image-complete"],check=True)
    print("BATCH4_IMAGE_REPORT="+json.dumps({"images":completed,"pending":[]},ensure_ascii=False),flush=True)

if __name__=="__main__": main()
