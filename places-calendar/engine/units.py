"""
Exact unit conversion for the "kati" pages.

All factors are Fractions, so 1 bigha -> ropani is exactly 72900/5476 and is
only rounded at display time. Numbers are written the Nepali way: lakh
grouping (1,00,000) and, on Nepali pages, Devanagari digits.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

import yaml

from .bs import ne_num

DATA = Path(__file__).resolve().parent.parent / "data"


@dataclass(frozen=True)
class Unit:
    id: str
    slug: str
    group: str
    en: str
    en_pl: str
    ne: str
    factor: Fraction
    values: tuple
    generic: bool
    approximate: bool
    aliases: tuple
    note_en: str
    note_ne: str

    def label(self, lang: str, qty: Fraction | None = None) -> str:
        if lang == "ne":
            return self.ne
        if qty is not None and qty != 1:
            return self.en_pl
        return self.en

    def title(self, lang: str) -> str:
        """Capitalised label for headings: 'Ropani', 'Sq Ft', 'Troy Ounce'."""
        if lang == "ne":
            return self.ne
        return " ".join(w[:1].upper() + w[1:] for w in self.en.split(" "))


@dataclass
class Group:
    id: str
    raw: dict
    units: list = field(default_factory=list)

    def unit(self, uid: str) -> Unit:
        return next(u for u in self.units if u.id == uid)

    @property
    def chains(self) -> list[list[Unit]]:
        return [[self.unit(u) for u in ch] for ch in self.raw.get("chains", [])]


@lru_cache(maxsize=1)
def load() -> tuple[dict[str, Group], dict]:
    raw = yaml.safe_load((DATA / "units.yaml").read_text(encoding="utf-8"))
    vsets = {k: tuple(Fraction(v) for v in vs) for k, vs in raw["value_sets"].items()}
    groups: dict[str, Group] = {}
    for g in raw["groups"]:
        grp = Group(g["id"], g)
        for u in g["units"]:
            grp.units.append(Unit(
                id=u["id"], slug=u["slug"], group=g["id"], en=u["en"], en_pl=u.get("en_pl", u["en"]),
                ne=u["ne"], factor=Fraction(u["factor"]), values=vsets[u["values"]],
                generic=bool(u.get("generic")), approximate=bool(u.get("approximate") or g.get("approximate")),
                aliases=tuple(u.get("aliases") or ()), note_en=u.get("note_en", ""), note_ne=u.get("note_ne", "")))
        groups[g["id"]] = grp
    return groups, vsets


def groups() -> dict[str, Group]:
    return load()[0]


def convert(value: Fraction, a: Unit, b: Unit) -> Fraction:
    return value * a.factor / b.factor


def ratio(a: Unit, b: Unit) -> Fraction:
    return a.factor / b.factor


def pairs(g: Group):
    """Directed (from, to) pairs that get pages."""
    for a in g.units:
        for b in g.units:
            if a is b or (a.generic and b.generic):
                continue
            yield a, b


def questions(g: Group):
    """(value, from, to) triples that get a page. Equal-sized units
    (arab / billion) only get the value-1 question."""
    for a, b in pairs(g):
        same = a.factor == b.factor
        for v in a.values:
            if same and v != 1:
                continue
            yield v, a, b


# --------------------------------------------------------------------------
# Number formatting
# --------------------------------------------------------------------------
def lakh_group(int_str: str) -> str:
    """'10000000' -> '1,00,00,000'"""
    neg = int_str.startswith("-")
    s = int_str.lstrip("-")
    if len(s) <= 3:
        out = s
    else:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        out = ",".join(parts + [tail])
    return ("-" if neg else "") + out


def intl_group(int_str: str) -> str:
    return f"{int(int_str):,}"


def decimals_for(x: float) -> int:
    ax = abs(x)
    if ax == 0:
        return 0
    if ax >= 1000:
        return 2
    if ax >= 1:
        return 4
    # keep 4 significant digits for small numbers
    return min(10, max(4, -math.floor(math.log10(ax)) + 3))


def fmt(q: Fraction, lang: str = "en", places: int | None = None, grouping: str = "lakh") -> str:
    """Exact integers print in full; other values are rounded half-up and
    trailing zeros dropped. Lakh grouping by default."""
    if q.denominator == 1:
        s = str(q.numerator)
        s = lakh_group(s) if grouping == "lakh" else intl_group(s)
    else:
        p = decimals_for(float(q)) if places is None else places
        d = (Decimal(q.numerator) / Decimal(q.denominator)).quantize(Decimal(1).scaleb(-p), rounding=ROUND_HALF_UP)
        s = format(d, "f")
        if "." in s:
            s = s.rstrip("0").rstrip(".")
        ip, _, fp = s.partition(".")
        ip = lakh_group(ip) if grouping == "lakh" else intl_group(ip)
        s = ip + ("." + fp if fp else "")
    return ne_num(s) if lang == "ne" else s


def is_exact(q: Fraction) -> bool:
    if q.denominator == 1:
        return True
    p = decimals_for(float(q))
    d = Decimal(q.numerator) / Decimal(q.denominator)
    return d == d.quantize(Decimal(1).scaleb(-p))


def vslug(v: Fraction) -> str:
    """URL form of a value: 1, 2.5, 0.25, 100000."""
    if v.denominator == 1:
        return str(v.numerator)
    s = format(Decimal(v.numerator) / Decimal(v.denominator), "f")
    return s.rstrip("0").rstrip(".")


# --------------------------------------------------------------------------
# Mixed amounts: "2 ropani 8 aana 1 paisa 2.5 daam"
# --------------------------------------------------------------------------
def breakdown(base_qty: Fraction, chain: list[Unit]) -> list[tuple[Unit, Fraction]]:
    q = base_qty
    out = []
    for i, u in enumerate(chain):
        if i < len(chain) - 1:
            n = Fraction(math.floor(q / u.factor))
            q -= n * u.factor
        else:
            n = q / u.factor
            n = Fraction(Decimal(n.numerator) / Decimal(n.denominator)).limit_denominator(10 ** 6)
        out.append((u, n))
    # trim leading/trailing zeros, keep at least one part
    parts = [(u, n) for u, n in out if n != 0]
    return parts or [out[-1]]


def breakdown_text(parts, lang: str) -> str:
    return " ".join(f"{fmt(n, lang, places=2)} {u.label(lang, n)}" for u, n in parts)


def square_side(area_base: Fraction) -> float:
    """Side of a square with this area (base = sq ft), in feet."""
    return math.sqrt(float(area_base))
