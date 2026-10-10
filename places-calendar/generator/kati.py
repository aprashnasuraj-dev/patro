"""
Page contexts for the "kati" section: everyday Nepali unit questions.

    /kati/                                   index
    /kati/{group}/                           e.g. /kati/land/  (all units, master table)
    /kati/{from}-kati-{to}/                  e.g. /kati/ropani-kati-aana/  (table of values)
    /kati/{value}-{from}-kati-{to}/          e.g. /kati/5-ropani-kati-aana/  (one question)
    /kati/umer/                              age by BS birth year (hub)
    /kati/umer/{year}/                       e.g. /kati/umer/2060/

Every number is computed from data/units.yaml with exact fractions. Pages
link to the existing aafnaipatro.com tools (/tools/landconverter, /tools/gold,
/tools/units, /tools/words, /tools/age) for free-form calculation, so these
pages bring search traffic to the tools instead of competing with them.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from fractions import Fraction
from functools import lru_cache

from engine import bs
from engine import units as U
from . import model as M
from .i18n import T

K = {
    "en": {
        "kati": "Kati?",
        "kati_index_h1": "Kati? Everyday Nepali measurements",
        "kati_index_intro": "Straight answers to the everyday \"kati\" questions: how many aana in a ropani, grams in a tola, mana in a pathi, minutes in a ghadi, and lakh in a million — worked out exactly and written the Nepali way.",
        "answer": "Answer",
        "formula": "Formula",
        "one_each": "One of each",
        "mixed": "In local units",
        "mixed_in": "As {chain}",
        "square": "As a square plot",
        "square_txt": "{area} is the same as a square plot about {ft} ft × {ft} ft ({m} m × {m} m), or {haat} haat on each side.",
        "all_units": "{qty} in every unit",
        "unit": "Unit",
        "value": "Amount",
        "nearby": "{A} to {b} table",
        "reverse": "The other way round",
        "converter": "Convert another amount",
        "converter_label": "Amount in {a}",
        "full_tool": "Open the full {tool} on Aafnai Patro",
        "tools": {"/tools/landconverter": "land converter", "/tools/gold": "gold calculator", "/tools/units": "unit converter",
                  "/tools/words": "amount-in-words tool", "/tools/astro": "astronomical calendar", "/tools/age": "age calculator"},
        "about_units": "About these units",
        "sources": "Sources",
        "approx_unit": "Traditional value that varies by region; treat the answer as a close guide.",
        "rounded": "Rounded; the exact value is {exact}.",
        "exact": "This is exact.",
        "all_pairs": "All questions",
        "pair_h1": "{a} Kati {b}?",
        "pair_lede": "1 {a} = {r} {b}. To convert, {how}.",
        "multiply": "multiply by {r}",
        "divide": "divide by {r}",
        "group_units": "Units",
        "matrix": "Conversion table",
        "questions_in": "Questions about {g}",
        "popular": "Popular questions",
        "groups": "Topics",
        "digits": "In digits",
        "nepali_comma": "Nepali grouping",
        "intl_comma": "International grouping",
        "zeros": "{n} zeros",
        "q_one": "1 {a} kati {b}?",
        "faq_same": "Is the {a} the same everywhere in Nepal?",
        "faq_same_a": "No. {note}",
        "age": "Age by birth year",
        "age_h1": "{y} Sal Ma Janmeko Ko Umer Kati?",
        "age_sub": "Born in {y} BS: your age on {today}",
        "age_lede": "If you were born in {y} BS you are {lo} or {hi} years old today, depending on your birth month.",
        "age_lede_new": "Anyone born in {y} BS is under one year old today.",
        "age_month": "Birth month",
        "age_now": "Age today",
        "age_ad": "AD birth date",
        "age_note_split": "{x} if born on or before {month} {day}, otherwise {y}",
        "milestones": "Milestones",
        "milestone": "Milestone",
        "age_at": "Age",
        "year_bs": "Year (BS)",
        "ms": {"16": "Can apply for citizenship (Citizenship Act 2063)", "18": "Can register and vote",
               "20": "Legal age of marriage (National Criminal Code 2074)", "60": "Senior citizen (Senior Citizens Act 2063)",
               "68": "Eligible for elderly allowance (from FY 2079/80)"},
        "reached": "reached",
        "in_years": "in {n} years",
        "this_year": "this year",
        "exact_age": "For your exact age in years, months and days, use the age calculator.",
        "age_index_h1": "Umer Kati? Age by BS birth year",
        "age_index_intro": "Age today for every birth year from {first} to {last} BS.",
        "born": "Born",
    },
    "ne": {
        "kati": "कति?",
        "kati_index_h1": "कति? दैनिक नेपाली नापतौल",
        "kati_index_intro": "दैनिक \"कति\" प्रश्नको सिधा उत्तर: एक रोपनीमा कति आना, एक तोलामा कति ग्राम, एक पाथीमा कति माना, एक घडीमा कति मिनेट, र एक मिलियनमा कति लाख — ठ्याक्कै गणना गरी नेपाली शैलीमा लेखिएको।",
        "answer": "उत्तर",
        "formula": "सूत्र",
        "one_each": "एक-एकको नाप",
        "mixed": "स्थानीय एकाइमा",
        "mixed_in": "{chain}मा",
        "square": "वर्गाकार जग्गाका रूपमा",
        "square_txt": "{area} बराबर करिब {ft} फिट × {ft} फिट ({m} मि. × {m} मि.) को वर्गाकार जग्गा, अर्थात् हरेक किनारा {haat} हात।",
        "all_units": "{qty} सबै एकाइमा",
        "unit": "एकाइ",
        "value": "परिमाण",
        "nearby": "{a}बाट {b} तालिका",
        "reverse": "उल्टो प्रश्न",
        "converter": "अर्को परिमाण बदल्नुहोस्",
        "converter_label": "{a}मा परिमाण",
        "full_tool": "आफ्नै पात्रोको पूरा {tool} खोल्नुहोस्",
        "tools": {"/tools/landconverter": "जग्गा रूपान्तरण", "/tools/gold": "सुन क्याल्कुलेटर", "/tools/units": "एकाइ रूपान्तरण",
                  "/tools/words": "अंकलाई अक्षरमा", "/tools/astro": "खगोलीय पात्रो", "/tools/age": "उमेर क्याल्कुलेटर"},
        "about_units": "यी एकाइबारे",
        "sources": "स्रोत",
        "approx_unit": "क्षेत्रअनुसार फरक पर्ने परम्परागत मान; उत्तरलाई नजिकको अनुमान मान्नुहोस्।",
        "rounded": "गोलाइएको मान; ठ्याक्कै मान {exact} हो।",
        "exact": "यो ठ्याक्कै मान हो।",
        "all_pairs": "सबै प्रश्न",
        "pair_h1": "{a} कति {b}?",
        "pair_lede": "१ {a} = {r} {b}। रूपान्तरण गर्न {how}।",
        "multiply": "{r} ले गुणन गर्नुहोस्",
        "divide": "{r} ले भाग गर्नुहोस्",
        "group_units": "एकाइहरू",
        "matrix": "रूपान्तरण तालिका",
        "questions_in": "{g}सम्बन्धी प्रश्न",
        "popular": "धेरै सोधिने प्रश्न",
        "groups": "विषय",
        "digits": "अंकमा",
        "nepali_comma": "नेपाली अल्पविराम",
        "intl_comma": "अन्तर्राष्ट्रिय अल्पविराम",
        "zeros": "{n} वटा शून्य",
        "q_one": "१ {a} कति {b}?",
        "faq_same": "{a} नेपालभरि एउटै हुन्छ?",
        "faq_same_a": "हुँदैन। {note}",
        "age": "जन्म सालअनुसार उमेर",
        "age_h1": "{y} सालमा जन्मेको उमेर कति?",
        "age_sub": "{y} सालमा जन्मेको: {today} मा उमेर",
        "age_lede": "{y} सालमा जन्मनुभएको हो भने जन्म महिनाअनुसार आज तपाईंको उमेर {lo} वा {hi} वर्ष हुन्छ।",
        "age_lede_new": "{y} सालमा जन्मेका सबैको उमेर आज एक वर्षभन्दा कम छ।",
        "age_month": "जन्म महिना",
        "age_now": "आजको उमेर",
        "age_ad": "ईस्वी जन्म मिति",
        "age_note_split": "{month} {day} गते वा अघि जन्मेको भए {x}, नत्र {y}",
        "milestones": "महत्त्वपूर्ण उमेर",
        "milestone": "विषय",
        "age_at": "उमेर",
        "year_bs": "साल (वि.सं.)",
        "ms": {"16": "नागरिकता लिन सकिने (नागरिकता ऐन २०६३)", "18": "मतदाता नामावलीमा नाम लेखाई मतदान गर्न सकिने",
               "20": "विवाहको कानुनी उमेर (मुलुकी अपराध संहिता २०७४)", "60": "ज्येष्ठ नागरिक (ज्येष्ठ नागरिक ऐन २०६३)",
               "68": "वृद्धभत्ता पाउने (आर्थिक वर्ष २०७९/८० देखि)"},
        "reached": "पुगिसकेको",
        "in_years": "{n} वर्षपछि",
        "this_year": "यसै वर्ष",
        "exact_age": "वर्ष, महिना र दिनमा ठ्याक्कै उमेर निकाल्न उमेर क्याल्कुलेटर प्रयोग गर्नुहोस्।",
        "age_index_h1": "उमेर कति? जन्म सालअनुसार उमेर",
        "age_index_intro": "वि.सं. {first} देखि {last} सम्म जन्मेका सबैको आजको उमेर।",
        "born": "जन्म",
    },
}
for _l in ("en", "ne"):
    T[_l].update(K[_l])

AGE_FIRST = 2000
POPULAR = [("1", "ropani", "aana"), ("1", "ropani", "sqft"), ("1", "aana", "sqft"), ("1", "bigha", "kattha"),
           ("1", "bigha", "ropani"), ("1", "kattha", "dhur"), ("1", "kattha", "sqft"), ("1", "ropani", "kattha"),
           ("1", "tola", "gram"), ("1", "tola", "lal"), ("10", "gram", "tola"), ("1", "dharni", "mkg"),
           ("1", "pathi", "mana"), ("1", "muri", "pathi"), ("1", "haat", "foot"), ("1", "ghadi", "minute"),
           ("1", "crore", "million"), ("1", "arab", "crore"), ("1", "million", "lakh"), ("1", "lakh", "hajar")]


def t(lang, key, **kw):
    v = T[lang][key]
    return v.format(**kw) if kw else v


def n(q, lang, **kw):
    return U.fmt(Fraction(q), lang, **kw)


@lru_cache(maxsize=1)
def index():
    """slug -> (group, from, to) for pair pages; checks slugs are unique."""
    pairs, seen = {}, set()
    for g in U.groups().values():
        for a, b in U.pairs(g):
            s = f"{a.slug}-kati-{b.slug}"
            if s in seen:
                raise ValueError(f"duplicate kati pair slug {s}")
            seen.add(s)
            pairs[s] = (g.id, a.id, b.id)
    return pairs


def pair_slug(a, b):
    return f"{a.slug}-kati-{b.slug}"


def q_slug(v, a, b):
    return f"{U.vslug(v)}-{a.slug}-kati-{b.slug}"


def has_q(v, a, b) -> bool:
    if a.generic and b.generic:
        return False
    if a.factor == b.factor and v != 1:
        return False
    return v in a.values


def q_url(lang, v, a, b):
    """Question page if it exists, else the pair page, else None (metric-to-metric)."""
    if a.generic and b.generic:
        return None
    return M.url(lang, "kati", q_slug(v, a, b)) if has_q(v, a, b) else M.url(lang, "kati", pair_slug(a, b))


def how(r: Fraction, lang: str) -> str:
    if r.denominator == 1 or r >= 1:
        return t(lang, "multiply", r=n(r, lang))
    inv = 1 / r
    if inv.denominator == 1:
        return t(lang, "divide", r=n(inv, lang))
    return t(lang, "multiply", r=n(r, lang))


def formula(a, b, lang) -> str:
    r = U.ratio(a, b)
    if r.denominator != 1 and r < 1 and (1 / r).denominator == 1:
        return f"{b.label(lang, 2)} = {a.label(lang, 2)} ÷ {n(1 / r, lang)}"
    return f"{b.label(lang, 2)} = {a.label(lang, 2)} × {n(r, lang)}"


def chain_name(chain, lang):
    return "–".join(u.label(lang) for u in chain)


def tool_link(g, lang):
    tool = g.raw.get("tool")
    if not tool:
        return None
    return {"url": tool, "label": t(lang, "full_tool", tool=T[lang]["tools"].get(tool, tool))}


def og_spec(path, seed, question, answer, sub):
    return {"kind": "kati", "path": path, "seed": seed, "question": question, "answer": answer, "sub": sub}


def converter(a, b, lang, g):
    return {"ratio": format(float(U.ratio(a, b)), ".12g"), "from": a.label(lang, 2), "to": b.label(lang, 2),
            "label": t(lang, "converter_label", a=a.label(lang, 2)), "lang": lang}


def sources(g):
    return g.raw.get("sources", [])


# --------------------------------------------------------------------------
# One question
# --------------------------------------------------------------------------
def question_ctx(gid: str, aid: str, bid: str, v: str, lang: str) -> dict:
    g = U.groups()[gid]
    a, b = g.unit(aid), g.unit(bid)
    v = Fraction(v)
    q = U.convert(v, a, b)
    r = U.ratio(a, b)
    vs, qs = n(v, lang), n(q, lang)
    al, bl = a.label(lang, v), b.label(lang, q)
    slug = q_slug(v, a, b)
    path = ("kati", slug)
    approx = a.approximate or b.approximate

    if lang == "ne":
        h1 = f"{vs} {a.ne} कति {b.ne}?"
        title = f"{vs} {a.ne} कति {b.ne}? {vs} {a.ne} = {qs} {b.ne}"
        desc = f"{vs} {a.ne} = {qs} {b.ne}। सूत्र, मिश्रित एकाइ, सबै एकाइमा बराबरी र नजिकका मानको तालिका।"
    else:
        h1 = f"{vs} {a.title(lang)} Kati {b.title(lang)}?"
        title = f"{vs} {a.title(lang)} Kati {b.title(lang)}? {vs} {al} = {qs} {bl}"
        desc = (f"{vs} {al} = {qs} {bl}. How many {b.en_pl} are in {vs} {al}, with the formula, "
                f"mixed units, every equivalent and a table of nearby amounts.")
    answer_line = f"{vs} {al} = {qs} {bl}"
    exact_note = t(lang, "exact") if U.is_exact(q) else t(lang, "rounded", exact=n(q, lang, places=8))

    base = v * a.factor
    mixed = []
    for ch in g.chains:
        if len(ch) < 2:
            continue
        parts = U.breakdown(base, ch)
        if len(parts) == 1 and parts[0][0].id in (a.id, b.id):
            continue
        mixed.append({"label": t(lang, "mixed_in", chain=chain_name(ch, lang)), "text": U.breakdown_text(parts, lang)})

    square = None
    if g.raw.get("square"):
        side = U.square_side(base)
        square = t(lang, "square_txt", area=f"{vs} {al}", ft=n(Fraction(round(side, 1)).limit_denominator(10), lang, places=1),
                   m=n(Fraction(round(side * 0.3048, 1)).limit_denominator(10), lang, places=1),
                   haat=n(Fraction(round(side / 1.5, 1)).limit_denominator(10), lang, places=1))

    digits = None
    if g.raw.get("numbers"):
        whole = v * a.factor
        if whole.denominator == 1:
            s = str(whole.numerator)
            digits = {"lakh": U.fmt(whole, lang), "intl": U.fmt(whole, lang, grouping="intl"),
                      "zeros": t(lang, "zeros", n=n(len(s) - len(s.rstrip("0")), lang))}

    equiv = []
    for u in g.units:
        if u.id == a.id:
            continue
        uq = U.convert(v, a, u)
        equiv.append({"unit": u.label(lang, uq), "value": n(uq, lang), "url": q_url(lang, v, a, u),
                      "current": u.id == b.id})

    table = []
    for vv in a.values:
        if not has_q(vv, a, b):
            continue
        table.append({"from": f"{n(vv, lang)} {a.label(lang, vv)}", "to": f"{n(U.convert(vv, a, b), lang)} {b.label(lang, U.convert(vv, a, b))}",
                      "url": M.url(lang, "kati", q_slug(vv, a, b)), "current": vv == v})

    rev = {"q": (f"{qs} {b.ne} कति {a.ne}?" if lang == "ne" else f"{qs} {b.title(lang)} Kati {a.title(lang)}?"),
           "url": q_url(lang, q, b, a), "a": f"{qs} {bl} = {vs} {al}"}
    one_q = t(lang, "q_one", a=a.label(lang), b=b.label(lang, 2))
    one_a = f"1 {a.label(lang)} = {n(r, lang)} {b.label(lang, r)}" if lang == "en" else f"१ {a.ne} = {n(r, lang)} {b.ne}"

    faq = [(h1, f"{answer_line}. {exact_note}" if lang == "en" else f"{answer_line}। {exact_note}")]
    if v != 1:
        faq.append((one_q, one_a))
    if approx:
        note = (a if a.approximate else b)
        faq.append((t(lang, "faq_same", a=note.label(lang)), t(lang, "faq_same_a", note=t(lang, "approx_unit"))))

    og = M.og_path(lang, "kati", pair_slug(a, b))
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "kati"), M.url(lang, "kati")),
              (g.raw[f"name_{lang}"], M.url(lang, "kati", g.id)),
              (t(lang, "pair_h1", a=a.title(lang), b=b.title(lang)), M.url(lang, "kati", pair_slug(a, b))),
              (h1, M.url(lang, *path))]
    ctx = M.page_shell(lang, path, title, desc, crumbs, og, [M.faq_ld(faq)])
    ctx.update({
        "kind": "kati_q", "h1": h1, "answer_line": answer_line, "exact_note": exact_note, "approx": approx,
        "formula": formula(a, b, lang), "one_a": one_a,
        "one_b": (f"1 {b.label(lang)} = {n(1 / r, lang)} {a.label(lang, 1 / r)}" if lang == "en" else f"१ {b.ne} = {n(1 / r, lang)} {a.ne}"),
        "mixed": mixed, "square": square, "digits": digits,
        "equiv_title": t(lang, "all_units", qty=f"{vs} {al}"), "equiv": equiv,
        "table_title": t(lang, "nearby", a=a.label(lang), A=a.title(lang), b=b.label(lang, 2)), "table": table,
        "rev": rev, "conv": converter(a, b, lang, g), "tool": tool_link(g, lang),
        "notes": [(a.title(lang), getattr(a, f"note_{lang}")), (b.title(lang), getattr(b, f"note_{lang}"))],
        "sources": sources(g), "faq": faq, "pair_url": M.url(lang, "kati", pair_slug(a, b)),
        "group_url": M.url(lang, "kati", g.id), "group_name": g.raw[f"name_{lang}"],
        "_og": None,
        "_json": None,
    })
    return ctx


# --------------------------------------------------------------------------
# Pair hub: /kati/ropani-kati-aana/
# --------------------------------------------------------------------------
def pair_ctx(gid: str, aid: str, bid: str, lang: str) -> dict:
    g = U.groups()[gid]
    a, b = g.unit(aid), g.unit(bid)
    r = U.ratio(a, b)
    slug = pair_slug(a, b)
    path = ("kati", slug)
    h1 = t(lang, "pair_h1", a=a.title(lang), b=b.title(lang))
    one = f"{n(1, lang)} {a.label(lang)} = {n(r, lang)} {b.label(lang, r)}"
    title = f"{h1} {one}" + (" — रूपान्तरण तालिका" if lang == "ne" else " — Conversion Table")
    desc = (f"{one}। {a.ne}बाट {b.ne} रूपान्तरण गर्ने सूत्र र तालिका।" if lang == "ne"
            else f"{one}. Formula and table for converting {a.en} to {b.en_pl}.")
    rows = [{"from": f"{n(v, lang)} {a.label(lang, v)}", "to": f"{n(U.convert(v, a, b), lang)} {b.label(lang, U.convert(v, a, b))}",
             "url": M.url(lang, "kati", q_slug(v, a, b)) if has_q(v, a, b) else None} for v in a.values if has_q(v, a, b)]
    rev_rows = [{"from": f"{n(v, lang)} {b.label(lang, v)}", "to": f"{n(U.convert(v, b, a), lang)} {a.label(lang, U.convert(v, b, a))}",
                 "url": q_url(lang, v, b, a)} for v in b.values[:12]] if not (a.generic and b.generic) else []
    og = M.og_path(lang, "kati", slug)
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "kati"), M.url(lang, "kati")),
              (g.raw[f"name_{lang}"], M.url(lang, "kati", g.id)), (h1, M.url(lang, *path))]
    faq = [(t(lang, "q_one", a=a.label(lang), b=b.label(lang, 2)), one)]
    ctx = M.page_shell(lang, path, title, desc, crumbs, og, [M.faq_ld(faq)])
    ctx.update({
        "kind": "kati_pair", "h1": h1, "one": one, "lede": t(lang, "pair_lede", a=a.label(lang), b=b.label(lang, r), r=n(r, lang), how=how(r, lang)),
        "formula": formula(a, b, lang), "rows": rows, "rev_title": t(lang, "nearby", a=b.label(lang), A=b.title(lang), b=a.label(lang, 2)),
        "rev_rows": rev_rows, "reverse_url": M.url(lang, "kati", pair_slug(b, a)), "conv": converter(a, b, lang, g),
        "tool": tool_link(g, lang), "approx": a.approximate or b.approximate,
        "notes": [(a.title(lang), getattr(a, f"note_{lang}")), (b.title(lang), getattr(b, f"note_{lang}"))],
        "sources": sources(g), "table_title": t(lang, "nearby", a=a.label(lang), A=a.title(lang), b=b.label(lang, 2)),
        "_og": og_spec(og, slug, (f"१ {a.ne} कति {b.ne}?" if lang == "ne" else f"1 {a.title(lang)} Kati {b.title(lang)}?"),
                       one, g.raw[f"name_{lang}"]),
        "_json": None,
    })
    return ctx


# --------------------------------------------------------------------------
# Group page: /kati/land/
# --------------------------------------------------------------------------
def group_ctx(gid: str, lang: str) -> dict:
    g = U.groups()[gid]
    path = ("kati", gid)
    h1 = g.raw[f"title_{lang}"]
    trad = [u for u in g.units if not u.generic] or g.units
    cols = g.units
    matrix = []
    for a in trad:
        row = {"unit": a.title(lang), "cells": []}
        for b in cols:
            if a.id == b.id:
                row["cells"].append({"v": "—", "url": None})
            else:
                row["cells"].append({"v": n(U.ratio(a, b), lang), "url": q_url(lang, Fraction(1), a, b) if has_q(Fraction(1), a, b) else None})
        matrix.append(row)
    pairs = [{"name": t(lang, "pair_h1", a=a.title(lang), b=b.title(lang)), "url": M.url(lang, "kati", pair_slug(a, b))}
             for a, b in U.pairs(g)]
    units_list = [(u.title(lang), getattr(u, f"note_{lang}")) for u in g.units]
    title = f"{h1} — {T[lang]['site']}"
    og = M.og_path(lang, "kati", gid)
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "kati"), M.url(lang, "kati")), (g.raw[f"name_{lang}"], M.url(lang, *path))]
    ctx = M.page_shell(lang, path, title, g.raw[f"about_{lang}"], crumbs, og, [])
    first, second = (g.units[0], g.units[1])
    ctx.update({"kind": "kati_group", "h1": h1, "about": g.raw[f"about_{lang}"], "units_list": units_list,
                "matrix_cols": [u.title(lang) for u in cols], "matrix": matrix, "pairs": pairs,
                "tool": tool_link(g, lang), "sources": sources(g), "approx": bool(g.raw.get("approximate")),
                "_og": og_spec(og, gid, g.raw[f"name_{lang}"],
                               f"{n(1, lang)} {first.label(lang)} = {n(U.ratio(first, second), lang)} {second.label(lang, 2)}",
                               t(lang, "kati")),
                "_json": None})
    return ctx


def index_ctx(lang: str) -> dict:
    path = ("kati",)
    gs = U.groups()
    groups_l = [{"name": g.raw[f"name_{lang}"], "title": g.raw[f"title_{lang}"], "url": M.url(lang, "kati", g.id)} for g in gs.values()]
    pop = []
    for v, aid, bid in POPULAR:
        g = next(gg for gg in gs.values() if any(u.id == aid for u in gg.units))
        a, b = g.unit(aid), g.unit(bid)
        vv = Fraction(v)
        q = U.convert(vv, a, b)
        pop.append({"q": (f"{n(vv, lang)} {a.ne} कति {b.ne}?" if lang == "ne" else f"{n(vv, lang)} {a.title(lang)} Kati {b.title(lang)}?"),
                    "a": f"{n(q, lang)} {b.label(lang, q)}", "url": q_url(lang, vv, a, b)})
    h1 = t(lang, "kati_index_h1")
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "kati"), M.url(lang, *path))]
    ctx = M.page_shell(lang, path, h1, t(lang, "kati_index_intro"), crumbs, None,
                       [M.faq_ld([(p["q"], p["a"]) for p in pop[:10]])])
    ctx.update({"kind": "kati_index", "h1": h1, "intro": t(lang, "kati_index_intro"), "groups_l": groups_l,
                "popular": pop, "age_url": M.url(lang, "kati", "umer"), "_og": None, "_json": None})
    return ctx


# --------------------------------------------------------------------------
# Age by BS birth year
# --------------------------------------------------------------------------
MILESTONES = (16, 18, 20, 60, 68)


def age_ctx(y: int, lang: str) -> dict:
    today = M.CFG.today
    ty, tm, td = bs.ad_to_bs(today)
    months = bs.BS_MONTHS_NE if lang == "ne" else bs.BS_MONTHS_EN
    rows = []
    for m in range(1, 13):
        if y == ty and m > tm:
            continue                      # not born yet
        if m < tm:
            txt = n(ty - y, lang)
        elif m > tm:
            txt = n(ty - y - 1, lang)
        else:                             # same month: depends on the day
            txt = t(lang, "age_note_split", x=n(ty - y, lang), y=n(max(0, ty - y - 1), lang),
                    month=months[tm - 1], day=n(td, lang))
        start = bs.bs_to_ad(y, m, 1)
        end = bs.bs_to_ad(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1)
        rows.append({"month": months[m - 1], "age": txt, "ad": f"{bs.fmt_ad(start, lang)} – {bs.fmt_ad(end, lang)}"})
    lo, hi = max(0, ty - y - 1), ty - y
    ms = []
    for age in MILESTONES:
        yy = y + age
        if yy < ty:
            status = t(lang, "reached")
        elif yy == ty:
            status = t(lang, "this_year")
        else:
            status = t(lang, "in_years", n=n(yy - ty, lang))
        ms.append({"age": n(age, lang), "what": T[lang]["ms"][str(age)], "year": bs.ne_num(yy) if lang == "ne" else str(yy), "status": status})
    yl = bs.ne_num(y) if lang == "ne" else str(y)
    path = ("kati", "umer", str(y))
    h1 = t(lang, "age_h1", y=yl)
    today_l = bs.fmt_bs(today, lang)
    span = f"{lo}–{hi}" if lo != hi else f"{hi}"
    title = (f"{h1} {bs.ne_num(ty)} मा {bs.ne_num(span)} वर्ष" if lang == "ne"
             else f"{h1} Age in {ty} BS: {span} Years")
    if y == ty:
        lede = t(lang, "age_lede_new", y=yl)
    else:
        lede = t(lang, "age_lede", y=yl, lo=n(lo, lang), hi=n(hi, lang))
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "kati"), M.url(lang, "kati")),
              (t(lang, "age"), M.url(lang, "kati", "umer")), (yl, M.url(lang, *path))]
    faq = [(h1, lede)]
    ctx = M.page_shell(lang, path, title, lede, crumbs, None, [M.faq_ld(faq)])
    ad0 = bs.bs_to_ad(y, 1, 1)
    ctx.update({"kind": "kati_age", "h1": h1, "sub": t(lang, "age_sub", y=yl, today=today_l), "lede": lede,
                "rows": rows, "ms": ms, "faq": faq, "tool": {"url": "/tools/age", "label": t(lang, "full_tool", tool=T[lang]["tools"]["/tools/age"])},
                "prev_url": M.url(lang, "kati", "umer", str(y - 1)) if y > AGE_FIRST else None,
                "next_url": M.url(lang, "kati", "umer", str(y + 1)) if y < ty else None,
                "prev_label": bs.ne_num(y - 1) if lang == "ne" else str(y - 1),
                "next_label": bs.ne_num(y + 1) if lang == "ne" else str(y + 1),
                "hub_url": M.url(lang, "kati", "umer"), "ad_range": f"{bs.fmt_ad(ad0, lang)}",
                "_og": None, "_json": None})
    return ctx


def age_index_ctx(lang: str) -> dict:
    ty, tm, td = bs.ad_to_bs(M.CFG.today)
    path = ("kati", "umer")
    rows = [{"y": bs.ne_num(y) if lang == "ne" else str(y), "url": M.url(lang, "kati", "umer", str(y)),
             "age": f"{n(max(0, ty - y - 1), lang)}–{n(ty - y, lang)}"} for y in range(ty, AGE_FIRST - 1, -1)]
    h1 = t(lang, "age_index_h1")
    intro = t(lang, "age_index_intro", first=bs.ne_num(AGE_FIRST) if lang == "ne" else AGE_FIRST,
              last=bs.ne_num(ty) if lang == "ne" else ty)
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "kati"), M.url(lang, "kati")), (t(lang, "age"), M.url(lang, *path))]
    ctx = M.page_shell(lang, path, h1, intro, crumbs, None, [])
    ctx.update({"kind": "kati_age_index", "h1": h1, "intro": intro, "rows": rows, "_og": None, "_json": None})
    return ctx


def age_years() -> list[int]:
    return list(range(AGE_FIRST, bs.ad_to_bs(M.CFG.today)[0] + 1))


def all_tasks(lang: str) -> list[tuple]:
    out = [("kati_index", lang), ("kati_age_index", lang)]
    for g in U.groups().values():
        out.append(("kati_group", g.id, lang))
        for a, b in U.pairs(g):
            out.append(("kati_pair", g.id, a.id, b.id, lang))
        for v, a, b in U.questions(g):
            out.append(("kati_q", g.id, a.id, b.id, U.vslug(v), lang))
    for y in age_years():
        out.append(("kati_age", y, lang))
    index()  # validates slugs
    return out
