"""
Page model: turns data + engine output into template contexts.

Every page context is built for one language ("en" or "ne") and contains
only computed or curated facts — no filler text. URLs follow:

    /places/                         index of sacred places
    /places/{place}/                 place hub
    /places/{place}/{festival}-{y}/  place x festival x BS year   (main volume)
    /festivals/                      index of festivals
    /festivals/{festival}/           festival hub, all years
    /festivals/{festival}/{y}/       festival x BS year
    /mountains/                      index of peaks and viewpoints
    /mountains/{peak}/               peak hub
    /mountains/{peak}/{y}/           peak x BS year (full moons, sun at altitude)
    /treks/                          index of treks
    /treks/{trek}/                   trek hub
    /treks/{trek}/{stop}/            trek stop

Nepali pages live under /ne/ with the same paths.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from engine import astro, bs, lunar, panchang
from engine import festivals as F
from . import images
from .i18n import T, MONTHS_AD_EN, MONTHS_AD_NE, PROVINCES_NE

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
@dataclass
class Config:
    base_url: str = "https://aafnaipatro.com"
    first_year: int = 2083          # build.py sets this to the current BS year unless --years says otherwise
    last_year: int = 2100
    today: date = field(default_factory=lambda: datetime.now(astro.NPT).date())
    asset_prefix: str = "/static/places"
    # Sections being built; nav and cross-links only point at these. build.py sets it from --only.
    sections: tuple = ("places", "festivals", "mountains", "treks", "kati", "janma", "shraddha")
    # Where a place links when the places section is not built (aafnaipatro.com's own Nepal map search).
    map_url: str = "/nepalmap?q="
    path_root: str = ""              # e.g. "/explore" to mount every section under one prefix
    index_osm: bool = False          # OSM-imported places noindex until proven
    image_years: tuple = ()          # BS years that get per-page OG images ((): current-1..current+2)

    @property
    def current_bs_year(self) -> int:
        return bs.ad_to_bs(self.today)[0]

    def wants_image(self, year: int | None) -> bool:
        if year is None:
            return True
        yrs = self.image_years or tuple(range(self.current_bs_year, self.current_bs_year + 3))
        return year in yrs


CFG = Config()


# --------------------------------------------------------------------------
# Data
# --------------------------------------------------------------------------
def _load(name: str, key: str) -> list:
    p = DATA / name
    if not p.exists():
        return []
    return yaml.safe_load(p.read_text(encoding="utf-8")).get(key) or []


@lru_cache(maxsize=1)
def places() -> dict[str, dict]:
    out = {}
    for p in _load("places.yaml", "places") + _load("places_osm.yaml", "places"):
        p.setdefault("curated", True)
        p.setdefault("source", "curated")
        out[p["id"]] = p
    return out


@lru_cache(maxsize=1)
def peaks() -> dict[str, dict]:
    out = {}
    for p in _load("peaks.yaml", "peaks") + _load("peaks_osm.yaml", "peaks"):
        p.setdefault("curated", True)
        p.setdefault("source", "curated")
        out[p["id"]] = p
    return out


@lru_cache(maxsize=1)
def treks() -> dict[str, dict]:
    return {t["id"]: t for t in _load("treks.yaml", "treks")}


def rules() -> dict:
    return F.load_rules()


@lru_cache(maxsize=1)
def prune_lists() -> tuple[frozenset, frozenset]:
    """data/noindex.txt: paths pruned for zero demand (tools/prune.py).
    data/index_allow.txt: OSM-imported paths promoted after earning impressions."""
    def read(name):
        p = DATA / name
        if not p.exists():
            return frozenset()
        return frozenset(l.strip() for l in p.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#"))
    return read("noindex.txt"), read("index_allow.txt")


@lru_cache(maxsize=1)
def festival_places() -> dict[str, list[tuple[dict, dict]]]:
    """festival id -> [(place, festival-entry-at-place)]"""
    out: dict[str, list] = {}
    for p in places().values():
        for fe in p.get("festivals", []):
            if fe["id"] in rules():
                out.setdefault(fe["id"], []).append((p, fe))
    return out


def observer(p: dict) -> astro.Observer:
    return astro.Observer(float(p["lat"]), float(p["lon"]), float(p.get("elev_m") or p.get("height_m") or p.get("alt_m") or 0))


@lru_cache(maxsize=None)
def occ(fid: str, year: int):
    return F.occurrence(fid, year)


@dataclass
class Inst:
    """One page-worthy occurrence of a festival. key is the URL year part:
    "2083" normally, "2084-baisakh" / "2084-chaitra" when a BS year has two."""
    key: str
    year: int
    occ: Any
    dup: bool

    def label(self, lang: str) -> str:
        yl = year_label(self.year, lang)
        if not self.dup:
            return yl
        m = bs.ad_to_bs(self.occ.date)[1]
        return f"{yl} ({(bs.BS_MONTHS_NE if lang == 'ne' else bs.BS_MONTHS_EN)[m - 1]})"


@lru_cache(maxsize=None)
def instances(fid: str) -> tuple:
    out = []
    for y in range(CFG.first_year, CFG.last_year + 1):
        occs = F.occurrences(fid, y)
        for o in occs:
            if len(occs) == 1:
                key = str(y)
            else:
                key = f"{y}-{bs.BS_MONTHS_EN[bs.ad_to_bs(o.date)[1] - 1].lower()}"
                while any(x.key == key for x in out):
                    key += "-2"
            out.append(Inst(key, y, o, len(occs) > 1))
    return tuple(out)


def inst(fid: str, key: str) -> Inst | None:
    return next((i for i in instances(fid) if i.key == key), None)


def next_inst(fid: str, on_or_after: date | None = None) -> Inst | None:
    d0 = on_or_after or CFG.today
    return next((i for i in instances(fid) if i.occ.date >= d0), None)


def near_inst(fid: str, d: date, within: int = 40) -> Inst | None:
    best = None
    for i in instances(fid):
        gap = abs((i.occ.date - d).days)
        if gap <= within and (best is None or gap < abs((best.occ.date - d).days)):
            best = i
    return best


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def tr(lang: str, key: str, **kw) -> Any:
    v = T[lang][key]
    return v.format(**kw) if kw and isinstance(v, str) else v


def nm(obj: dict, lang: str, key: str = "name") -> str:
    return obj.get(f"{key}_{lang}") or obj.get(f"{key}_en") or ""


def num(x, lang: str) -> str:
    s = f"{x:,}" if isinstance(x, int) else str(x)
    return bs.ne_num(s) if lang == "ne" else s


def url(lang: str, *parts: str) -> str:
    """Site URL. With no parts it is the aafnaipatro.com home page itself."""
    if not parts:
        return "/"  # the aafnaipatro.com home page is the same for both languages
    path = CFG.path_root.rstrip("/") + "/" + "/".join(p.strip("/") for p in parts if p) + "/"
    path = path.replace("//", "/")
    return ("/ne" + path) if lang == "ne" else path


def abs_url(path: str) -> str:
    return CFG.base_url.rstrip("/") + path


def og_path(lang: str, *parts: str) -> str:
    return CFG.path_root.rstrip("/") + "/og/" + lang + "/" + "/".join(parts) + ".jpg"


def t(dt, lang):
    return bs.fmt_time(dt, lang)


def bs_parts(d: date, lang: str) -> tuple[str, str, str]:
    y, m, dd = bs.ad_to_bs(d)
    if lang == "ne":
        return bs.ne_num(dd), bs.BS_MONTHS_NE[m - 1], bs.ne_num(y)
    return str(dd), bs.BS_MONTHS_EN[m - 1], str(y)


def year_label(y: int, lang: str) -> str:
    return bs.ne_num(y) if lang == "ne" else str(y)


def date_long(d: date, lang: str) -> dict:
    return {
        "bs": bs.fmt_bs(d, lang),
        "ad": bs.fmt_ad(d, lang),
        "weekday": (bs.WEEKDAYS_NE if lang == "ne" else bs.WEEKDAYS_EN)[d.weekday()],
        "iso": d.isoformat(),
    }


def days_until(d: date) -> int:
    return (d - CFG.today).days


def province_name(p: dict, lang: str) -> str:
    pr = p.get("province") or ""
    return PROVINCES_NE.get(pr, pr) if lang == "ne" else pr


def rule_text(rule: dict, lang: str) -> str:
    typ = rule["type"]
    if typ == "lunar":
        mi = lunar.LUNAR_MONTHS.index(rule["month"])
        t_ = int(rule["tithi"])
        pk = rule["paksha"]
        if lang == "ne":
            month = lunar.LUNAR_MONTHS_NE[mi]
            if t_ == 15:
                tn = "पूर्णिमा" if pk == "shukla" else "औंसी"
                base = f"{month} {tn}"
            else:
                base = f"{month} {'शुक्ल' if pk == 'shukla' else 'कृष्ण'} {lunar.TITHI_NAMES_NE[t_ - 1]}"
            k = {
                "sunrise": "सूर्योदयमा यो तिथि रहेको दिन मनाइन्छ।",
                "sunset": "सूर्यास्तमा यो तिथि रहेको दिन मनाइन्छ।",
                "nishita": "मध्यरातको निशीथ कालमा यो तिथि रहेको रात मनाइन्छ।",
                "pradosh": "सूर्यास्तपछिको प्रदोष कालमा यो तिथि रहेको साँझ मनाइन्छ।",
                "madhyahna": "मध्याह्नमा यो तिथि रहेको दिन मनाइन्छ।",
                "aparahna": "अपराह्नमा यो तिथि रहेको दिन मनाइन्छ।",
            }[rule.get("kaal", "sunrise")]
            return f"{base}। {k}"
        month = rule["month"]
        if t_ == 15:
            base = f"{month} {'Purnima' if pk == 'shukla' else 'Aunsi'}"
        else:
            base = f"{month} {pk.capitalize()} {lunar.TITHI_NAMES[t_ - 1]}"
        k = {
            "sunrise": "Observed on the day this tithi is current at sunrise.",
            "sunset": "Observed on the day this tithi is current at sunset.",
            "nishita": "Observed on the night this tithi covers Nishita kaal, around midnight.",
            "pradosh": "Observed on the evening this tithi covers Pradosh kaal, just after sunset.",
            "madhyahna": "Observed on the day this tithi covers midday.",
            "aparahna": "Observed on the day this tithi covers the afternoon.",
        }[rule.get("kaal", "sunrise")]
        return f"{base}. {k}"
    if typ == "lunar_solar":
        m, t_, pk = int(rule["bs_month"]), int(rule["tithi"]), rule["paksha"]
        if lang == "ne":
            return f"{bs.BS_MONTHS_NE[m-1]} महिनामा पर्ने {'शुक्ल' if pk == 'shukla' else 'कृष्ण'} {lunar.TITHI_NAMES_NE[t_ - 1]}।"
        return f"The {pk.capitalize()} {lunar.TITHI_NAMES[t_ - 1]} that falls in the solar month of {bs.BS_MONTHS_EN[m-1]}."
    if typ == "solar_bs":
        m, d = int(rule["bs_month"]), int(rule["bs_day"])
        if lang == "ne":
            return f"हरेक वर्ष {bs.BS_MONTHS_NE[m-1]} {bs.ne_num(d)} गते।"
        return f"Every year on {bs.BS_MONTHS_EN[m-1]} {d}."
    if typ == "gregorian":
        m, d = int(rule["ad_month"]), int(rule["ad_day"])
        if lang == "ne":
            return f"हरेक वर्ष {MONTHS_AD_NE[m-1]} {bs.ne_num(d)} तारिख।"
        return f"Every year on {date(2000, m, d).strftime('%B')} {d}."
    if typ == "hijri":
        months = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani",
                  "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"]
        m, d = int(rule["hijri_month"]), int(rule["hijri_day"])
        if lang == "ne":
            return f"इस्लामी पात्रोको {months[m-1]} {bs.ne_num(d)} गते; चन्द्रदर्शनअनुसार तय हुन्छ।"
        return f"{d} {months[m-1]} in the Islamic calendar, confirmed by moon sighting."
    if typ == "relative":
        base = rules()[rule["base"]]
        n = int(rule["offset_days"])
        if lang == "ne":
            return f"{nm(base, 'ne')}भन्दा {bs.ne_num(abs(n))} दिन {'पछि' if n > 0 else 'अघि'}।"
        return f"{abs(n)} day{'s' if abs(n) != 1 else ''} {'after' if n > 0 else 'before'} {nm(base, 'en')}."
    return ""


def status_note(o, lang: str) -> str:
    if o.note == "moon-sighting":
        return tr(lang, "moon_note")
    if o.source == "official-override":
        return tr(lang, "official_note")
    if o.approximate:
        return tr(lang, "approx_note")
    return tr(lang, "computed_note")


# --------------------------------------------------------------------------
# Timings, crowd
# --------------------------------------------------------------------------
def kaal_window(rule: dict, w: dict):
    k = rule.get("window") or rule.get("kaal")
    if rule["type"] not in ("lunar", "lunar_solar") or k in (None, "sunrise"):
        return None
    if k == "sunset":
        return ("sunset", w["sunset"] - timedelta(minutes=45), w["sunset"] + timedelta(minutes=15))
    return (k, *w[k])


def crowd(rule: dict, fe: dict | None, d: date) -> int:
    lvl = int((fe or {}).get("crowd") or rule.get("crowd", 2))
    if d.weekday() == 5 and lvl < 5:      # Saturday, Nepal's weekly holiday
        lvl += 1
    return max(0, min(5, lvl))


def best_time(rule: dict, lang: str, pc, kw) -> str:
    k = (rule.get("window") or rule.get("kaal")) if rule["type"] in ("lunar", "lunar_solar") else None
    sr, ss = t(pc.sunrise, lang), t(pc.sunset, lang)
    if kw:
        a, b = t(kw[1], lang), t(kw[2], lang)
    if lang == "ne":
        if k == "nishita":
            return f"मध्यरातको निशीथ काल ({a}–{b}) वरिपरि भीड चरम हुन्छ। बिहानको भीड सकिएपछि मध्य बिहान प्रायः सबैभन्दा शान्त हुन्छ।"
        if k == "pradosh":
            return f"धेरैजसो मानिस साँझ प्रदोष काल ({a}–{b}) मा जान्छन्। शान्त दर्शनका लागि बिहान वा दिउँसो जानुहोस्।"
        if k in ("madhyahna", "aparahna"):
            return f"मुख्य पूजा {tr(lang, 'puja_window')[k]} ({a}–{b}) मा हुन्छ। भीड बढ्नुअघि सूर्योदय ({sr}) पछि छिट्टै पुग्नुहोस्।"
        if k == "sunset":
            return f"साँझको अर्घ्य सूर्यास्त ({ss}) मा हुन्छ; घाटमा ठाउँ पाउन एक घण्टाअघि पुग्नुहोस्। भोलिपल्ट बिहान सूर्योदयमा अर्को अर्घ्य दिइन्छ।"
        return f"सूर्योदय ({sr}) अघि नै लाइन सुरु हुन्छ। बिहान जान नसके दिउँसोको मध्यतिर प्रायः भीड कम हुन्छ।"
    if k == "nishita":
        return f"Crowds peak around Nishita kaal ({a}–{b}). Mid-morning, after the dawn rush, is usually the quietest time."
    if k == "pradosh":
        return f"Most people visit in the evening, during Pradosh kaal ({a}–{b}). Go in the morning or early afternoon for a calmer visit."
    if k in ("madhyahna", "aparahna"):
        return f"The main rituals fall in {tr(lang, 'puja_window')[k]} ({a}–{b}). Arrive soon after sunrise ({sr}) to beat the build-up."
    if k == "sunset":
        return f"The evening arghya is at sunset ({ss}); arrive an hour earlier to find a place at the ghat. The second arghya is at sunrise the next morning."
    return f"Queues start before sunrise ({sr}). If you can't be there at dawn, mid-afternoon is usually calmer."


def timings_block(place_like: dict, rule: dict, o, lang: str) -> dict:
    obs = observer(place_like)
    d = o.date
    pc = panchang.day_panchang(obs, d)
    w = F.kaal_windows(obs, d)
    kw = kaal_window(rule, w)
    names = pc.names(lang)
    rows = []
    if o.tithi_start:
        tn = lunar.tithi_name(o.tithi, lang)
        rows.append((tr(lang, "tithi"), tn))
        rows.append((tr(lang, "tithi_begins"), f"{t(o.tithi_start, lang)}, {bs.fmt_bs(o.tithi_start.date(), lang)}"))
        rows.append((tr(lang, "tithi_ends"), f"{t(o.tithi_end, lang)}, {bs.fmt_bs(o.tithi_end.date(), lang)}"))
    rows.append((tr(lang, "sunrise"), t(pc.sunrise, lang)))
    rows.append((tr(lang, "sunset"), t(pc.sunset, lang)))
    if kw:
        rows.append((tr(lang, "puja_window")[kw[0]], f"{t(kw[1], lang)} – {t(kw[2], lang)}"))
    rows.append((tr(lang, "moonrise"), t(pc.moonrise, lang)))
    rows.append((tr(lang, "nakshatra"), f"{names['nakshatra']} ({'until' if lang == 'en' else ''} {t(pc.nakshatra_end, lang)}{' सम्म' if lang == 'ne' else ''})".replace("( ", "(")))
    rows.append((tr(lang, "rahu"), f"{t(pc.rahu[0], lang)} – {t(pc.rahu[1], lang)}"))
    rows.append((tr(lang, "abhijit"), f"{t(pc.abhijit[0], lang)} – {t(pc.abhijit[1], lang)}"))
    rows.append((tr(lang, "brahma"), f"{t(pc.brahma_muhurta[0], lang)} – {t(pc.brahma_muhurta[1], lang)}"))
    rows.append((tr(lang, "day_length"), bs.fmt_duration(pc.day_length, lang)))

    windows = [("tl-rahu", pc.rahu[0], pc.rahu[1], tr(lang, "rahu")),
               ("tl-good", pc.abhijit[0], pc.abhijit[1], tr(lang, "abhijit")),
               ("tl-good", pc.brahma_muhurta[0], pc.brahma_muhurta[1], tr(lang, "brahma"))]
    if kw:
        windows.append(("tl-fest", kw[1], kw[2], tr(lang, "puja_window")[kw[0]]))
    ticks = ["००", "०६", "१२", "१८", "२४"] if lang == "ne" else None
    svg = images.day_timeline_svg(pc.sunrise, pc.sunset, windows, label=tr(lang, "timings_at", place=nm(place_like, lang)), ticks=ticks)
    legend = [("tl-day", tr(lang, "sunrise") + "–" + tr(lang, "sunset")),
              ("tl-rahu", tr(lang, "rahu").split(" (")[0]),
              ("tl-good", tr(lang, "abhijit").split(" (")[0] + " / " + tr(lang, "brahma").split(" (")[0])]
    if kw:
        legend.append(("tl-fest", tr(lang, "puja_window")[kw[0]].split(" (")[0]))
    return {"rows": rows, "svg": svg, "legend": legend, "pc": pc, "kw": kw,
            "moon": images.moon_svg(pc.tithi, 44, names["tithi"])}


# --------------------------------------------------------------------------
# Shared page bits
# --------------------------------------------------------------------------
NAV = [("places", ("places",)), ("festivals", ("festivals",)), ("mountains", ("mountains",)),
       ("treks", ("treks",)), ("kati", ("kati",)), ("janma", ("janma",)), ("shraddha", ("shraddha",))]


def nav(lang: str) -> list[tuple[str, str]]:
    return [(T[lang].get(key, key), url(lang, *parts)) for key, parts in NAV if key in T[lang] and key in CFG.sections]


def place_url(lang: str, p: dict) -> str:
    """A place's own page when the places section is built, else the site's Nepal map searched for it."""
    if "places" in CFG.sections:
        return url(lang, "places", p["id"])
    from urllib.parse import quote
    return CFG.map_url + quote(p.get("name_en") or p.get("name") or "")


def page_shell(lang: str, path_parts: tuple, title: str, description: str, crumbs: list, og: str | None,
               jsonld: list, noindex: bool = False) -> dict:
    p_en = url("en", *path_parts)
    p_ne = url("ne", *path_parts)
    canonical = abs_url(p_ne if lang == "ne" else p_en)
    pruned, allowed = prune_lists()
    if p_en in allowed:
        noindex = False
    if p_en in pruned:
        noindex = True
    bc = [{"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(u)} for i, (n, u) in enumerate(crumbs)]
    jsonld = list(jsonld) + [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": bc}]
    return {
        "lang": lang,
        "html_lang": "ne" if lang == "ne" else "en",
        "title": title,
        "description": description[:300],
        "canonical": canonical,
        "alt_en": abs_url(p_en),
        "alt_ne": abs_url(p_ne),
        "other_lang_url": p_en if lang == "ne" else p_ne,
        "crumbs": crumbs,
        "og": abs_url(og) if og else abs_url(f"{CFG.asset_prefix}/og-default.jpg"),
        "jsonld": [json.dumps(j, ensure_ascii=False, separators=(",", ":")) for j in jsonld],
        "nav": nav(lang),
        "t": T[lang],
        "asset": CFG.asset_prefix,
        "noindex": noindex,
        "geo_page": path_parts[0] in ("mountains", "treks"),
        "updated": bs.fmt_bs(CFG.today, lang),
        "updated_iso": CFG.today.isoformat(),
    }


def faq_ld(items: list[tuple[str, str]]) -> dict:
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}


def event_ld(name: str, o, place: dict | None, lang: str, desc: str, image: str | None, page_url: str) -> dict:
    end = o.date + timedelta(days=max(0, o.span_days - 1))
    loc: dict = {"@type": "Place", "name": nm(place, lang) if place else ("नेपाल" if lang == "ne" else "Nepal"),
                 "address": {"@type": "PostalAddress", "addressCountry": "NP"}}
    if place:
        loc["geo"] = {"@type": "GeoCoordinates", "latitude": place["lat"], "longitude": place["lon"]}
        if place.get("district"):
            loc["address"]["addressLocality"] = nm(place, lang, "district") or place["district"]
        if place.get("province"):
            loc["address"]["addressRegion"] = place["province"]
    ev = {"@context": "https://schema.org", "@type": "Event", "name": name,
          "startDate": o.date.isoformat(), "endDate": end.isoformat(),
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "eventStatus": "https://schema.org/EventScheduled",
          "location": loc, "description": desc, "url": page_url,
          "isAccessibleForFree": True,
          "organizer": {"@type": "Organization", "name": "Aafnai Patro", "url": CFG.base_url}}
    if image:
        ev["image"] = [abs_url(image)]
    return ev


def nearby(lat, lon, pool, exclude_id=None, limit=6, max_km=None):
    out = []
    for p in pool:
        if p["id"] == exclude_id:
            continue
        dkm = astro.haversine_km(lat, lon, p["lat"], p["lon"])
        if max_km is None or dkm <= max_km:
            out.append((dkm, astro.compass(astro.bearing_deg(lat, lon, p["lat"], p["lon"])), p))
    out.sort(key=lambda x: x[0])
    return out[:limit]


def km(x: float, lang: str) -> str:
    v = f"{x:.1f}" if x < 10 else f"{x:.0f}"
    return f"{bs.ne_num(v)} {tr(lang, 'km')}" if lang == "ne" else f"{v} km"


def hm(m: int, lang: str) -> str:
    return f"{num(m, lang)} {'मि.' if lang == 'ne' else 'm'}"


def day_url(d: date) -> str:
    """The existing aafnaipatro.com day page (full panchang for that date)."""
    return f"/date/{d.isoformat()}"


def map_link(lat, lon) -> str:
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=15/{lat}/{lon}"


COMPASS_NE = {"N": "उत्तर", "NNE": "उत्तर-उत्तरपूर्व", "NE": "उत्तरपूर्व", "ENE": "पूर्व-उत्तरपूर्व", "E": "पूर्व",
              "ESE": "पूर्व-दक्षिणपूर्व", "SE": "दक्षिणपूर्व", "SSE": "दक्षिण-दक्षिणपूर्व", "S": "दक्षिण",
              "SSW": "दक्षिण-दक्षिणपश्चिम", "SW": "दक्षिणपश्चिम", "WSW": "पश्चिम-दक्षिणपश्चिम", "W": "पश्चिम",
              "WNW": "पश्चिम-उत्तरपश्चिम", "NW": "उत्तरपश्चिम", "NNW": "उत्तर-उत्तरपश्चिम"}


def compass_l(c: str, lang: str) -> str:
    return COMPASS_NE[c] if lang == "ne" else c


# --------------------------------------------------------------------------
# Place x festival x year  (the main page type)
# --------------------------------------------------------------------------
def place_festival_ctx(pid: str, fid: str, key: str, lang: str) -> dict | None:
    p = places()[pid]
    rule = rules()[fid]
    fe = next((f for f in p.get("festivals", []) if f["id"] == fid), {})
    it = inst(fid, str(key))
    if not it:
        return None
    o, year = it.occ, it.year
    fname, pname = nm(rule, lang), nm(p, lang)
    yl = it.label(lang)
    dl = date_long(o.date, lang)
    tb = timings_block(p, rule, o, lang)
    curated = p.get("curated", True)
    # Crowd forecasts come from what we know about the place; imported places get none.
    lvl = crowd(rule, fe, o.date) if curated else None
    bt = best_time(rule, lang, tb["pc"], tb["kw"])
    slug = f"{fid}-{it.key}"
    path = ("places", pid, slug)
    og = og_path(lang, "places", pid, slug) if CFG.wants_image(year) else og_path(lang, "places", pid)

    span_txt = ""
    if o.span_days > 1:
        end = o.date + timedelta(days=o.span_days - 1)
        span_txt = tr(lang, "multi_day", n=num(o.span_days, lang), start=bs.fmt_bs(o.date, lang), end=bs.fmt_bs(end, lang))

    years = []
    for iy in instances(fid):
        years.append({"label": iy.label(lang), "date": bs.fmt_bs(iy.occ.date, lang), "ad": bs.fmt_ad(iy.occ.date, lang),
                      "url": url(lang, "places", pid, f"{fid}-{iy.key}"), "current": iy.key == it.key,
                      "upcoming": 0 <= days_until(iy.occ.date) <= 400})
    others = []
    for f2 in p.get("festivals", []):
        if f2["id"] == fid or f2["id"] not in rules():
            continue
        for i2 in instances(f2["id"]):
            if i2.year == year:
                others.append({"name": nm(rules()[f2["id"]], lang), "date": bs.fmt_bs(i2.occ.date, lang),
                               "url": url(lang, "places", pid, f"{f2['id']}-{i2.key}"), "sort": i2.occ.date})
    others.sort(key=lambda x: x["sort"])
    same = [pl for pl, _ in festival_places().get(fid, []) if pl["id"] != pid]
    near_same = [{"name": nm(pl, lang), "dist": km(dk, lang), "url": url(lang, "places", pl["id"], slug)}
                 for dk, _, pl in nearby(p["lat"], p["lon"], same, limit=6)]

    title = (f"{fname} {yl}, {pname}: मिति, समय र भीड" if lang == "ne"
             else f"{fname} {yl} at {pname}: Date, Timings and Crowds")
    desc = (f"{pname}मा {fname} {yl}: {dl['bs']} ({dl['ad']}, {dl['weekday']})। सूर्योदय {t(tb['pc'].sunrise, lang)}, "
            f"तिथि, पूजा मुहूर्त, राहु काल र भीडको अनुमान।" if lang == "ne" else
            f"{fname} {yl} at {pname} falls on {dl['bs']} ({dl['weekday']}, {dl['ad']}). Sunrise {t(tb['pc'].sunrise, lang)}, "
            f"tithi times, puja muhurta, Rahu kaal and expected crowds.")

    holiday = tr(lang, "public_holiday") if rule.get("holiday") else tr(lang, "not_holiday")
    faq = []
    if lang == "ne":
        faq.append((f"{yl} मा {pname}मा {fname} कहिले छ?", f"{fname} {dl['bs']} ({dl['ad']}, {dl['weekday']}) मा पर्छ। {span_txt}".strip()))
        if o.tithi_start:
            faq.append((f"{fname}को तिथि कहिले सुरु र समाप्त हुन्छ?",
                        f"{lunar.tithi_name(o.tithi, lang)} {bs.fmt_bs(o.tithi_start.date(), lang)} {t(o.tithi_start, lang)} मा सुरु भई {bs.fmt_bs(o.tithi_end.date(), lang)} {t(o.tithi_end, lang)} मा समाप्त हुन्छ।"))
        faq.append((f"{fname}को दिन {pname}मा सूर्योदय कति बजे हुन्छ?", f"सूर्योदय {t(tb['pc'].sunrise, lang)} र सूर्यास्त {t(tb['pc'].sunset, lang)} मा हुन्छ।"))
        faq.append((f"{fname} सार्वजनिक बिदा हो?", f"{holiday}।"))
        if lvl is not None:
            faq.append((f"{fname}मा {pname}मा कत्तिको भीड हुन्छ?", f"{tr(lang, 'crowd')}: {tr(lang, 'crowd_levels')[lvl]}। {bt}"))
    else:
        faq.append((f"When is {fname} {yl} at {pname}?", f"{fname} falls on {dl['bs']}, which is {dl['weekday']}, {dl['ad']}. {span_txt}".strip()))
        if o.tithi_start:
            faq.append((f"When does the tithi for {fname} begin and end?",
                        f"{lunar.tithi_name(o.tithi, lang)} begins at {t(o.tithi_start, lang)} on {bs.fmt_ad(o.tithi_start.date())} and ends at {t(o.tithi_end, lang)} on {bs.fmt_ad(o.tithi_end.date())}."))
        faq.append((f"What time is sunrise at {pname} on {fname}?", f"Sunrise is at {t(tb['pc'].sunrise, lang)} and sunset at {t(tb['pc'].sunset, lang)}."))
        faq.append((f"Is {fname} a public holiday in Nepal?", f"{holiday}."))
        if lvl is not None:
            faq.append((f"How crowded is {pname} on {fname}?", f"Expected crowd: {tr(lang, 'crowd_levels')[lvl].lower()}. {bt}"))

    page_u = abs_url(url(lang, *path))
    jsonld = [event_ld(f"{fname} {yl} — {pname}", o, p, lang, nm(rule, lang, "summary"), og, page_u), faq_ld(faq)]
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "places"), url(lang, "places")),
              (pname, url(lang, "places", pid)), (f"{fname} {yl}", url(lang, *path))]
    ctx = page_shell(lang, path, title, desc, crumbs, og, jsonld, noindex=(not p.get("curated", True) and not CFG.index_osm))
    day, month, yr = bs_parts(o.date, lang)
    ctx.update({
        "kind": "place_festival",
        "day_url": day_url(o.date),
        "h1": f"{fname} {yl}",
        "subtitle": pname,
        "leaf": {"day": day, "month": month, "year": yr},
        "date": dl,
        "dleft": days_until(o.date),
        "span_txt": span_txt,
        "holiday": holiday,
        "is_holiday": bool(rule.get("holiday")),
        "status": status_note(o, lang),
        "timings": tb,
        "timings_title": tr(lang, "timings_at", place=pname),
        "timings_note": tr(lang, "timings_note", place=pname, lat=num(f"{p['lat']:.4f}", lang), lon=num(f"{p['lon']:.4f}", lang)),
        "crowd_lvl": lvl,
        "crowd_txt": tr(lang, "crowd_levels")[lvl] if lvl is not None else "",
        "best_time": bt,
        "about_title": tr(lang, "about_festival", festival=fname),
        "about": nm(rule, lang, "summary"),
        "rule": rule_text(rule, lang),
        "place_title": tr(lang, "at_this_place", place=pname),
        "place_note": fe.get(f"note_{lang}") or "",
        "place_about": p.get(f"about_{lang}") or "",
        "place_url": url(lang, "places", pid),
        "festival_url": url(lang, "festivals", fid),
        "festival_year_url": url(lang, "festivals", fid, it.key),
        "tips": p.get(f"tips_{lang}") or [],
        "years_title": tr(lang, "other_years", festival=fname, place=pname),
        "years": years,
        "others_title": tr(lang, "other_festivals_here", place=pname, year=yl),
        "others": others,
        "near_title": tr(lang, "nearby_same", festival=fname),
        "near": near_same,
        "faq": faq,
        "map": map_link(p["lat"], p["lon"]),
        "osm": p.get("source") == "osm",
        "_og": {"kind": "festival", "path": og, "seed": pid,
                "day": day, "month": month, "year": yr, "title": f"{fname} {yl}",
                "subtitle": nm(rule, "en" if lang == "ne" else "ne") + f" {it.label('en' if lang == 'ne' else 'ne')}",
                "place": f"{pname}, {nm(p, lang, 'district') or p.get('district', '')}".rstrip(", "),
                "line3": f"{dl['weekday']}, {dl['ad']} — {tr(lang, 'sunrise')} {t(tb['pc'].sunrise, lang)}",
                "tithi": o.tithi} if CFG.wants_image(year) else None,
        "_json": {"place": pid, "festival": fid, "bs_year": year, "key": it.key, "date": o.date.isoformat(),
                  "bs_date": "-".join(map(str, o.bs)), "source": o.source, "approximate": o.approximate,
                  "tithi_start": o.tithi_start.isoformat() if o.tithi_start else None,
                  "tithi_end": o.tithi_end.isoformat() if o.tithi_end else None,
                  "panchang": tb["pc"].as_json(), "crowd": lvl, "curated": curated},
    })
    return ctx


# --------------------------------------------------------------------------
# Place hub
# --------------------------------------------------------------------------
def place_ctx(pid: str, lang: str) -> dict:
    p = places()[pid]
    pname = nm(p, lang)
    obs = observer(p)
    path = ("places", pid)
    upcoming = []
    for fe in p.get("festivals", []):
        if fe["id"] not in rules():
            continue
        for iu in instances(fe["id"]):
            o = iu.occ
            if 0 <= days_until(o.date) <= 366:
                upcoming.append({"name": nm(rules()[fe["id"]], lang), "date": bs.fmt_bs(o.date, lang),
                                 "ad": bs.fmt_ad(o.date, lang), "days": days_until(o.date),
                                 "days_l": num(days_until(o.date), lang),
                                 "url": url(lang, "places", pid, f"{fe['id']}-{iu.key}"), "sort": o.date})
    upcoming.sort(key=lambda x: x["sort"])
    allf = []
    for fe in p.get("festivals", []):
        if fe["id"] not in rules():
            continue
        ni = next_inst(fe["id"]) or (instances(fe["id"])[-1] if instances(fe["id"]) else None)
        if ni:
            allf.append({"name": nm(rules()[fe["id"]], lang), "url": url(lang, "festivals", fe["id"]),
                         "here": url(lang, "places", pid, f"{fe['id']}-{ni.key}")})
    months = MONTHS_AD_NE if lang == "ne" else MONTHS_AD_EN
    sun = [{"m": months[r["month"] - 1], "sr": t(r["sunrise"], lang), "ss": t(r["sunset"], lang),
            "len": bs.fmt_duration(r["day_length"], lang)} for r in panchang.month_sun_table(obs, CFG.today.year)]
    near = [{"name": nm(pl, lang), "dist": km(dk, lang), "dir": compass_l(c, lang), "url": url(lang, "places", pl["id"])}
            for dk, c, pl in nearby(p["lat"], p["lon"], [x for x in places().values() if x.get("curated", True)], pid, limit=6)]
    pc = panchang.day_panchang(obs, CFG.today)
    nms = pc.names(lang)
    today_rows = [(tr(lang, "tithi"), nms["tithi"]), (tr(lang, "sunrise"), t(pc.sunrise, lang)),
                  (tr(lang, "sunset"), t(pc.sunset, lang)), (tr(lang, "moonrise"), t(pc.moonrise, lang)),
                  (tr(lang, "rahu"), f"{t(pc.rahu[0], lang)} – {t(pc.rahu[1], lang)}")]
    facts = []
    if p.get(f"deity_{lang}"):
        facts.append((tr(lang, "deity"), p[f"deity_{lang}"]))
    if p.get("district"):
        facts.append((tr(lang, "district"), nm(p, lang, "district") or p["district"]))
    if p.get("province"):
        facts.append((tr(lang, "province"), province_name(p, lang)))
    if p.get("elev_m"):
        facts.append((tr(lang, "elevation"), f"{num(int(p['elev_m']), lang)} {'मि.' if lang == 'ne' else 'm'}"))
    facts.append((tr(lang, "coordinates"), num(f"{p['lat']:.4f}, {p['lon']:.4f}", lang)))

    title = (f"{pname}: चाडपर्व मिति, समय र भ्रमण जानकारी" if lang == "ne"
             else f"{pname}: Festival Dates, Timings and Visitor Guide")
    desc = (p.get(f"about_{lang}") or "")[:220] or title
    og = og_path(lang, "places", pid)
    jsonld = [{"@context": "https://schema.org",
               "@type": "PlaceOfWorship" if p.get("kind") in ("temple", "stupa", "monastery", "mosque", "church", "cave") else "TouristAttraction",
               "name": pname, "description": desc,
               "geo": {"@type": "GeoCoordinates", "latitude": p["lat"], "longitude": p["lon"]},
               "address": {"@type": "PostalAddress", "addressCountry": "NP",
                           **({"addressLocality": p["district"]} if p.get("district") else {})},
               "image": abs_url(og), "url": abs_url(url(lang, *path))}]
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "places"), url(lang, "places")), (pname, url(lang, *path))]
    ctx = page_shell(lang, path, title, desc, crumbs, og, jsonld, noindex=(not p.get("curated", True) and not CFG.index_osm))
    nxt = upcoming[0] if upcoming else None
    ctx.update({
        "kind": "place", "h1": pname, "about": p.get(f"about_{lang}") or "", "tips": p.get(f"tips_{lang}") or [],
        "facts": facts, "upcoming": upcoming, "allf": allf, "sun": sun, "near": near, "today_rows": today_rows,
        "today_label": bs.fmt_bs(CFG.today, lang, weekday=True), "moon": images.moon_svg(pc.tithi, 44, nms["tithi"]),
        "map": map_link(p["lat"], p["lon"]), "osm": p.get("source") == "osm", "unesco": p.get("unesco"),
        "upcoming_title": tr(lang, "upcoming_here", place=pname),
        "_og": {"kind": "place", "path": og, "seed": pid, "title": pname,
                "subtitle": nm(p, "en" if lang == "ne" else "ne"),
                "line3": ", ".join(x for x in [nm(p, lang, "district") or p.get("district", ""), province_name(p, lang)] if x),
                "line4": p.get(f"deity_{lang}") or ""},   # stable text: cards are cached across daily builds
        "_json": {"id": pid, "name_en": p["name_en"], "name_ne": p.get("name_ne"), "lat": p["lat"], "lon": p["lon"],
                  "festivals": [fe["id"] for fe in p.get("festivals", [])],
                  "upcoming": [{"festival": u["url"].rstrip("/").split("/")[-1], "date": u["sort"].isoformat()} for u in upcoming],
                  "today": pc.as_json()},
    })
    return ctx


# --------------------------------------------------------------------------
# Festival hub and festival-year
# --------------------------------------------------------------------------
def festival_ctx(fid: str, lang: str) -> dict:
    rule = rules()[fid]
    fname = nm(rule, lang)
    path = ("festivals", fid)
    rows, nxt, nkey = [], None, None
    for iy in instances(fid):
        o = iy.occ
        r = {"y": iy.label(lang), "bs": bs.fmt_bs(o.date, lang), "ad": bs.fmt_ad(o.date, lang),
             "wd": (bs.WEEKDAYS_NE if lang == "ne" else bs.WEEKDAYS_EN)[o.date.weekday()],
             "url": url(lang, "festivals", fid, iy.key), "upcoming": False, "past": o.date < CFG.today}
        if nxt is None and o.date >= CFG.today:
            nxt, nkey = (iy.year, o), iy.key
            r["upcoming"] = True
        rows.append(r)
    pls = [{"name": nm(pl, lang), "district": nm(pl, lang, "district") or pl.get("district", ""),
            "url": url(lang, "places", pl["id"], f"{fid}-{nkey}") if nxt else url(lang, "places", pl["id"])}
           for pl, _ in festival_places().get(fid, []) if pl.get("curated", True)]
    title = (f"{fname} मिति {year_label(CFG.first_year, lang)}–{year_label(CFG.last_year, lang)}: हरेक वर्षको पात्रो" if lang == "ne"
             else f"{fname} Dates {CFG.first_year}–{CFG.last_year} BS: Every Year's Date")
    desc = nm(rule, lang, "summary")
    nd = None
    if nxt:
        nd = date_long(nxt[1].date, lang)
        desc = (f"{fname} {year_label(nxt[0], lang)}: {nd['bs']} ({nd['ad']})। " if lang == "ne"
                else f"{fname} {nxt[0]}: {nd['bs']} ({nd['ad']}). ") + desc
    og = og_path(lang, "festivals", fid)
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "festivals"), url(lang, "festivals")), (fname, url(lang, *path))]
    jsonld = []
    if nxt:
        jsonld.append(event_ld(f"{fname} {year_label(nxt[0], lang)}", nxt[1], None, lang, nm(rule, lang, "summary"), og,
                               abs_url(url(lang, "festivals", fid, nkey))))
    ctx = page_shell(lang, path, title, desc, crumbs, og, jsonld)
    leaf = None
    if nxt:
        dd, mm, yy = bs_parts(nxt[1].date, lang)
        leaf = {"day": dd, "month": mm, "year": yy}
    ctx.update({"kind": "festival", "h1": fname, "about": nm(rule, lang, "summary"), "rule": rule_text(rule, lang),
                "rows": rows, "places": pls, "next": nd, "next_year": year_label(nxt[0], lang) if nxt else "",
                "next_url": url(lang, "festivals", fid, nkey) if nxt else "",
                "dleft": days_until(nxt[1].date) if nxt else None, "leaf": leaf,
                "holiday": tr(lang, "public_holiday") if rule.get("holiday") else tr(lang, "not_holiday"),
                "is_holiday": bool(rule.get("holiday")),
                "status": status_note(nxt[1], lang) if nxt else "",
                "all_title": tr(lang, "all_years", festival=fname, first=year_label(CFG.first_year, lang), last=year_label(CFG.last_year, lang)),
                "_og": ({"kind": "festival", "path": og, "seed": fid, **(leaf or {}),
                         "title": fname, "subtitle": nm(rule, "en" if lang == "ne" else "ne"),
                         "place": f"{tr(lang, 'next_on', date=nd['bs'])}" if nd else "",
                         "line3": f"{nd['weekday']}, {nd['ad']}" if nd else "",
                         "tithi": nxt[1].tithi} if nxt else None),
                "_json": {"id": fid, "name_en": rule["name_en"], "name_ne": rule["name_ne"], "rule": rule_text(rule, "en"),
                          "dates": {iy.key: iy.occ.date.isoformat() for iy in instances(fid)}}})
    return ctx


def festival_year_ctx(fid: str, key: str, lang: str) -> dict | None:
    rule = rules()[fid]
    it = inst(fid, str(key))
    if not it:
        return None
    o, year = it.occ, it.year
    fname = nm(rule, lang)
    yl = it.label(lang)
    path = ("festivals", fid, it.key)
    ktm = {"id": "kathmandu", "name_en": "Kathmandu", "name_ne": "काठमाडौं", "lat": 27.7172, "lon": 85.3240, "elev_m": 1345}
    tb = timings_block(ktm, rule, o, lang)
    dl = date_long(o.date, lang)
    group = []
    if rule.get("group"):
        for gid, r2 in rules().items():
            if r2.get("group") == rule["group"]:
                g = near_inst(gid, o.date, 20)
                if g:
                    o2 = g.occ
                    group.append({"name": nm(r2, lang), "date": bs.fmt_bs(o2.date, lang), "wd": (bs.WEEKDAYS_NE if lang == "ne" else bs.WEEKDAYS_EN)[o2.date.weekday()],
                                  "url": url(lang, "festivals", gid, g.key), "current": gid == fid, "sort": o2.date})
        group.sort(key=lambda x: x["sort"])
    season = []
    for gid in rules():
        if gid == fid:
            continue
        g = near_inst(gid, o.date, 12)
        if g:
            season.append({"name": nm(rules()[gid], lang), "date": bs.fmt_bs(g.occ.date, lang),
                           "url": url(lang, "festivals", gid, g.key), "sort": g.occ.date})
    season.sort(key=lambda x: x["sort"])
    pls = [{"name": nm(pl, lang), "district": nm(pl, lang, "district") or pl.get("district", ""),
            "url": url(lang, "places", pl["id"], f"{fid}-{it.key}"),
            "note": fe.get(f"note_{lang}") or ""}
           for pl, fe in festival_places().get(fid, []) if pl.get("curated", True)]
    span_txt = ""
    if o.span_days > 1:
        end = o.date + timedelta(days=o.span_days - 1)
        span_txt = tr(lang, "multi_day", n=num(o.span_days, lang), start=bs.fmt_bs(o.date, lang), end=bs.fmt_bs(end, lang))
    holiday = tr(lang, "public_holiday") if rule.get("holiday") else tr(lang, "not_holiday")
    title = (f"{fname} {yl} कहिले? मिति, तिथि र शुभ मुहूर्त" if lang == "ne"
             else f"{fname} {yl}: Date, Tithi and Puja Timings")
    desc = (f"{fname} {yl}: {dl['bs']} ({dl['ad']}, {dl['weekday']})। तिथि सुरु–समाप्ति, सूर्योदय, राहु काल र मनाइने स्थल।" if lang == "ne"
            else f"{fname} {yl} falls on {dl['bs']} ({dl['weekday']}, {dl['ad']}). Tithi start and end, sunrise, Rahu kaal and where it's celebrated.")
    faq = []
    if lang == "ne":
        faq.append((f"{fname} {yl} कहिले हो?", f"{dl['bs']} ({dl['ad']}, {dl['weekday']})। {span_txt}".strip()))
        if o.tithi_start:
            faq.append(("तिथि कहिले सुरु हुन्छ?", f"{lunar.tithi_name(o.tithi, lang)} {bs.fmt_bs(o.tithi_start.date(), lang)} {t(o.tithi_start, lang)} देखि {bs.fmt_bs(o.tithi_end.date(), lang)} {t(o.tithi_end, lang)} सम्म।"))
        faq.append((f"{fname} सार्वजनिक बिदा हो?", f"{holiday}।"))
    else:
        faq.append((f"When is {fname} {yl}?", f"{dl['bs']}, which is {dl['weekday']}, {dl['ad']}. {span_txt}".strip()))
        if o.tithi_start:
            faq.append(("When does the tithi start and end?", f"{lunar.tithi_name(o.tithi, lang)} runs from {t(o.tithi_start, lang)} on {bs.fmt_ad(o.tithi_start.date())} to {t(o.tithi_end, lang)} on {bs.fmt_ad(o.tithi_end.date())} (Nepal time)."))
        faq.append((f"Is {fname} a public holiday?", f"{holiday}."))
    og = og_path(lang, "festivals", fid, it.key) if CFG.wants_image(year) else og_path(lang, "festivals", fid)
    page_u = abs_url(url(lang, *path))
    jsonld = [event_ld(f"{fname} {yl}", o, None, lang, nm(rule, lang, "summary"), og, page_u), faq_ld(faq)]
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "festivals"), url(lang, "festivals")),
              (fname, url(lang, "festivals", fid)), (yl, url(lang, *path))]
    ctx = page_shell(lang, path, title, desc, crumbs, og, jsonld)
    day, month, yr = bs_parts(o.date, lang)
    allin = instances(fid)
    ix = next(k for k, x in enumerate(allin) if x.key == it.key)
    prev_i = allin[ix - 1] if ix > 0 else None
    next_i = allin[ix + 1] if ix + 1 < len(allin) else None
    prev_u = url(lang, "festivals", fid, prev_i.key) if prev_i else None
    next_u = url(lang, "festivals", fid, next_i.key) if next_i else None
    ctx.update({"kind": "festival_year", "day_url": day_url(o.date), "h1": f"{fname} {yl}", "subtitle": tr(lang, "festivals"),
                "leaf": {"day": day, "month": month, "year": yr}, "date": dl, "dleft": days_until(o.date),
                "span_txt": span_txt, "holiday": holiday, "is_holiday": bool(rule.get("holiday")),
                "status": status_note(o, lang), "timings": tb,
                "timings_title": tr(lang, "timings_at", place="काठमाडौं" if lang == "ne" else "Kathmandu"),
                "timings_note": tr(lang, "timings_note", place="काठमाडौं" if lang == "ne" else "Kathmandu", lat=num("27.7172", lang), lon=num("85.3240", lang)),
                "about_title": tr(lang, "about_festival", festival=fname), "about": nm(rule, lang, "summary"),
                "rule": rule_text(rule, lang), "group": group, "season": season, "places": pls, "faq": faq,
                "festival_url": url(lang, "festivals", fid), "prev_url": prev_u, "next_url": next_u,
                "prev_label": prev_i.label(lang) if prev_i else "", "next_label": next_i.label(lang) if next_i else "",
                "_og": {"kind": "festival", "path": og, "seed": fid + it.key, "day": day, "month": month, "year": yr,
                        "title": f"{fname} {yl}", "subtitle": nm(rule, "en" if lang == "ne" else "ne") + f" {it.label('en' if lang == 'ne' else 'ne')}",
                        "place": f"{dl['weekday']}, {dl['ad']}",
                        "line3": f"{tr(lang, 'sunrise')} {t(tb['pc'].sunrise, lang)} — {lunar.tithi_name(o.tithi, lang) if o.tithi else ''}".rstrip(" —"),
                        "tithi": o.tithi} if CFG.wants_image(year) else None,
                "_json": {"festival": fid, "bs_year": year, "key": it.key, "date": o.date.isoformat(), "bs_date": "-".join(map(str, o.bs)),
                          "source": o.source, "approximate": o.approximate,
                          "tithi_start": o.tithi_start.isoformat() if o.tithi_start else None,
                          "tithi_end": o.tithi_end.isoformat() if o.tithi_end else None,
                          "places": [pl["id"] for pl, _ in festival_places().get(fid, [])]}})
    return ctx


# --------------------------------------------------------------------------
# Mountains
# --------------------------------------------------------------------------
def _ft(m: int) -> int:
    return int(round(m * 3.28084))


def peak_ctx(kid: str, lang: str) -> dict:
    k = peaks()[kid]
    name = nm(k, lang)
    h = int(k["height_m"])
    path = ("mountains", kid)
    obs = observer(k)
    months = MONTHS_AD_NE if lang == "ne" else MONTHS_AD_EN
    sun = [{"m": months[r["month"] - 1], "sr": t(r["sunrise"], lang), "ss": t(r["sunset"], lang),
            "len": bs.fmt_duration(r["day_length"], lang)} for r in panchang.month_sun_table(obs, CFG.today.year)]
    pool = list(peaks().values())
    near = [{"name": nm(x, lang), "h": hm(int(x["height_m"]), lang), "dist": km(dk, lang), "dir": compass_l(c, lang),
             "url": url(lang, "mountains", x["id"])} for dk, c, x in nearby(k["lat"], k["lon"], pool, kid, limit=6, max_km=80)]
    vf = [peaks()[v] for v in k.get("view_from", []) if v in peaks()]
    vf += [x for x in pool if kid in (x.get("faces") or []) and x not in vf]
    view_from = [{"name": nm(v, lang), "h": hm(int(v["height_m"]), lang), "url": url(lang, "mountains", v["id"]),
                  "dist": km(astro.haversine_km(v["lat"], v["lon"], k["lat"], k["lon"]), lang)} for v in vf]
    faces = [{"name": nm(peaks()[f], lang), "h": hm(int(peaks()[f]["height_m"]), lang), "url": url(lang, "mountains", f),
              "dist": km(astro.haversine_km(k["lat"], k["lon"], peaks()[f]["lat"], peaks()[f]["lon"]), lang),
              "dir": compass_l(astro.compass(astro.bearing_deg(k["lat"], k["lon"], peaks()[f]["lat"], peaks()[f]["lon"])), lang)}
             for f in (k.get("faces") or []) if f in peaks()]
    years = [{"label": year_label(y, lang), "url": url(lang, "mountains", kid, str(y)), "current": y == CFG.current_bs_year}
             for y in range(max(CFG.first_year, CFG.current_bs_year - 3), min(CFG.last_year, CFG.current_bs_year + 8) + 1)]
    unit = "मि." if lang == "ne" else "m"
    facts = [(tr(lang, "height"), f"{num(h, lang)} {unit} ({num(_ft(h), lang)} {tr(lang, 'ft')})")]
    if k.get("range"):
        facts.append((tr(lang, "range"), k["range"]))
    if k.get("district"):
        facts.append((tr(lang, "district"), nm(k, lang, "district") or k["district"]))
    if k.get("province"):
        facts.append((tr(lang, "province"), province_name(k, lang)))
    if k.get("first_ascent"):
        facts.append((tr(lang, "first_ascent"), num(str(k["first_ascent"]), lang)))
    facts.append((tr(lang, "coordinates"), num(f"{k['lat']:.4f}, {k['lon']:.4f}", lang)))
    title = (f"{name} ({num(h, lang)} मि.): उचाइ, सूर्योदय र पूर्णिमा रात" if lang == "ne"
             else f"{name} ({h:,} m): Height, Sunrise at Altitude and Full Moon Nights")
    desc = nm(k, lang, "note") or title
    og = og_path(lang, "mountains", kid)
    jsonld = [{"@context": "https://schema.org", "@type": "Mountain", "name": name, "description": desc,
               "geo": {"@type": "GeoCoordinates", "latitude": k["lat"], "longitude": k["lon"], "elevation": h},
               "containedInPlace": {"@type": "Country", "name": "Nepal"}, "image": abs_url(og)}]
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "mountains"), url(lang, "mountains")), (name, url(lang, *path))]
    ctx = page_shell(lang, path, title, desc, crumbs, og, jsonld, noindex=(not k.get("curated", True) and not CFG.index_osm))
    ctx.update({"kind": "peak", "h1": name, "height": f"{num(h, lang)} {unit}", "height_ft": f"{num(_ft(h), lang)} {tr(lang, 'ft')}",
                "note": nm(k, lang, "note"), "facts": facts, "sun": sun,
                "sun_title": tr(lang, "summit_sun", alt=num(h, lang), year=num(str(CFG.today.year), lang)),
                "near": near, "view_from": view_from, "faces": faces, "years": years, "map": map_link(k["lat"], k["lon"]),
                "osm": k.get("source") == "osm", "is_viewpoint": k.get("kind") == "viewpoint",
                "_og": {"kind": "peak", "path": og, "seed": kid, "title": name, "height": f"{num(h, lang)} {unit}",
                        "line3": f"{nm(k, 'en' if lang == 'ne' else 'ne')} — {num(_ft(h), lang)} {tr(lang, 'ft')}",
                        "line4": ", ".join(x for x in [nm(k, lang, 'district') or k.get('district', ''), province_name(k, lang)] if x)},
                "_json": {"id": kid, "name_en": k["name_en"], "name_ne": k.get("name_ne"), "height_m": h,
                          "lat": k["lat"], "lon": k["lon"]}})
    return ctx


def peak_year_ctx(kid: str, year: int, lang: str) -> dict:
    k = peaks()[kid]
    name = nm(k, lang)
    yl = year_label(year, lang)
    h = int(k["height_m"])
    obs = observer(k)
    path = ("mountains", kid, str(year))
    y0, y1 = bs.bs_year_range_ad(year)
    fms = [fm for yy in (y0.year, y1.year) for fm in panchang.full_moons(yy) if y0 <= fm.astimezone(astro.NPT).date() <= y1]
    moons = []
    for fm in fms:
        d = fm.astimezone(astro.NPT).date()
        mr = astro.moonrise(obs, d)
        moons.append({"bs": bs.fmt_bs(d, lang), "ad": bs.fmt_ad(d, lang),
                      "wd": (bs.WEEKDAYS_NE if lang == "ne" else bs.WEEKDAYS_EN)[d.weekday()],
                      "peak": t(fm, lang), "moonrise": t(mr, lang), "sunset": t(astro.sunset(obs, d), lang),
                      "season": d.month in (3, 4, 5, 10, 11)})
    sun = []
    for m in range(1, 13):
        d = bs.bs_to_ad(year, m, 15)
        sr, ss = astro.sunrise(obs, d), astro.sunset(obs, d)
        sun.append({"m": (bs.BS_MONTHS_NE if lang == "ne" else bs.BS_MONTHS_EN)[m - 1],
                    "sr": t(sr, lang), "ss": t(ss, lang), "len": bs.fmt_duration(ss - sr, lang)})
    unit = "मि." if lang == "ne" else "m"
    title = (f"{name} {yl}: पूर्णिमा रात, सूर्योदय र आरोहण मौसम" if lang == "ne"
             else f"{name} in {yl} BS: Full Moon Nights, Sunrise Times and Seasons")
    desc = (f"{yl} मा {name} ({num(h, lang)} मि.) का पूर्णिमा रात, चन्द्रोदय, हरेक महिनाको सूर्योदय-सूर्यास्त र मौसम।" if lang == "ne"
            else f"Full moon nights with moonrise times, monthly sunrise and sunset at {h:,} m, and climbing seasons for {name} in {year} BS.")
    og = og_path(lang, "mountains", kid)
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "mountains"), url(lang, "mountains")),
              (name, url(lang, "mountains", kid)), (yl, url(lang, *path))]
    ctx = page_shell(lang, path, title, desc, crumbs, og, [], noindex=(not k.get("curated", True) and not CFG.index_osm))
    ctx.update({"kind": "peak_year", "h1": f"{name} {yl}", "height": f"{num(h, lang)} {unit}", "peak_name": name,
                "moons": moons, "moons_title": tr(lang, "full_moons", year=yl), "sun": sun,
                "sun_title": tr(lang, "summit_sun", alt=num(h, lang), year=yl), "peak_url": url(lang, "mountains", kid),
                "prev_url": url(lang, "mountains", kid, str(year - 1)) if year > CFG.first_year else None,
                "next_url": url(lang, "mountains", kid, str(year + 1)) if year < CFG.last_year else None,
                "prev_label": year_label(year - 1, lang), "next_label": year_label(year + 1, lang),
                "_og": None,
                "_json": {"peak": kid, "bs_year": year, "full_moons": [fm.isoformat() for fm in fms]}})
    return ctx


# --------------------------------------------------------------------------
# Treks
# --------------------------------------------------------------------------
def band(alt: int) -> str:
    return "low" if alt < 1500 else "high" if alt < 3500 else "very" if alt < 5500 else "extreme"


def trek_stops(tk: dict, lang: str) -> list[dict]:
    out = []
    prev_sleep = None
    stops = tk["stops"]
    for i, s in enumerate(stops):
        gain = s["alt_m"] - stops[i - 1]["alt_m"] if i else 0
        sleeps = s.get("sleep", True)
        warn = None
        if sleeps and prev_sleep is not None:
            sg = s["alt_m"] - prev_sleep["alt_m"]
            if s["alt_m"] > 3000 and sg > 500:
                warn = sg
        if sleeps:
            prev_sleep = s
        dist = astro.haversine_km(stops[i - 1]["lat"], stops[i - 1]["lon"], s["lat"], s["lon"]) if i else 0
        out.append({**s, "name": nm(s, lang), "alt": num(s["alt_m"], lang),
                    "gain": ("+" if gain > 0 else "") + num(gain, lang) if i else "—",
                    "gain_raw": gain, "dist": km(dist, lang) if i else "—", "warn": warn,
                    "warn_txt": tr(lang, "ams_warning", gain=num(warn, lang)) if warn else "",
                    "rest": s["id"] in tk.get("acclimatise_at", []),
                    "url": url(lang, "treks", tk["id"], s["id"]), "sleeps": sleeps})
    return out


def trek_ctx(tid: str, lang: str) -> dict:
    tk = treks()[tid]
    name = nm(tk, lang)
    path = ("treks", tid)
    stops = trek_stops(tk, lang)
    unit = "मि." if lang == "ne" else "m"
    svg = images.altitude_svg([{"id": s["id"], "name": s["name"], "alt_m": s["alt_m"]} for s in stops],
                              unit=unit, label=name)
    hi = max(tk["stops"], key=lambda s: s["alt_m"])
    months = MONTHS_AD_NE if lang == "ne" else MONTHS_AD_EN
    sun = [{"m": months[r["month"] - 1], "sr": t(r["sunrise"], lang), "ss": t(r["sunset"], lang),
            "len": bs.fmt_duration(r["day_length"], lang)} for r in panchang.month_sun_table(observer(hi), CFG.today.year)]
    best = ", ".join(months[m - 1] for m in tk.get("best_months", []))
    lo_alt = min(s["alt_m"] for s in tk["stops"])
    title = (f"{name}: बास-बास उचाइ, अभ्यस्तता र सूर्योदय" if lang == "ne"
             else f"{name}: Stops, Altitude Profile and Acclimatisation")
    desc = tk.get(f"about_{lang}") or title
    og = og_path(lang, "treks", tid)
    jsonld = [{"@context": "https://schema.org", "@type": "TouristTrip", "name": name, "description": desc,
               "touristType": "Trekkers", "image": abs_url(og),
               "itinerary": {"@type": "ItemList", "itemListElement": [
                   {"@type": "ListItem", "position": i + 1,
                    "item": {"@type": "Place", "name": s["name"],
                             "geo": {"@type": "GeoCoordinates", "latitude": s["lat"], "longitude": s["lon"], "elevation": s["alt_m"]}}}
                   for i, s in enumerate(stops)]}}]
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "treks"), url(lang, "treks")), (name, url(lang, *path))]
    ctx = page_shell(lang, path, title, desc, crumbs, og, jsonld)
    alts = [s["alt_m"] for s in tk["stops"]]
    lo, hi_a = min(alts), max(alts)
    ctx.update({"kind": "trek", "h1": name, "about": tk.get(f"about_{lang}") or "", "permits": tk.get(f"permits_{lang}") or "",
                "best": best, "stops": stops, "svg": svg, "sun": sun,
                "sun_title": tr(lang, "summit_sun", alt=num(hi["alt_m"], lang), year=num(str(CFG.today.year), lang)) + f" — {nm(hi, lang)}",
                "range_txt": f"{num(lo_alt, lang)}–{num(hi_a, lang)} {unit}",
                "_og": {"kind": "trek", "path": og, "seed": tid, "title": name, "subtitle": nm(tk, "en" if lang == "ne" else "ne"),
                        "line3": (f"{num(len(stops), lang)} बास, {num(lo, lang)}–{num(hi_a, lang)} मि." if lang == "ne"
                                  else f"{len(stops)} stops, {lo:,} m to {hi_a:,} m"),
                        "profile": [(a - lo) / (hi_a - lo or 1) for a in alts],
                        "labels": [f"{nm(tk['stops'][0], lang)} {num(alts[0], lang)} {unit}"] + [""] * (len(alts) - 2)
                                  + [f"{nm(tk['stops'][-1], lang)} {num(alts[-1], lang)} {unit}"]},
                "_json": {"id": tid, "stops": [{k: s[k] for k in ("id", "name_en", "name_ne", "alt_m", "lat", "lon")} for s in tk["stops"]]}})
    return ctx


def trek_stop_ctx(tid: str, sid: str, lang: str) -> dict:
    tk = treks()[tid]
    stops = trek_stops(tk, lang)
    i = next(k for k, s in enumerate(stops) if s["id"] == sid)
    s = stops[i]
    name = s["name"]
    tname = nm(tk, lang)
    path = ("treks", tid, sid)
    unit = "मि." if lang == "ne" else "m"
    obs = astro.Observer(s["lat"], s["lon"], s["alt_m"])
    months = MONTHS_AD_NE if lang == "ne" else MONTHS_AD_EN
    sun = [{"m": months[r["month"] - 1], "sr": t(r["sunrise"], lang), "ss": t(r["sunset"], lang),
            "len": bs.fmt_duration(r["day_length"], lang)} for r in panchang.month_sun_table(obs, CFG.today.year)]
    b = band(s["alt_m"])
    pk = [{"name": nm(x, lang), "h": hm(int(x["height_m"]), lang), "dist": km(dk, lang), "dir": compass_l(c, lang),
           "url": url(lang, "mountains", x["id"])}
          for dk, c, x in nearby(s["lat"], s["lon"], [p for p in peaks().values() if p.get("kind") != "viewpoint"], limit=8, max_km=35)]
    sacred = [{"name": nm(p, lang), "dist": km(dk, lang), "dir": compass_l(c, lang), "url": place_url(lang, p)}
              for dk, c, p in nearby(s["lat"], s["lon"], list(places().values()), limit=4, max_km=25)]
    svg = images.altitude_svg([{"id": x["id"], "name": x["name"], "alt_m": x["alt_m"]} for x in stops], highlight=sid,
                              unit=unit, label=tname)
    prev_s = stops[i - 1] if i else None
    next_s = stops[i + 1] if i + 1 < len(stops) else None
    title = (f"{name} ({num(s['alt_m'], lang)} मि.), {tname}: उचाइ, सूर्योदय र नजिकका हिमाल" if lang == "ne"
             else f"{name} ({s['alt_m']:,} m) on the {tname}: Altitude, Sunrise and Peaks in View")
    desc = (f"{tname}को {name}: {num(s['alt_m'], lang)} मि. उचाइ, अघिल्लो र अर्को बास, लेक लाग्ने जोखिम, हरेक महिनाको सूर्योदय र नजिकका हिमाल।" if lang == "ne"
            else f"{name} on the {tname}: {s['alt_m']:,} m, distances to the previous and next stops, altitude risk, sunrise by month and peaks within 35 km.")
    crumbs = [(tr(lang, "home"), url(lang)), (tr(lang, "treks"), url(lang, "treks")), (tname, url(lang, "treks", tid)), (name, url(lang, *path))]
    jsonld = [{"@context": "https://schema.org", "@type": "Place", "name": name,
               "geo": {"@type": "GeoCoordinates", "latitude": s["lat"], "longitude": s["lon"], "elevation": s["alt_m"]},
               "containedInPlace": {"@type": "Country", "name": "Nepal"}}]
    ctx = page_shell(lang, path, title, desc, crumbs, og_path(lang, "treks", tid), jsonld)
    ctx.update({"kind": "trek_stop", "h1": name, "stop": s, "alt": f"{num(s['alt_m'], lang)} {unit}",
                "alt_ft": f"{num(_ft(s['alt_m']), lang)} {tr(lang, 'ft')}", "band": tr(lang, "bands")[b],
                "band_key": b, "band_note": tr(lang, "band_notes")[b], "prev": prev_s, "next": next_s, "sun": sun,
                "peaks": pk, "sacred": sacred, "svg": svg, "trek_url": url(lang, "treks", tid),
                "on_trek": tr(lang, "on_trek", trek=tname), "map": map_link(s["lat"], s["lon"]),
                "_og": None, "_json": {"trek": tid, "stop": sid, "alt_m": s["alt_m"], "lat": s["lat"], "lon": s["lon"]}})
    return ctx


# --------------------------------------------------------------------------
# Index pages
# --------------------------------------------------------------------------
def index_ctx(section: str, lang: str) -> dict:
    path = (section,)
    items = []
    if section == "places":
        for p in sorted(places().values(), key=lambda x: x["name_en"]):
            if not p.get("curated", True):
                continue
            items.append({"name": nm(p, lang), "sub": ", ".join(x for x in [nm(p, lang, "district") or p.get("district", ""), province_name(p, lang)] if x),
                          "url": url(lang, "places", p["id"]), "group": province_name(p, lang) or "—"})
        intro = tr(lang, "index_places_intro")
    elif section == "festivals":
        for fid, r in rules().items():
            ni = next_inst(fid)
            items.append({"name": nm(r, lang), "sub": bs.fmt_bs(ni.occ.date, lang) if ni else "",
                          "url": url(lang, "festivals", fid), "sort": ni.occ.date if ni else date.max,
                          "group": tr(lang, "festivals")})
        items.sort(key=lambda x: x["sort"])
        intro = tr(lang, "index_festivals_intro", first=year_label(CFG.first_year, lang), last=year_label(CFG.last_year, lang))
    elif section == "mountains":
        for k in sorted(peaks().values(), key=lambda x: -int(x["height_m"])):
            if not k.get("curated", True):
                continue
            items.append({"name": nm(k, lang), "sub": f"{num(int(k['height_m']), lang)} {'मि.' if lang == 'ne' else 'm'}",
                          "url": url(lang, "mountains", k["id"]), "group": ""})
        intro = tr(lang, "index_mountains_intro")
    else:
        for tk in treks().values():
            alts = [s["alt_m"] for s in tk["stops"]]
            items.append({"name": nm(tk, lang), "sub": f"{num(min(alts), lang)}–{num(max(alts), lang)} {'मि.' if lang == 'ne' else 'm'}",
                          "url": url(lang, "treks", tk["id"]), "group": ""})
        intro = tr(lang, "index_treks_intro")
    h1 = tr(lang, section)
    crumbs = [(tr(lang, "home"), url(lang)), (h1, url(lang, *path))]
    title = f"{h1} — {tr(lang, 'site')}"
    jsonld = [{"@context": "https://schema.org", "@type": "ItemList",
               "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": abs_url(it["url"]), "name": it["name"]}
                                   for i, it in enumerate(items[:100])]}]
    ctx = page_shell(lang, path, title, intro, crumbs, None, jsonld)
    groups: dict[str, list] = {}
    for it in items:
        groups.setdefault(it["group"], []).append(it)
    ctx.update({"kind": "index", "section": section, "h1": h1, "intro": intro, "groups": groups, "_og": None, "_json": None})
    return ctx
