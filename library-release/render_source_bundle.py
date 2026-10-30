#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, html, json, os, pathlib, re, shutil
from collections import Counter
from datetime import date, datetime, timezone
import markdown
from bs4 import BeautifulSoup

ROOT=pathlib.Path(__file__).resolve().parents[1]
SITE_ORIGIN=os.environ.get("LIBRARY_SITE_ORIGIN","https://aafnaipatro.com").rstrip("/")
ASSET_ORIGIN=os.environ.get("LIBRARY_ASSET_ORIGIN","https://library-assets.aafnaipatro.com/phase1").rstrip("/")
AUTHOR_DEFAULT="AafnaiPatro Research Desk"
RULES=[
 ("Storage, Hardware & Electronics",r"\b(ssd|nvme|smart|hard drive|disk|storage|flash|nand|battery|electronics|sensor|microcontroller|cpu|gpu|memory|ram)\b"),
 ("Surveying, Geospatial & Navigation",r"\b(survey|gnss|gps|rtk|total station|stakeout|resection|traverse|coordinate|datum|geodes|mapping|gis|level loop|prism height)\b"),
 ("Civil, Structural & Construction",r"\b(concrete|structur|bridge|road|pavement|construction|rebar|cement|curing|masonry|foundation|beam|column|building code|sewer)\b"),
 ("Water, Coastal & Environmental Science",r"\b(coastal|wave setup|hydrolog|river|stream|water|wastewater|turbidity|aquifer|runoff|infiltration|stormwater|flood|ocean|beach)\b"),
 ("Earth Science, Geology & Hazards",r"\b(earthquake|magnitude|intensity|fault|seismic|landslide|geology|rock|weathering|soil|volcano|erosion|hazard)\b"),
 ("Astronomy, Space & Optics",r"\b(telescope|astronom|moon|lunar|planet|orbit|star|solar|diffraction|pixel scale|seeing|illumination|aperture|light gathering)\b"),
 ("Mechanical, Manufacturing & Workshop",r"\b(mechanic|gear|bearing|shaft|thread|tap drill|machin|manufactur|sheet metal|bend deduction|torque|motor|pump|weld|miter|drawer clearance)\b"),
 ("Energy, Electrical & Buildings",r"\b(electric|energy|tariff|solar|pv|heat pump|hvac|insulation|lighting|voltage|power factor|building envelope|window condensation)\b"),
 ("Computing, AI & Digital Systems",r"\b(dns|http|tls|browser|cache|api|database|sql|cloud|backup|software|network|server|linux|web|ai\b|llm|embedding|model inference|algorithm)\b"),
 ("Agriculture, Land & Biology",r"\b(agricultur|crop|plant|garden|fertil|irrigation|growing degree|livestock|forest|ecology|biology)\b"),
 ("Photography, Audio & Media",r"\b(camera|photograph|exposure|flash|audio|video|bit depth|codec|lens|image sensor)\b"),
 ("Craft, Materials & Making",r"\b(wood|fabric|sewing|quilting|craft|adhesive|material science|composite|ceramic|polymer)\b"),
 ("Business, Economics & Consumer Decisions",r"\b(price|tariff|cost|fee|finance|econom|consumer|subscription|revenue|budget|tax|market)\b"),
 ("Home, Appliances & Practical Science",r"\b(freezer|refrigerator|humidifier|appliance|household|home|room size|laundry|kitchen)\b"),
]
SECTOR_RULES=[(name,re.compile(pattern,re.I)) for name,pattern in RULES]
PHYSICS=re.compile(r"\b(physics|acceleration|velocity|force|pressure|temperature|measurement|uncertainty|geometry|formula|ratio|area|volume|frequency|wavelength)\b",re.I)

def read_json(path): return json.loads(path.read_text(encoding="utf-8"))
def write_json(path,value,compact=False):
    path.parent.mkdir(parents=True,exist_ok=True)
    text=json.dumps(value,ensure_ascii=False,separators=(",",":") if compact else None,indent=None if compact else 2)
    path.write_text(text+("" if compact else "\n"),encoding="utf-8")
def list_payload(value,*keys):
    if isinstance(value,list): return value
    if isinstance(value,dict):
        for key in keys:
            if isinstance(value.get(key),list): return value[key]
    return []
def source_id(value):
    text=str(value or "").strip();match=re.fullmatch(r"S0*(\d+)",text,re.I)
    return "S%d"%int(match.group(1)) if match else text.upper()
def source_rows(payload):
    output=[]
    for raw in list_payload(payload,"sources"):
        output.append({"id":source_id(raw.get("id") or raw.get("source_id")),"title":str(raw.get("title") or "Source"),"publisher":str(raw.get("publisher") or raw.get("publisher_or_author") or raw.get("author") or ""),"url":str(raw.get("url") or ""),"support":str(raw.get("scope_of_support") or raw.get("claims_supported") or raw.get("claim_support") or ""),"limitations":str(raw.get("limitations") or raw.get("qualification") or "")})
    return output
def clean_text(value): return re.sub(r"\s+"," ",BeautifulSoup(str(value),"html.parser").get_text(" ",strip=True)).strip()
def slugify(value): return re.sub(r"[^a-z0-9]+","-",str(value or "").lower()).strip("-") or "section"
def classify(meta,queue):
    p=meta.get("presentation") or {}
    text=" ".join([str(meta.get("title") or queue.get("title") or ""),str(p.get("category") or ""),str(p.get("kicker") or "")," ".join(str(x) for x in p.get("tags") or []),str(meta.get("slug") or "")])
    for name,rx in SECTOR_RULES:
        if rx.search(text): return name
    return "Physics, Mathematics & Measurement" if PHYSICS.search(text) else "General Applied Knowledge"
def normalize_assets(meta,manifest):
    values=[]
    if isinstance(manifest,dict):
        for key in ("assets","images","figures","files","interactive_assets"):
            if isinstance(manifest.get(key),list): values.extend(manifest[key])
    elif isinstance(manifest,list): values=list(manifest)
    result={}
    for raw in values:
        path=raw.get("path")
        if not path and raw.get("file"): path="assets/%s/%s"%(meta["topic_id"],raw["file"])
        if path: result[str(path)]=dict(raw)
    p=meta.get("presentation") or {}
    for raw in p.get("images") or []:
        path=raw.get("path")
        if path:
            merged=result.get(str(path),{});merged.update({k:v for k,v in raw.items() if v is not None});result[str(path)]=merged
    hero=p.get("hero")
    if hero and str(hero) not in result: result[str(hero)]={"path":str(hero),"role":"hero"}
    for path in meta.get("assets") or []:
        if str(path) not in result: result[str(path)]={"path":str(path)}
    return result
def expertise(meta):
    mapping={"source_comparison":"source synthesis","calculation":"reproducible calculations","calculator":"tested calculator logic","original_diagram":"original diagrams","technical_diagram":"original diagrams","visualization":"original visual analysis","technical_reasoning":"technical analysis","worked_example":"worked examples","uncertainty_analysis":"uncertainty analysis","current_primary_source_synthesis":"primary-source synthesis","research_synthesis":"research synthesis"}
    labels=[]
    for raw in (meta.get("originality") or {}).get("original_work_types") or []:
        key=str(raw).lower();label=mapping.get(key,key.replace("_"," "))
        if label and label not in labels: labels.append(label)
    return " · ".join(labels[:3] or ["evidence-based technical research"])
def research_note(meta,count):
    proof=meta.get("editorial_proof") or {}
    text="Prepared from %d inspected source%s with article text, claims and visuals kept under one article identity."%(count,"" if count==1 else "s")
    if proof.get("actual_test_performed") is True: text+=" The source package records executed calculations, code checks or visual verification where applicable."
    limitations=str(proof.get("limitations") or "")
    if limitations:
        first=re.split(r"(?<=[.!?])\s+",limitations.strip())[0]
        if first: text+=" "+first
    return text
def description(meta,markdown_text):
    p=meta.get("presentation") or {};seo=p.get("seo") or {}
    for value in (seo.get("description"),p.get("dek"),meta.get("description")):
        if value: return re.sub(r"\s+"," ",str(value)).strip()[:300]
    text=clean_text(markdown.markdown(markdown_text,extensions=["tables","fenced_code"]))
    return (text[:157].rsplit(" ",1)[0]+"…") if len(text)>160 else text
def quick_summary(meta,markdown_text):
    p=meta.get("presentation") or {};rows=[str(x).strip() for x in p.get("quick_summary") or [] if str(x).strip()]
    if rows: return rows[:4]
    output=[]
    for block in markdown_text.split("\n\n"):
        raw=block.strip()
        if not raw or raw.startswith(("#","!","|")) or raw.startswith(chr(96)): continue
        text=clean_text(markdown.markdown(raw))
        if text: output.append(text)
        if len(output)>=3: break
    return output
def prepare_citations(markdown_text,sources):
    numbers={row["id"]:i+1 for i,row in enumerate(sources)};titles={row["id"]:row["title"] for row in sources}
    def replace_match(match):
        key=source_id(match.group(1));number=numbers.get(key)
        if not number: return html.escape(match.group(0))
        return '<sup class="citation"><a href="#ref-%d" title="%s">[%d]</a></sup>'%(number,html.escape(titles.get(key,"Source"),quote=True),number)
    return re.sub(r"\[(S0*\d+)\]",replace_match,markdown_text,flags=re.I)
def normalize_path(value):
    path=str(value or "").split("#",1)[0].split("?",1)[0]
    while path.startswith("../"): path=path[3:]
    return path.lstrip("/")
def article_body(markdown_text,meta,assets,sources):
    rendered=markdown.markdown(prepare_citations(markdown_text,sources),extensions=["tables","fenced_code","sane_lists","toc"],output_format="html5")
    soup=BeautifulSoup(rendered,"html.parser");heading=soup.find("h1")
    if heading: heading.decompose()
    used=set()
    for heading in soup.find_all(["h2","h3"]):
        base=slugify(heading.get_text(" ",strip=True));current=base;n=2
        while current in used: current="%s-%d"%(base,n);n+=1
        heading["id"]=current;used.add(current)
    hero=str((meta.get("presentation") or {}).get("hero") or "");hero_removed=False
    for image in list(soup.find_all("img")):
        path=normalize_path(image.get("src"))
        if not path.startswith("assets/"): continue
        info=assets.get(path,{})
        if path==hero and not hero_removed:
            parent=image.parent
            if parent and parent.name=="p": parent.decompose()
            else: image.decompose()
            hero_removed=True;continue
        image["src"]=ASSET_ORIGIN+"/"+path;image["alt"]=str(info.get("alt") or image.get("alt") or (str(meta.get("title") or "")+" explanatory diagram"));image["loading"]="lazy";image["decoding"]="async"
        figure=soup.new_tag("figure");figure["class"]="article-figure";image.wrap(figure)
        caption=str(info.get("caption") or "")
        if caption:
            cap=soup.new_tag("figcaption");span=soup.new_tag("span");span.string=caption;cap.append(span);small=soup.new_tag("small");small.string="Original AafnaiPatro Research Desk visual";cap.append(small);figure.append(cap)
    for table in list(soup.find_all("table")):
        table["class"]="article-table";wrapper=soup.new_tag("div");wrapper["class"]="table-scroll";table.wrap(wrapper)
    for link in soup.find_all("a"):
        href=str(link.get("href") or "")
        if href.startswith("tool/") or href.startswith("./tool/") or "/tool/" in href:
            filename=pathlib.PurePosixPath(href.split("#",1)[0]).name;link["href"]=ASSET_ORIGIN+"/tools/%s/%s"%(meta["topic_id"],filename);link["rel"]="nofollow"
    return str(soup)
def references_html(sources):
    output=[]
    for number,row in enumerate(sources,1):
        scope='<p class="ref-limit"><b>Scope note:</b> %s</p>'%html.escape(row["limitations"]) if row["limitations"] else ""
        link='<a href="%s" target="_blank" rel="noopener noreferrer">Original source ↗</a>'%html.escape(row["url"],quote=True) if row["url"] else ""
        output.append('<li id="ref-%d"><div><strong>%s</strong><span>%s</span><p>%s</p>%s</div>%s</li>'%(number,html.escape(row["title"]),html.escape(row["publisher"]),html.escape(row["support"] or "Technical reference used in this article."),scope,link))
    return "".join(output)
def related_html(current,items):
    rows=[row for row in items if row["topic_id"]!=current["topic_id"] and row["sector"]==current["sector"]]
    rows.sort(key=lambda row:(0 if row["topic"]==current["topic"] else 1,abs(row["priority"]-current["priority"]),row["priority"]))
    cards=['<a class="related-card" href="%s"><span>%s</span><strong>%s</strong></a>'%(html.escape(row["url"],quote=True),html.escape(row["topic"]),html.escape(row["title"])) for row in rows[:3]]
    return '<section class="related"><div class="eyebrow">Continue learning</div><h2>Related reading</h2><div class="related-grid">%s</div></section>'%"".join(cards) if cards else ""
def replace(template,values):
    for key,value in values.items(): template=template.replace("__%s__"%key,str(value))
    return template
def build_article(template,record,item,items):
    meta=record["article"];sources=source_rows(record["sources"]);assets=normalize_assets(meta,record["asset_manifest"]);p=meta.get("presentation") or {};seo=p.get("seo") or {}
    hero_path=str(p.get("hero") or "")
    if not hero_path and assets: hero_path=next(iter(assets))
    hero=assets.get(hero_path,{}) if hero_path else {};hero_url=ASSET_ORIGIN+"/"+hero_path if hero_path else SITE_ORIGIN+"/favicon.svg";hero_html=""
    if hero_path: hero_html='<figure class="hero-figure"><img src="%s" alt="%s" width="%s" height="%s" fetchpriority="high"><figcaption><span>%s</span><small>Original AafnaiPatro Research Desk visual</small></figcaption></figure>'%(html.escape(hero_url,quote=True),html.escape(str(hero.get("alt") or item["title"]+" explanatory diagram"),quote=True),html.escape(str(hero.get("width") or 1200)),html.escape(str(hero.get("height") or 680)),html.escape(str(hero.get("caption") or "")))
    author=str(meta.get("author") or meta.get("byline") or AUTHOR_DEFAULT);canonical=SITE_ORIGIN+"/article/"+item["slug"]
    schema={"@context":"https://schema.org","@type":["Article","TechArticle"],"headline":item["title"],"description":item["description"],"mainEntityOfPage":canonical,"author":{"@type":"Organization","name":author},"publisher":{"@type":"Organization","name":"AafnaiPatro","url":SITE_ORIGIN},"articleSection":item["sector"],"about":{"@type":"Thing","name":item["topic"]},"image":[hero_url] if hero_path else [],"datePublished":str(date.today()),"dateModified":str(date.today())}
    return replace(template,{"SEO_TITLE":html.escape(str(seo.get("title") or item["title"])),"META_DESCRIPTION":html.escape(item["description"],quote=True),"CANONICAL":html.escape(canonical,quote=True),"HERO_URL":html.escape(hero_url,quote=True),"ASSET_ORIGIN":html.escape(ASSET_ORIGIN,quote=True),"JSON_LD":json.dumps(schema,ensure_ascii=False,separators=(",",":")),"SECTOR":html.escape(item["sector"]),"TOPIC":html.escape(item["topic"]),"KICKER":html.escape(str(p.get("kicker") or item["sector"])),"TITLE":html.escape(item["title"]),"DEK":html.escape(item["dek"]),"AUTHOR":html.escape(author),"EXPERTISE":html.escape(expertise(meta)),"RESEARCH_NOTE":html.escape(research_note(meta,len(sources))),"RESEARCH_URL":html.escape(item["research_url"],quote=True),"TOPIC_ID":html.escape(item["topic_id"]),"TAGS":"".join("<span>%s</span>"%html.escape(str(tag)) for tag in p.get("tags") or []),"QUICK":"".join("<p>%s</p>"%html.escape(value) for value in quick_summary(meta,record["markdown"])),"HERO":hero_html,"BODY":article_body(record["markdown"],meta,assets,sources),"REFERENCES":references_html(sources),"RELATED":related_html(item,items)})
def build_research(template,record,item):
    meta=record["article"];sources=source_rows(record["sources"]);by_id={row["id"]:row for row in sources};claims=[]
    for claim in list_payload(record["claims"],"claims"):
        cid=str(claim.get("id") or claim.get("claim_id") or "");statement=str(claim.get("claim") or claim.get("statement") or "");refs=[]
        for raw in claim.get("source_ids") or []:
            row=by_id.get(source_id(raw))
            if row and row["url"]: refs.append('<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>'%(html.escape(row["url"],quote=True),html.escape(row["title"])))
            elif row: refs.append(html.escape(row["title"]))
            else: refs.append(html.escape(str(raw)))
        qual=str(claim.get("qualification") or claim.get("limitations") or claim.get("basis") or claim.get("verification") or "")
        claims.append('<section class="claim"><span>%s</span><h2>%s</h2><p><b>Supported by:</b> %s</p>%s</section>'%(html.escape(cid),html.escape(statement)," · ".join(refs) if refs else "Original calculation or method recorded in the article package",('<p><b>Qualification:</b> %s</p>'%html.escape(qual)) if qual else ""))
    source_items=[]
    for row in sources:
        link='<a href="%s" target="_blank" rel="noopener noreferrer">Original source ↗</a>'%html.escape(row["url"],quote=True) if row["url"] else ""
        source_items.append('<li><div><strong>%s</strong><span>%s</span><p>%s</p></div>%s</li>'%(html.escape(row["title"]),html.escape(row["publisher"]),html.escape(row["support"] or "Reference used in this article."),link))
    return replace(template,{"TITLE":html.escape(item["title"]),"CANONICAL":html.escape(SITE_ORIGIN+item["research_url"],quote=True),"ASSET_ORIGIN":html.escape(ASSET_ORIGIN,quote=True),"ARTICLE_URL":html.escape(item["url"],quote=True),"TOPIC_ID":html.escape(item["topic_id"]),"LIMITATIONS":html.escape(str((meta.get("editorial_proof") or {}).get("limitations") or "See the article for scope and limitations.")),"CLAIMS":"".join(claims),"SOURCES":"".join(source_items)})
def checksum(path):
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b""): digest.update(chunk)
    return digest.hexdigest()
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--source",required=True);parser.add_argument("--output",required=True);args=parser.parse_args()
    source=pathlib.Path(args.source).resolve();out=pathlib.Path(args.output).resolve();shutil.rmtree(out,ignore_errors=True);(out/"phase1/article").mkdir(parents=True);(out/"phase1/research").mkdir(parents=True);(out/"phase1/static").mkdir(parents=True)
    manifest=read_json(source/"export-manifest.json")
    if manifest.get("article_count")!=2640: raise SystemExit("Source export must contain exactly 2640 articles")
    article_template=(ROOT/"library-release/templates/article.html").read_text(encoding="utf-8");research_template=(ROOT/"library-release/templates/research.html").read_text(encoding="utf-8");library_template=(ROOT/"library-release/templates/library.html").read_text(encoding="utf-8")
    records=[];slugs={}
    for entry in sorted(manifest["items"],key=lambda row:row["priority"]):
        record=read_json(source/entry["record"]);meta=record["article"];queue=record["queue"];slug=str(meta.get("slug") or queue.get("slug") or "")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",slug): raise SystemExit("Unsafe public slug: "+slug)
        if slug in slugs: raise SystemExit("Duplicate public slug: "+slug)
        slugs[slug]=meta["topic_id"];p=meta.get("presentation") or {};sector=classify(meta,queue);topic=str(p.get("category") or p.get("kicker") or sector).strip();desc=description(meta,record["markdown"]);dek=str(p.get("dek") or (p.get("seo") or {}).get("description") or desc);sources=source_rows(record["sources"]);claims=list_payload(record["claims"],"claims");assets=normalize_assets(meta,record["asset_manifest"])
        records.append((record,{"topic_id":meta["topic_id"],"priority":int(queue["priority"]),"slug":slug,"title":str(meta.get("title") or queue.get("title") or slug),"dek":dek,"description":desc,"sector":sector,"topic":topic,"tags":p.get("tags") or [],"source_count":len(sources),"claim_count":len(claims),"visual_count":len(assets),"url":"/article/"+slug,"research_url":"/research/"+slug}))
    items=[item for _,item in records]
    if len(items)!=2640: raise SystemExit("Renderer did not load 2640 records")
    for record,item in records:
        (out/"phase1/article"/(item["slug"]+".html")).write_text(build_article(article_template,record,item,items),encoding="utf-8");(out/"phase1/research"/(item["slug"]+".html")).write_text(build_research(research_template,record,item),encoding="utf-8")
    for name in ("assets","tools"):
        src=source/name
        if src.exists(): shutil.copytree(src,out/"phase1"/name,dirs_exist_ok=True)
    shutil.copy2(ROOT/"library-release/static/library.css",out/"phase1/static/library.css");shutil.copy2(ROOT/"library-release/static/dashboard.js",out/"phase1/static/dashboard.js");(out/"phase1/library.html").write_text(replace(library_template,{"ASSET_ORIGIN":html.escape(ASSET_ORIGIN,quote=True)}),encoding="utf-8")
    sectors=Counter(item["sector"] for item in items);topics=Counter(item["topic"] for item in items);catalog={"release":"phase1","article_count":2640,"source_snapshot":manifest.get("source_snapshot"),"sector_counts":dict(sorted(sectors.items(),key=lambda pair:(-pair[1],pair[0]))),"topic_counts":dict(sorted(topics.items(),key=lambda pair:(-pair[1],pair[0]))),"articles":items};write_json(out/"phase1/catalog.json",catalog,compact=True);write_json(out/"phase1/taxonomy-summary.json",{"article_count":2640,"sector_count":len(sectors),"sector_counts":catalog["sector_counts"],"top_topics":list(catalog["topic_counts"].items())[:100]})
    urls=[SITE_ORIGIN+"/library"]+[SITE_ORIGIN+item["url"] for item in items];xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/sitemap/0.9">\n'+"\n".join("<url><loc>%s</loc></url>"%html.escape(url) for url in urls)+"\n</urlset>\n";(out/"phase1/sitemap.xml").write_text(xml,encoding="utf-8")
    article_files=list((out/"phase1/article").glob("*.html"));research_files=list((out/"phase1/research").glob("*.html"))
    if len(article_files)!=2640 or len(research_files)!=2640: raise SystemExit("Generated page count mismatch")
    for path in article_files:
        text=path.read_text(encoding="utf-8");soup=BeautifulSoup(text,"html.parser")
        if len(soup.find_all("h1"))!=1: raise SystemExit("Expected exactly one H1: "+path.name)
        if not soup.find("link",rel="canonical"): raise SystemExit("Missing canonical: "+path.name)
        for image in soup.find_all("img"):
            if not str(image.get("alt") or "").strip(): raise SystemExit("Missing image alt: "+path.name)
        if re.search(r"\[S0*\d+\]",text,re.I): raise SystemExit("Unresolved citation marker: "+path.name)
    files=[]
    for path in sorted((out/"phase1").rglob("*")):
        if path.is_file(): files.append({"path":path.relative_to(out).as_posix(),"bytes":path.stat().st_size,"sha256":checksum(path)})
    release={"release":"phase1","article_count":2640,"research_page_count":2640,"source_snapshot":manifest.get("source_snapshot"),"generated_at":datetime.now(timezone.utc).isoformat(),"file_count":len(files),"bytes":sum(row["bytes"] for row in files),"files":files};write_json(out/"release-manifest.json",release);write_json(out/"ready.json",{"ready":True,"article_count":2640,"research_page_count":2640,"sector_count":len(sectors),"file_count":len(files),"bytes":release["bytes"],"source_snapshot":manifest.get("source_snapshot")});print(json.dumps({"ready":True,"article_count":2640,"sector_count":len(sectors),"file_count":len(files),"bytes":release["bytes"]}))
if __name__=="__main__": main()
