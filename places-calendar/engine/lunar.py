"""
Lunisolar month table (Chandra masa).

Months are computed *amanta* (new moon to new moon), which is how the
astronomy works, and then exposed with the *purnimanta* naming used for
festivals in Nepal (e.g. "Bhadra Krishna Ashtami" for Krishna Janmashtami,
"Falgun Krishna Chaturdashi" for Maha Shivaratri, "Kartik Krishna Aunsi"
for Laxmi Puja).

Naming rule: an amanta month takes the name that follows the sidereal sign
the Sun occupies at the new moon that begins it (Sun in Meena -> Chaitra,
Sun in Mesha -> Baisakh ...). If no sankranti falls inside a lunation, that
lunation is Adhik (Malmas / extra month) and shares the name of the next one.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from . import astro

LUNAR_MONTHS = ["Chaitra", "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra",
                "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun"]
LUNAR_MONTHS_NE = ["चैत्र", "वैशाख", "जेठ", "असार", "श्रावण", "भाद्र",
                   "आश्विन", "कार्तिक", "मार्ग", "पौष", "माघ", "फाल्गुन"]

TITHI_NAMES = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
               "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
               "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"]
TITHI_NAMES_NE = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी",
                  "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी",
                  "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"]


def tithi_name(n: int, lang: str = "en") -> str:
    """Name for absolute tithi 1..30 including paksha."""
    if lang == "ne":
        if n == 15:
            return "पूर्णिमा"
        if n == 30:
            return "औंसी"
        pk = "शुक्ल" if n <= 15 else "कृष्ण"
        return f"{pk} {TITHI_NAMES_NE[(n - 1) % 15]}"
    if n == 15:
        return "Purnima"
    if n == 30:
        return "Aunsi (Amavasya)"
    pk = "Shukla" if n <= 15 else "Krishna"
    return f"{pk} {TITHI_NAMES[(n - 1) % 15]}"


@dataclass(frozen=True)
class LunarMonth:
    start: datetime          # new moon that begins it
    end: datetime            # next new moon
    amanta_index: int        # 0=Chaitra .. 11=Falgun
    adhik: bool

    @property
    def name(self) -> str:
        return ("Adhik " if self.adhik else "") + LUNAR_MONTHS[self.amanta_index]


@lru_cache(maxsize=1)
def month_table(start_year: int = 1940, end_year: int = 2046) -> tuple[LunarMonth, ...]:
    """All lunations from Jan start_year to Dec end_year."""
    t = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    stop = datetime(end_year, 12, 31, tzinfo=timezone.utc)
    new_moons = []
    while t < stop:
        nm = astro.find_phase(0.0, t, 40)
        new_moons.append(nm)
        t = nm + timedelta(days=20)
    signs = [int(astro.sun_sidereal(nm) // 30) for nm in new_moons]  # 0=Mesha
    months = []
    for i in range(len(new_moons) - 1):
        s_here = signs[i]
        s_next = signs[i + 1]
        adhik = s_here == s_next          # no sankranti inside this lunation
        name_sign = s_here                # month named after sign at its start
        idx = (name_sign + 1) % 12        # Meena(11)->Chaitra(0), Mesha(0)->Baisakh(1)
        months.append(LunarMonth(new_moons[i], new_moons[i + 1], idx, adhik))
    return tuple(months)


def find_months(purnimanta_name: str, paksha: str):
    """Yield amanta LunarMonth objects in which the given (purnimanta month,
    paksha) fortnight falls. Krishna paksha of purnimanta month M is the
    second half of amanta month M-1."""
    idx = LUNAR_MONTHS.index(purnimanta_name)
    if paksha == "krishna":
        idx = (idx - 1) % 12
    for m in month_table():
        if m.amanta_index == idx and not m.adhik:
            yield m


def adhik_months():
    return [m for m in month_table() if m.adhik]
