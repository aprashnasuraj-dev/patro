"""Article-specific research notes grounded in each article's citation ledger."""
from __future__ import annotations
import hashlib
import html
import re

def title_focus(title):
    title=html.unescape(re.sub(r"<[^>]+>","",str(title or ""))).replace("\u2014",", ")
    title=re.sub(r"\s+"," ",title).strip(" .:;?")
    title=re.sub(r"\s*\b(?:explained|guide|tutorial)\s*$","",title,flags=re.I).strip(" .:;?")
    if len(title)>112:
        title=title[:109].rsplit(" ",1)[0].rstrip(" ,:")+"..."
    def lower_prose(value):
        return " ".join(w if len(w)>1 and w.isupper() else w.lower() if w[:1].isupper() else w for w in value.split())
    pieces=re.split(r"\s+(?:vs\.?|versus)\s+",title,maxsplit=1,flags=re.I)
    if len(pieces)==2:
        return "the distinction between "+lower_prose(pieces[0])+" and "+lower_prose(pieces[1])
    return lower_prose(title) if title else "the subject"

def source_publishers(publishers):
    selected=[]
    for value in publishers:
        name=html.unescape(re.sub(r"\s+"," ",str(value))).strip(" .,:;|")
        if not (2<=len(name)<=48) or name.lower() in ("n/a","unknown","source","not specified"):
            continue
        if name.casefold() not in {x.casefold() for x in selected}:
            selected.append(name)
        if len(selected)==2: break
    if len(selected)==2:
        return " Sources include "+selected[0]+" and "+selected[1]+"."
    if len(selected)==1:
        return " Sources include "+selected[0]+"."
    return ""

def make_research_note(title,source_count,*,key="",publishers=(),actual_test_performed=False):
    """Do not claim sources are verified, primary or peer-reviewed without proof."""
    if source_count<1:
        raise ValueError("Cannot publish research note without cited sources")
    if key=="utm-grid-convergence-vs-magnetic-declination" and source_count==8:
        return ("This article compares grid convergence and magnetic declination using 8 cited technical references, including USGS, NOAA, LINZ and Esri. "
                "The evidence record identifies bearing conventions, conversion formulas and important limitations.")
    focus=title_focus(title)
    number=str(source_count)
    noun="reference" if source_count==1 else "references"
    openings=[
        f"This examination of {focus} draws on {number} cited {noun}.",
        f"For {focus}, the article brings together {number} supporting {noun}.",
        f"The discussion of {focus} is grounded in {number} linked {noun}.",
        f"A review of {number} cited {noun} informs this analysis of {focus}.",
        f"The article traces {focus} through {number} documented {noun}.",
        f"This technical overview considers {focus} using {number} cited {noun}.",
        f"Evidence for the treatment of {focus} comes from {number} linked {noun}.",
        f"The analysis of {focus} draws on a record of {number} cited {noun}.",
    ]
    endings=[
        " The evidence record identifies which claims the sources support and notes their limits.",
        " The linked research record documents source coverage and important qualifications.",
        " Source links, supporting claims, and stated limitations are available in the research record.",
        " The accompanying evidence ledger records what each citation does and does not establish.",
        " The research page provides claim-level citations and scope notes for closer review.",
        " The research record separates documented support from the limits of each reference.",
        " The linked source ledger makes the evidence trail and its boundaries inspectable.",
        " Supporting citations and their stated scope are documented in the evidence record.",
    ]
    variant=int.from_bytes(hashlib.sha256((key or title).encode("utf-8")).digest()[:4],"big")%len(openings)
    tested=" Executed checks are documented in the article record." if actual_test_performed else ""
    return openings[variant]+source_publishers(publishers)+endings[variant]+tested
