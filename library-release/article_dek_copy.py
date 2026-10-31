"""Editorial subtitle cleanup for generated and already published article pages."""
from __future__ import annotations
import html
import re

# Editorial exception for a known, previously duplicated and truncated lead.
OVERRIDES={
    "utm-grid-convergence-vs-magnetic-declination":
        "Learn how true north, grid north and magnetic north relate, then apply grid convergence and magnetic declination correctly when converting bearings."
}

def plain(value):
    return html.unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",str(value or "")))).strip()

def _remove_title(title, value):
    text=plain(value).replace("\u2014",", ")
    name=plain(title).replace("\u2014",", ")
    if text.casefold().startswith(name.casefold()):
        text=text[len(name):].lstrip(" .:;,\u2013-")
    return text.strip()

def _full_sentences(value):
    text=plain(value).replace("\u2014",", ")
    text=re.sub(r"\[(?:S0*\d+|\d+)\]","",text,flags=re.I)
    # Reject explicitly truncated snippets instead of showing cut-off text.
    if text.endswith(("\u2026","...")):
        return ""
    parts=re.split(r"(?<=[.!?])\s+",text)
    result=""
    for part in parts:
        candidate=(result+" "+part).strip()
        if len(candidate)>250:
            break
        if part.endswith((".","!","?")) and len(candidate)>=65:
            return candidate
        result=candidate
    if result.endswith((".","!","?")) and len(result)>=65:
        return result
    return ""

def clean_dek(title,existing,paragraphs=(),slug="",quick_paragraphs=()):
    if slug in OVERRIDES: return OVERRIDES[slug]
    heading=plain(title)
    quick=[plain(x).casefold() for x in quick_paragraphs if plain(x)]
    def usable(value):
        text=_remove_title(heading,value)
        sentence=_full_sentences(text)
        if not sentence or sentence.casefold().startswith(heading.casefold()):
            return ""
        if sentence.casefold() in quick or any(x.startswith(sentence.casefold()) for x in quick):
            return ""
        return sentence

    # Keep complete human-edited subtitles only when they do not duplicate
    # the opening Quick Answer or the headline.
    candidate=usable(existing)
    if candidate: return candidate

    # The first three article paragraphs often repeat the Quick Answer box.
    # Use a later complete technical sentence instead of copying its lead.
    for index,paragraph in enumerate(paragraphs):
        if index<3: continue
        candidate=usable(paragraph)
        if candidate:
            return candidate

    # A conservative fallback avoids fabricating technical claims or
    # repeating the title when the source lacks an independent subtitle.
    topic=heading.replace(chr(0x2014),", ").strip(" .:;")
    topic=re.sub(r"\s+"," ",topic)
    if len(topic)>125:
        topic=topic[:122].rsplit(" ",1)[0].rstrip(" ,:;")
    if not topic:
        return "Understand the key concepts, applications and verification checks covered in this article."
    return "Understand "+topic[0].lower()+topic[1:]+", including practical examples, assumptions and limitations."
