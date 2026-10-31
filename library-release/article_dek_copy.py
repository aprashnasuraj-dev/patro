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

def clean_dek(title,existing,paragraphs=(),slug=""):
    if slug in OVERRIDES: return OVERRIDES[slug]
    # Prefer editorial copy if it is complete and does not repeat the headline.
    candidates=[existing]+list(paragraphs)
    for candidate in candidates:
        text=_remove_title(title,candidate)
        if not text or text.casefold()==plain(title).casefold():
            continue
        text=_full_sentences(text)
        if text and not text.casefold().startswith(plain(title).casefold()):
            return text
    # There is no justified way to invent a technical conclusion from the headline.
    # Use a descriptive, topic-specific framing that does not make evidence claims.
    topic=plain(title).replace("\u2014",", ").rstrip(".:")
    if len(topic)>145:
        topic=topic[:142].rsplit(" ",1)[0]
    return "A practical guide to "+topic[0].lower()+topic[1:]+", with key concepts, examples and scope explained in the article."
