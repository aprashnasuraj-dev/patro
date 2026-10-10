"""
Life-event calculations: what the sky looked like on a birth date, when the
lunar (tithi) birthday falls each year, and annual shraddha dates.

Conventions (stated on every page that uses them):
* Day values (tithi, nakshatra, moon rashi) are taken at Kathmandu sunrise,
  with the time of any change before the next sunrise, because the user's
  birth time decides which side of a change they fall on.
* Tithi birthday (janma tithi): the day the birth tithi is current at sunrise
  in the same lunar month. A birth in an Adhik (extra) month is celebrated in
  the regular month of the same name.
* Shraddha: the day whose afternoon (aparahna) the tithi covers most, the
  common rule for fixing a shraddha tithi. Families and purohits may follow
  other rules, and pages say so.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import lru_cache

from . import astro, festivals as F, lunar


@dataclass
class DayInfo:
    date: date
    sunrise: datetime
    tithi: int
    lunar_month: lunar.LunarMonth
    nak: int
    nak_next: int | None
    nak_change: datetime | None
    rashi: int
    rashi_next: int | None
    rashi_change: datetime | None


def _month_at(t: datetime) -> lunar.LunarMonth:
    for m in lunar.month_table():
        if m.start <= t < m.end:
            return m
    raise ValueError(f"no lunar month for {t}")


def _bisect_change(fn, lo: datetime, hi: datetime) -> datetime:
    a = fn(lo)
    for _ in range(36):
        mid = lo + (hi - lo) / 2
        if fn(mid) == a:
            lo = mid
        else:
            hi = mid
    return hi


@lru_cache(maxsize=50_000)
def day_info(d: date) -> DayInfo:
    obs = astro.KATHMANDU
    sr = astro.sunrise(obs, d)
    sr2 = astro.sunrise(obs, d + timedelta(days=1))
    nak, nak2 = astro.nakshatra_at(sr), astro.nakshatra_at(sr2)
    ras, ras2 = astro.rashi_moon_at(sr), astro.rashi_moon_at(sr2)
    nak_c = _bisect_change(astro.nakshatra_at, sr, sr2) if nak != nak2 else None
    ras_c = _bisect_change(astro.rashi_moon_at, sr, sr2) if ras != ras2 else None
    return DayInfo(d, sr, astro.tithi_at(sr), _month_at(sr), nak, nak2 if nak != nak2 else None, nak_c,
                   ras, ras2 if ras != ras2 else None, ras_c)


def _tithi_span(m: lunar.LunarMonth, abs_t: int):
    s = m.start if abs_t == 1 else astro.find_phase((abs_t - 1) * 12.0, m.start, 31)
    if s >= m.end:
        return None
    return s, astro.find_phase(abs_t * 12.0, s + timedelta(hours=2), 3)


def _udaya_day(m: lunar.LunarMonth, abs_t: int, kaal: str = "sunrise") -> date | None:
    sp = _tithi_span(m, abs_t)
    return F.civil_day_for_tithi(sp[0], sp[1], kaal) if sp else None


@lru_cache(maxsize=8)
def _future_months(after: date) -> dict[int, list[lunar.LunarMonth]]:
    by: dict[int, list] = {}
    for m in lunar.month_table():
        if not m.adhik and m.end.date() >= after:
            by.setdefault(m.amanta_index, []).append(m)
    return by


@lru_cache(maxsize=4096)
def _udaya_cached(m: lunar.LunarMonth, abs_t: int) -> date | None:
    return _udaya_day(m, abs_t)


def tithi_birthdays(info: DayInfo, after: date, count: int = 3) -> list[date]:
    """Next `count` lunar birthdays on or after `after`."""
    out = []
    for m in _future_months(after).get(info.lunar_month.amanta_index, []):
        d = _udaya_cached(m, info.tithi)
        if d and d >= after:
            out.append(d)
            if len(out) == count:
                break
    return out


def shraddha_dates(month: str, paksha: str, tithi: int, d0: date, d1: date) -> list[tuple]:
    """Annual shraddha days for (purnimanta month, paksha, tithi) between d0
    and d1, as (day, lunar month, tithi start, tithi end)."""
    abs_t = tithi if paksha == "shukla" else 15 + tithi
    out = []
    for m in lunar.find_months(month, paksha):
        if m.end.date() < d0 or m.start.date() > d1:
            continue
        sp = _tithi_span(m, abs_t)
        if not sp:
            continue
        d = F.civil_day_for_tithi(sp[0], sp[1], "aparahna")
        if d0 <= d <= d1:
            out.append((d, m, sp[0], sp[1]))
    return out


def pitri_paksha(bs_year: int) -> list[tuple[str, int, date]]:
    """Sorha Shraddha for a BS year: Bhadra Purnima, then Asoj Krishna
    Pratipada to Aunsi. Returns (paksha, tithi, date) with aparahna days."""
    from . import bs
    y0, y1 = bs.bs_year_range_ad(bs_year)
    out = []
    pur = shraddha_dates("Bhadra", "shukla", 15, y0, y1)
    if not pur:
        return []
    start = pur[0][0]
    out.append(("shukla", 15, start))
    for t in range(1, 16):
        hits = shraddha_dates("Asoj", "krishna", t, start, start + timedelta(days=25))
        if hits:
            out.append(("krishna", t, hits[0][0]))
    return out
