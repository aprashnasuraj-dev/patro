#!/usr/bin/env python3
"""Generate and validate Batch 0005 original hero illustrations and completion metadata."""
from __future__ import annotations
import json, re, math, sys
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "writer-workspace" / "output"
ARTICLES = OUT / "articles"
RESEARCH = OUT / "research"
IMAGES = OUT / "images"
DONE = OUT / "done" / "batch-0005.done.json"
TODAY = datetime.now(timezone.utc).date().isoformat()
SLUGS = [
 "why-chocolate-melts-in-your-mouth",
 "why-ice-is-slippery",
 "why-websites-load-slowly",
 "how-image-generators-create-art",
 "how-writing-was-invented",
 "why-switzerland-has-four-languages",
 "why-we-have-time-zones",
 "why-we-say-hello",
 "why-7-feels-lucky",
 "why-plastic-never-disappears",
]
PALETTES = {
 "why-chocolate-melts-in-your-mouth": ((45,23,29),(190,93,54),(255,206,130)),
 "why-ice-is-slippery": ((8,30,58),(36,139,190),(186,239,255)),
 "why-websites-load-slowly": ((18,28,66),(57,91,174),(103,235,210)),
 "how-image-generators-create-art": ((41,22,77),(126,70,183),(255,143,112)),
 "how-writing-was-invented": ((66,43,26),(172,111,59),(255,214,142)),
 "why-switzerland-has-four-languages": ((20,45,64),(195,55,63),(255,239,219)),
 "why-we-have-time-zones": ((11,38,66),(34,113,156),(255,203,106)),
 "why-we-say-hello": ((43,32,77),(110,80,171),(255,173,127)),
 "why-7-feels-lucky": ((26,37,70),(65,103,153),(255,205,94)),
 "why-plastic-never-disappears": ((10,52,60),(24,133,122),(158,232,196)),
}
def font(size, bold=False):
    candidates = [
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def mix(a,b,t):
    return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))

def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = (line + " " + word).strip()
        if draw.textbbox((0,0), candidate, font=fnt)[2] <= max_width or not line:
            line = candidate
        else:
            lines.append(line); line = word
    if line: lines.append(line)
    return lines

def draw_snowflake(d,cx,cy,r,color):
    for angle in range(0,180,60):
        a=math.radians(angle)
        x1,y1=cx-r*math.cos(a),cy-r*math.sin(a)
        x2,y2=cx+r*math.cos(a),cy+r*math.sin(a)
        d.line((x1,y1,x2,y2),fill=color,width=7)
        for sign in (-1,1):
            ex=cx+sign*r*.58*math.cos(a); ey=cy+sign*r*.58*math.sin(a)
            for side in (-1,1):
                aa=a+math.pi+side*.68
                d.line((ex,ey,ex+sign*r*.23*math.cos(aa),ey+sign*r*.23*math.sin(aa)),fill=color,width=5)

def draw_motif(im, slug, accent, pale):
    d=ImageDraw.Draw(im,"RGBA")
    # The art sits in a contained panel to keep the headline readable.
    d.rounded_rectangle((700,85,1130,545),radius=44,fill=(255,255,255,18),outline=(255,255,255,62),width=2)
    if slug=="why-chocolate-melts-in-your-mouth":
        for x,y,s in [(805,210,115),(940,270,105),(835,350,100)]:
            d.rounded_rectangle((x,y,x+s,y+s),radius=16,fill=(*accent,255),outline=(*pale,255),width=4)
            d.line((x+s*.5,y+8,x+s*.5,y+s-8),fill=(*pale,150),width=3)
            d.line((x+8,y+s*.5,x+s-8,y+s*.5),fill=(*pale,150),width=3)
        d.ellipse((960,125,1075,240),fill=(*pale,240))
        d.polygon([(1017,110),(1043,159),(1034,201),(1000,211),(976,183),(987,148)],fill=(*pale,210))
    elif slug=="why-ice-is-slippery":
        draw_snowflake(d,905,285,125,pale)
        d.polygon([(1015,150),(1090,225),(1060,330),(1102,405),(1017,470),(965,375),(995,285)],fill=(*accent,190),outline=(*pale,230))
        d.line((790,450,1065,450),fill=(255,255,255,90),width=4)
    elif slug=="why-websites-load-slowly":
        d.rounded_rectangle((755,170,1080,390),radius=22,fill=(7,15,37,210),outline=(*pale,240),width=4)
        d.line((755,215,1080,215),fill=(*pale,200),width=3)
        for i,col in enumerate((pale,accent,(255,255,255))): d.ellipse((777+i*20,185,787+i*20,195),fill=(*col,255))
        d.rectangle((790,245,930,262),fill=(*accent,220))
        d.rectangle((790,280,1030,294),fill=(255,255,255,100))
        d.rectangle((790,312,980,326),fill=(255,255,255,75))
        for i in range(5):
            d.line((775+i*45,435,800+i*45,435),fill=(*pale,230),width=5)
        d.polygon([(1040,405),(1085,435),(1040,465)],fill=(*pale,230))
    elif slug=="how-image-generators-create-art":
        d.rounded_rectangle((785,150,1065,425),radius=20,fill=(15,12,43,190),outline=(*pale,240),width=4)
        for row in range(5):
            for col in range(5):
                x=808+col*45;y=175+row*45
                colr=accent if (row+col)%3 else pale
                d.rounded_rectangle((x,y,x+28,y+28),radius=5,fill=(*colr,180))
        d.ellipse((920,290,1030,400),fill=(*pale,210))
        d.polygon([(920,382),(955,335),(977,360),(1002,320),(1030,382)],fill=(*accent,240))
    elif slug=="how-writing-was-invented":
        d.rounded_rectangle((790,145,1055,445),radius=22,fill=(185,128,73,220),outline=(*pale,240),width=4)
        for row in range(5):
            y=190+row*43
            for col in range(3+(row%2)):
                x=820+col*53+(row%2)*9
                d.polygon([(x,y),(x+23,y+7),(x+8,y+20)],fill=(61,42,27,220))
        d.line((800,458,1060,458),fill=(*pale,150),width=4)
    elif slug=="why-switzerland-has-four-languages":
        d.polygon([(760,400),(855,225),(920,325),(990,190),(1090,400)],fill=(255,255,255,65),outline=(*pale,255))
        d.polygon([(825,286),(855,225),(884,273),(855,260)],fill=(*pale,230))
        d.polygon([(958,245),(990,190),(1020,250),(990,232)],fill=(*pale,230))
        d.rounded_rectangle((925,350,1045,470),radius=16,fill=(*accent,245))
        d.rectangle((970,370,1000,450),fill=(255,255,255,245));d.rectangle((946,395,1024,425),fill=(255,255,255,245))
    elif slug=="why-we-have-time-zones":
        d.ellipse((775,145,1075,445),fill=(20,91,125,200),outline=(*pale,245),width=5)
        d.arc((835,145,1015,445),0,360,fill=(*pale,180),width=4)
        d.arc((775,200,1075,390),0,360,fill=(*pale,180),width=4)
        d.line((925,150,925,440),fill=(*pale,150),width=3);d.line((780,295,1070,295),fill=(*pale,150),width=3)
        d.ellipse((905,240,1045,380),fill=(10,32,56,240),outline=(*pale,255),width=5)
        d.line((975,310,975,267),fill=(*pale,255),width=7);d.line((975,310,1010,330),fill=(*pale,255),width=7)
    elif slug=="why-we-say-hello":
        d.rounded_rectangle((760,170,990,325),radius=38,fill=(*accent,245),outline=(*pale,255),width=4)
        d.polygon([(800,320),(785,360),(850,325)],fill=(*accent,245))
        d.rounded_rectangle((870,290,1085,430),radius=35,fill=(*pale,235),outline=(255,255,255,255),width=4)
        d.polygon([(1035,420),(1065,455),(1068,414)],fill=(*pale,235))
        for x,y in [(800,240),(840,240),(880,240)]: d.ellipse((x,y,x+17,y+17),fill=(255,255,255,245))
        for x,y in [(920,350),(960,350),(1000,350)]: d.ellipse((x,y,x+15,y+15),fill=(*accent,255))
    elif slug=="why-7-feels-lucky":
        d.rounded_rectangle((790,175,1050,435),radius=30,fill=(*accent,240),outline=(*pale,255),width=5)
        f=font(190,True);d.text((850,180),"7",font=f,fill=(*pale,255),stroke_width=2,stroke_fill=(255,255,255,80))
        for x,y in [(820,210),(1010,400),(1020,215),(820,400)]: d.ellipse((x,y,x+18,y+18),fill=(255,255,255,200))
    elif slug=="why-plastic-never-disappears":
        d.rounded_rectangle((850,170,1015,400),radius=28,fill=(*pale,220),outline=(255,255,255,230),width=4)
        d.rounded_rectangle((890,135,975,180),radius=12,fill=(*pale,220),outline=(255,255,255,230),width=4)
        d.rectangle((895,230,970,325),fill=(*accent,220))
        for x,y,r in [(800,180,10),(1060,190,13),(810,400,14),(1065,385,9),(1035,450,7),(785,330,6),(1085,300,7)]:
            d.ellipse((x-r,y-r,x+r,y+r),fill=(*pale,200))
        for x,y in [(800,230),(1040,260),(830,450),(1080,425)]:
            d.line((x,y,x+18,y-12),fill=(*pale,160),width=3)

def render(slug, title, path):
    c1,c2,pale=PALETTES[slug]
    im=Image.new("RGB",(1200,630),c1)
    px=im.load()
    for y in range(630):
        t=y/629
        col=mix(c1,c2,t)
        for x in range(1200):
            shade=0.06*math.sin((x/1200)*math.pi)
            px[x,y]=tuple(max(0,min(255,int(v*(1-shade)))) for v in col)
    d=ImageDraw.Draw(im,"RGBA")
    # Soft decorative geometry in the background.
    d.ellipse((900,-210,1330,220),fill=(*pale,18))
    d.ellipse((-190,440,210,840),fill=(*pale,13))
    for i in range(12):
        x=650+i*42
        d.line((x,25,x+150,25),fill=(255,255,255,12),width=2)
    draw_motif(im,slug,c2,pale)
    fnt=font(48,True)
    lines=wrap(d,title,fnt,555)
    if len(lines)>3:
        fnt=font(42,True);lines=wrap(d,title,fnt,555)
    y=210 if len(lines)<=2 else 165
    d.text((74,95),"MISSION MANGAL  /  EXPLAINED",font=font(18,True),fill=(*pale,240))
    d.rounded_rectangle((74,143,160,151),radius=4,fill=(*pale,245))
    for line in lines[:4]:
        d.text((70,y),line,font=fnt,fill=(255,255,255),stroke_width=1,stroke_fill=(0,0,0,40))
        y+=fnt.size+14
    d.text((74,560),"Curiosity, clearly explained.",font=font(20),fill=(255,255,255,205))
    im.save(path,"JPEG",quality=91,optimize=True,progressive=True,subsampling=0)
    with Image.open(path) as check:
        if check.size!=(1200,630) or check.format!="JPEG":
            raise RuntimeError(f"Bad image output for {slug}: {check.size} {check.format}")
    if path.stat().st_size>450_000:
        raise RuntimeError(f"Hero image too large: {path} ({path.stat().st_size})")

def word_count(article):
    text = " ".join(p for sec in article["sections"] for p in sec.get("paras",[]))
    text += " " + " ".join(f.get("a","") for f in article["faq"])
    return len(re.findall(r"\b[\w’'-]+\b", text, flags=re.UNICODE))

def validate_source_refs(article, slug):
    sources=article.get("sources",[])
    if len(sources)<5:
        raise ValueError(f"{slug}: fewer than five sources")
    urls=[s.get("url","") for s in sources]
    if len(set(urls))<5:
        raise ValueError(f"{slug}: fewer than five distinct source URLs")
    alltext=" ".join(p for sec in article["sections"] for p in sec.get("paras",[]))
    alltext+=" "+" ".join(f.get("a","") for f in article["faq"])
    cited={int(n) for n in re.findall(r"\[(\d+)\]",alltext)}
    expected=set(range(1,len(sources)+1))
    if not expected.issubset(cited):
        raise ValueError(f"{slug}: uncited sources {sorted(expected-cited)}")
    if cited-expected:
        raise ValueError(f"{slug}: invalid citation numbers {sorted(cited-expected)}")
    for sec in article["sections"]:
        if not sec.get("h2") or not sec.get("paras"):
            raise ValueError(f"{slug}: empty section")
        for para in sec["paras"]:
            if len(para.strip())<80 or not re.search(r"\[\d+\]",para):
                raise ValueError(f"{slug}: paragraph is short or lacks an inline citation")
    for f in article["faq"]:
        if not f.get("q") or not f.get("a") or not re.search(r"\[\d+\]",f["a"]):
            raise ValueError(f"{slug}: FAQ answer lacks a citation")
    research=RESEARCH/f"{slug}.json"
    if not research.exists():
        raise FileNotFoundError(f"Missing research file: {research}")
    data=json.loads(research.read_text(encoding="utf-8"))
    if len(data.get("sources",[]))<5:
        raise ValueError(f"{slug}: research JSON has fewer than five sources")
    for s in data["sources"]:
        if not s.get("url") or not s.get("notes"):
            raise ValueError(f"{slug}: source missing URL or research notes")

def main():
    IMAGES.mkdir(parents=True,exist_ok=True)
    DONE.parent.mkdir(parents=True,exist_ok=True)
    # Never leave a stale success marker if any later gate fails.
    DONE.unlink(missing_ok=True)
    reports={}
    for slug in SLUGS:
        ap=ARTICLES/f"{slug}.json"
        if not ap.exists():
            raise FileNotFoundError(f"Missing article: {ap}")
        article=json.loads(ap.read_text(encoding="utf-8"))
        if article.get("slug")!=slug:
            raise ValueError(f"{slug}: slug mismatch")
        for key in ("title","meta_description","h1","category","sections","faq","sources","key_takeaways"):
            if not article.get(key):
                raise ValueError(f"{slug}: missing required field {key}")
        if len(article["meta_description"])<80 or len(article["meta_description"])>180:
            raise ValueError(f"{slug}: meta description length out of range")
        actual=word_count(article)
        if actual<1000:
            raise ValueError(f"{slug}: article too short ({actual} words)")
        validate_source_refs(article,slug)
        out=IMAGES/f"{slug}-hero.jpg"
        render(slug,article["title"],out)
        article["word_count"]=actual
        article["reading_minutes"]=max(1,round(actual/220))
        article["image"]={
          "file":out.name,
          "alt":f"Original editorial illustration for the article: {article['title']}.",
          "caption":f"An original visual illustration accompanying {article['title'].rstrip('?')}.",
          "credit":"Original programmatic illustration created for Mission Mangal Writer",
          "license":"Original generated illustration; no third-party asset or licence used",
          "width":1200,
          "height":630
        }
        ap.write_text(json.dumps(article,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        reports[slug]={
          "file":out.name,"width":1200,"height":630,"bytes":out.stat().st_size,
          "origin":"generated","credit":article["image"]["credit"],"license":article["image"]["license"],
          "word_count":actual,"sources":len(article["sources"])
        }
    # Final independent pass after all metadata and files have been written.
    for slug in SLUGS:
        article=json.loads((ARTICLES/f"{slug}.json").read_text(encoding="utf-8"))
        validate_source_refs(article,slug)
        info=article["image"]
        p=IMAGES/info["file"]
        if not p.exists() or info["width"]!=1200 or info["height"]!=630:
            raise ValueError(f"{slug}: image metadata or file check failed")
        with Image.open(p) as im:
            if im.size!=(1200,630):
                raise ValueError(f"{slug}: actual image dimensions {im.size}")
    marker={
      "batch":5,
      "completed":SLUGS,
      "rejected":[],
      "images_complete":SLUGS,
      "hero_images":reports,
      "finished":TODAY,
      "note":"All ten Batch 5 article and research files passed structural, length, inline-citation, unique-source, and image checks. Every topic has a committed 1200x630 original hero illustration with local file metadata. Completion marker written only after the final validation pass."
    }
    DONE.write_text(json.dumps(marker,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":"complete","batch":5,"topics":len(SLUGS),"word_counts":{s:reports[s]["word_count"] for s in SLUGS},"hero_images":len(reports),"marker":str(DONE)},indent=2))

if __name__=="__main__":
    main()
