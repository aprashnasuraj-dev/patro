"""
Festival date engine.

Every festival is a *rule*, not a stored date. Rules live in
data/festivals.yaml and are evaluated for any BS year in 2070-2100.

Rule types
----------
lunar      : purnimanta month + paksha + tithi + kaal (time-of-day rule)
lunar_solar: paksha + tithi that falls inside a given *solar* BS month
             (e.g. Gaura Parva: Shukla Ashtami in Bhadra, as observed in
             Sudurpashchim — stays in Bhadra even in Adhik years)
solar_bs   : fixed Bikram Sambat date (e.g. Baisakh 1, Magh 1, Poush 15)
gregorian  : fixed AD date (e.g. Christmas, Dec 25)
hijri      : Islamic date via the tabular calendar (approximate; moon sighting
             in Nepal can move it by a day — pages say so)
relative   : N days from another festival (e.g. Bisket Jatra start)

Kaal (which civil day "owns" the tithi)
---------------------------------------
sunrise    : the day whose sunrise falls inside the tithi (udaya tithi). If the
             tithi starts and ends between two sunrises (kshaya), the day on
             which it starts. If it covers two sunrises, the first.
sunset     : the day whose sunset falls inside the tithi (Chhath evening arghya).
nishita    : the night whose Nishita kaal (the 8th of 15 night muhurtas,
             centred on the midpoint of the night) lies wholly inside the tithi;
             if neither night qualifies, falls back to the udaya tithi.
pradosh    : the evening whose Pradosh kaal (first 3 night muhurtas after
             sunset) overlaps the tithi the most.
aparahna   : the day whose Aparahna (4th fifth of daytime) overlaps the most.
madhyahna  : the day whose Madhyahna (3rd fifth of daytime) overlaps the most.

Official overrides
------------------
Nepal Panchanga Nirnayak Samiti occasionally decides a date differently
from the plain rule (local sunrise convention, dharma-shastra exceptions).
data/overrides.yaml pins those official dates; the engine reports both the
computed and the published date so editors can see disagreements.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml

from . import astro, bs, lunar

DATA = Path(__file__).resolve().parent.parent / "data"


@dataclass
class Occurrence:
    festival_id: str
    bs_year: int
    date: date                              # civil date in Nepal
    tithi: Optional[int] = None
    tithi_start: Optional[datetime] = None
    tithi_end: Optional[datetime] = None
    computed_date: Optional[date] = None    # before override
    source: str = "computed"                # computed | official-override
    approximate: bool = False
    note: str = ""
    span_days: int = 1                      # multi-day festivals
    extra: dict = field(default_factory=dict)

    @property
    def bs(self):
        return bs.ad_to_bs(self.date)


# --------------------------------------------------------------------------
# Loading
# --------------------------------------------------------------------------
@lru_cache(maxsize=1)
def load_rules() -> dict:
    with open(DATA / "festivals.yaml", encoding="utf-8") as f:
        items = yaml.safe_load(f)["festivals"]
    return {it["id"]: it for it in items}


@lru_cache(maxsize=1)
def load_overrides() -> dict:
    p = DATA / "overrides.yaml"
    if not p.exists():
        return {}
    with open(p, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    out = {}
    for fid, years in (raw.get("overrides") or {}).items():
        for y, ad in years.items():
            out[(fid, int(y))] = date.fromisoformat(str(ad))
    return out


# --------------------------------------------------------------------------
# Kaal windows
# --------------------------------------------------------------------------
def _windows(obs: astro.Observer, d: date) -> dict:
    sr = astro.sunrise(obs, d)
    ss = astro.sunset(obs, d)
    sr_next = astro.sunrise(obs, d + timedelta(days=1))
    day = ss - sr
    night = sr_next - ss
    mid_night = ss + night / 2
    muh_n = night / 15
    return {
        "sunrise": sr,
        "sunset": ss,
        "next_sunrise": sr_next,
        "nishita": (mid_night - muh_n / 2, mid_night + muh_n / 2),
        "nishita_mid": mid_night,
        "pradosh": (ss, ss + muh_n * 3),
        "aparahna": (sr + day * 3 / 5, sr + day * 4 / 5),
        "madhyahna": (sr + day * 2 / 5, sr + day * 3 / 5),
        "abhijit": (sr + day / 2 - day / 30, sr + day / 2 + day / 30),
    }


def _overlap(a, b) -> float:
    lo = max(a[0], b[0])
    hi = min(a[1], b[1])
    return max(0.0, (hi - lo).total_seconds())


def civil_day_for_tithi(start: datetime, end: datetime, kaal: str,
                        obs: astro.Observer = astro.KATHMANDU, grace_min: int = 0) -> date:
    first = (start - timedelta(days=1)).astimezone(astro.NPT).date()
    last = end.astimezone(astro.NPT).date()
    days = [first + timedelta(days=i) for i in range((last - first).days + 1)]

    if kaal == "sunrise":
        # grace_min: Nepal's official panchang reckons some tithis a little
        # earlier than precise (drik) computation; a tithi that begins within
        # grace_min minutes after sunrise is treated as the day's udaya tithi.
        g = timedelta(minutes=grace_min)
        hits = [d for d in days if start - g <= _windows(obs, d)["sunrise"] < end]
        if hits:
            return hits[0]
        return start.astimezone(astro.NPT).date()  # kshaya tithi

    if kaal == "sunset":
        hits = [d for d in days if start <= _windows(obs, d)["sunset"] < end]
        if hits:
            return hits[0]
        return start.astimezone(astro.NPT).date()

    if kaal == "nishita":
        # "nishita-vyapini": the tithi must pervade the whole Nishita window
        hits = [d for d in days
                if start <= _windows(obs, d)["nishita"][0] and _windows(obs, d)["nishita"][1] <= end]
        if hits:
            return hits[0]
        # tithi misses midnight on both nights: Nepal follows the udaya tithi
        return civil_day_for_tithi(start, end, "sunrise", obs)

    key = kaal
    if key not in ("nishita", "pradosh", "aparahna", "madhyahna"):
        raise ValueError(f"unknown kaal {kaal}")
    scored = [(_overlap((start, end), _windows(obs, d)[key]), d) for d in days]
    best = max(s for s, _ in scored)
    if best == 0:
        return start.astimezone(astro.NPT).date()
    return [d for s, d in scored if s == best][0]


# --------------------------------------------------------------------------
# Hijri tabular calendar (civil, Kuwaiti algorithm)
# --------------------------------------------------------------------------
def _hijri_to_jd(y: int, m: int, d: int) -> int:
    """Chronological Julian Day Number of a tabular (civil) Hijri date."""
    import math
    return (d + math.ceil(29.5 * (m - 1)) + (y - 1) * 354
            + (3 + 11 * y) // 30 + 1948439)


def _jd_to_date(jd: int) -> date:
    return date.fromordinal(jd - 1721424)


def _hijri_occurrences(month: int, day: int, ad_from: date, ad_to: date):
    hy0 = int((ad_from.year - 622) * 33 / 32) - 1
    for hy in range(hy0, hy0 + 4):
        d = _jd_to_date(_hijri_to_jd(hy, month, day))
        if ad_from <= d <= ad_to:
            yield d


# --------------------------------------------------------------------------
# Main API
# --------------------------------------------------------------------------
def _lunar_occurrences(rule: dict, obs: astro.Observer):
    paksha = rule["paksha"]
    t = int(rule["tithi"])
    abs_t = t if paksha == "shukla" else 15 + t
    for m in lunar.find_months(rule["month"], paksha):
        if m.start < FESTIVAL_FROM:
            continue
        # tithi k spans elongation [(k-1)*12, k*12)
        s = m.start if abs_t == 1 else astro.find_phase((abs_t - 1) * 12.0, m.start, 31)
        e = astro.find_phase(abs_t * 12.0, s + timedelta(hours=2), 3)
        if s >= m.end:
            continue
        d = civil_day_for_tithi(s, e, rule.get("kaal", "sunrise"), obs, int(rule.get("grace_min", 0)))
        yield d, abs_t, s, e


FESTIVAL_FROM = datetime(2010, 1, 1, tzinfo=astro.UTC)   # festival pages and tests need nothing earlier


def _paksha_tithi_instances(paksha: str, tithi: int, kaal: str, obs: astro.Observer):
    abs_t = tithi if paksha == "shukla" else 15 + tithi
    for m in lunar.month_table():
        if m.start < FESTIVAL_FROM:
            continue
        s = m.start if abs_t == 1 else astro.find_phase((abs_t - 1) * 12.0, m.start, 31)
        if s >= m.end:
            continue
        e = astro.find_phase(abs_t * 12.0, s + timedelta(hours=2), 3)
        yield civil_day_for_tithi(s, e, kaal, obs), abs_t, s, e


@lru_cache(maxsize=None)
def _all_lunar_solar(fid: str):
    rule = load_rules()[fid]
    return list(_paksha_tithi_instances(rule["paksha"], int(rule["tithi"]), rule.get("kaal", "sunrise"), astro.KATHMANDU))


@lru_cache(maxsize=None)
def _all_lunar(fid: str):
    rule = load_rules()[fid]
    return list(_lunar_occurrences(rule, astro.KATHMANDU))


def occurrences(fid: str, bs_year: int) -> list[Occurrence]:
    """All occurrences of a festival inside BS year `bs_year`.

    Usually one. Lunar festivals near the year boundary (Chaitra / Baisakh)
    can occur twice in one BS year or not at all — e.g. Ram Navami falls on
    Chaitra 12, 2082 and Baisakh 2, 2084, so BS 2083 has none, because 2083
    contains an Adhik (extra) lunar month.
    """
    rules = load_rules()
    rule = rules[fid]
    y0, y1 = bs.bs_year_range_ad(bs_year)
    typ = rule["type"]
    found: list[Occurrence] = []

    if typ == "lunar":
        for d, abs_t, s, e in _all_lunar(fid):
            if y0 <= d <= y1:
                found.append(Occurrence(fid, bs_year, d, abs_t, s, e, computed_date=d))
    elif typ == "lunar_solar":
        want_m = int(rule["bs_month"])
        hits = [(d, abs_t, s, e) for d, abs_t, s, e in _all_lunar_solar(fid)
                if y0 <= d <= y1 and bs.ad_to_bs(d)[1] == want_m]
        if hits:
            d, abs_t, s, e = hits[0]
            o = Occurrence(fid, bs_year, d, abs_t, s, e, computed_date=d)
            if len(hits) > 1:   # solar month holds two such tithis: first is used, flagged for review
                o.approximate, o.note = True, "two-in-month"
            found.append(o)
    elif typ == "solar_bs":
        d = bs.bs_to_ad(bs_year, int(rule["bs_month"]), int(rule["bs_day"]))
        found.append(Occurrence(fid, bs_year, d, computed_date=d))
    elif typ == "gregorian":
        for yy in sorted({y0.year, y1.year}):
            d = date(yy, int(rule["ad_month"]), int(rule["ad_day"]))
            if y0 <= d <= y1:
                found.append(Occurrence(fid, bs_year, d, computed_date=d))
    elif typ == "hijri":
        for d in _hijri_occurrences(int(rule["hijri_month"]), int(rule["hijri_day"]), y0, y1):
            found.append(Occurrence(fid, bs_year, d, computed_date=d, approximate=True, note="moon-sighting"))
    elif typ == "relative":
        for base in occurrences(rule["base"], bs_year):
            d = base.date + timedelta(days=int(rule["offset_days"]))
            found.append(Occurrence(fid, bs_year, d, computed_date=d, approximate=base.approximate, note=base.note))
    else:
        raise ValueError(f"unknown rule type {typ}")

    found.sort(key=lambda o: o.date)
    ov = load_overrides().get((fid, bs_year))
    for i, occ in enumerate(found):
        occ.span_days = int(rule.get("span_days", 1))
        if rule.get("approximate"):
            occ.approximate = True
            occ.note = occ.note or "approximate"
        if ov and i == 0:
            occ.date = ov
            occ.source = "official-override"
    return found


def occurrence(fid: str, bs_year: int) -> Optional[Occurrence]:
    """First occurrence in the BS year (most festivals have exactly one)."""
    occs = occurrences(fid, bs_year)
    return occs[0] if occs else None


def year_occurrences(bs_year: int) -> list[Occurrence]:
    out = []
    for fid in load_rules():
        out.extend(occurrences(fid, bs_year))
    return sorted(out, key=lambda o: o.date)


def kaal_windows(obs: astro.Observer, d: date) -> dict:
    """Public wrapper used by page builders."""
    return _windows(obs, d)
