"""
Day panchang for any place: sunrise/sunset, moonrise/moonset, tithi,
nakshatra, yoga, karana, Rahu kaal, Yamaganda, Gulika, Abhijit muhurta.

Everything is local to the observer's coordinates, which is what makes the
place pages genuinely different from each other (Muktinath's sunrise is
~16 minutes later than Pathibhara's on the same day).
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta

from . import astro, lunar

NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
              "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
              "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
              "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
              "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"]
NAKSHATRAS_NE = ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
                 "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी",
                 "उत्तराफाल्गुनी", "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा",
                 "ज्येष्ठा", "मूल", "पूर्वाषाढा", "उत्तराषाढा", "श्रवण",
                 "धनिष्ठा", "शतभिषा", "पूर्वभाद्रपद", "उत्तरभाद्रपद", "रेवती"]
YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
         "Sukarma", "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
         "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
         "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"]
YOGAS_NE = ["विष्कम्भ", "प्रीति", "आयुष्मान्", "सौभाग्य", "शोभन", "अतिगण्ड",
            "सुकर्मा", "धृति", "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात",
            "हर्षण", "वज्र", "सिद्धि", "व्यतीपात", "वरीयान्", "परिघ", "शिव",
            "सिद्ध", "साध्य", "शुभ", "शुक्ल", "ब्रह्म", "इन्द्र", "वैधृति"]
_MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti"]
_MOVABLE_NE = ["बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि"]
RASHIS = ["Mesh", "Brish", "Mithun", "Karkat", "Simha", "Kanya",
          "Tula", "Brishchik", "Dhanu", "Makar", "Kumbha", "Meen"]
RASHIS_NE = ["मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
             "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"]

# Rahu kaal / Yamaganda / Gulika: which eighth of the daytime (1..8), by weekday
# (Python weekday: Mon=0 .. Sun=6)
RAHU = {0: 2, 1: 7, 2: 5, 3: 6, 4: 4, 5: 3, 6: 8}
YAMA = {0: 4, 1: 3, 2: 2, 3: 1, 4: 7, 5: 6, 6: 5}
GULIKA = {0: 6, 1: 5, 2: 4, 3: 3, 4: 2, 5: 1, 6: 7}


def karana_name(k: int, lang: str = "en") -> str:
    """k = 1..60 half-tithi index."""
    if k == 1:
        return "किंस्तुघ्न" if lang == "ne" else "Kimstughna"
    if k == 58:
        return "शकुनि" if lang == "ne" else "Shakuni"
    if k == 59:
        return "चतुष्पद" if lang == "ne" else "Chatushpada"
    if k == 60:
        return "नाग" if lang == "ne" else "Naga"
    i = (k - 2) % 7
    return _MOVABLE_NE[i] if lang == "ne" else _MOVABLE[i]


@dataclass
class DayPanchang:
    date: date
    sunrise: datetime
    sunset: datetime
    day_length: timedelta
    moonrise: datetime | None
    moonset: datetime | None
    tithi: int
    tithi_end: datetime
    nakshatra: int
    nakshatra_end: datetime
    yoga: int
    karana: int
    moon_rashi: int
    sun_rashi: int
    illumination: float
    rahu: tuple
    yamaganda: tuple
    gulika: tuple
    abhijit: tuple
    brahma_muhurta: tuple

    def names(self, lang: str = "en") -> dict:
        ne = lang == "ne"
        return {
            "tithi": lunar.tithi_name(self.tithi, lang),
            "nakshatra": (NAKSHATRAS_NE if ne else NAKSHATRAS)[self.nakshatra - 1],
            "yoga": (YOGAS_NE if ne else YOGAS)[self.yoga - 1],
            "karana": karana_name(self.karana, lang),
            "moon_rashi": (RASHIS_NE if ne else RASHIS)[self.moon_rashi - 1],
            "sun_rashi": (RASHIS_NE if ne else RASHIS)[self.sun_rashi - 1],
        }

    def as_json(self) -> dict:
        d = asdict(self)
        out = {}
        for k, v in d.items():
            if isinstance(v, datetime):
                out[k] = v.isoformat(timespec="minutes")
            elif isinstance(v, date):
                out[k] = v.isoformat()
            elif isinstance(v, timedelta):
                out[k] = int(v.total_seconds() // 60)
            elif isinstance(v, tuple):
                out[k] = [x.isoformat(timespec="minutes") for x in v]
            else:
                out[k] = v
        out["names_en"] = self.names("en")
        out["names_ne"] = self.names("ne")
        return out


def _eighth(sr: datetime, ss: datetime, n: int) -> tuple:
    part = (ss - sr) / 8
    return (sr + part * (n - 1), sr + part * n)


def day_panchang(obs: astro.Observer, d: date) -> DayPanchang:
    sr = astro.sunrise(obs, d)
    ss = astro.sunset(obs, d)
    t_n, _, t_end = astro.tithi_bounds(sr)
    n_n, _, n_end = astro.nakshatra_bounds(sr)
    wd = d.weekday()
    day = ss - sr
    prev_ss = astro.sunset(obs, d - timedelta(days=1))
    night = sr - prev_ss
    return DayPanchang(
        date=d,
        sunrise=sr,
        sunset=ss,
        day_length=day,
        moonrise=astro.moonrise(obs, d),
        moonset=astro.moonset(obs, d),
        tithi=t_n,
        tithi_end=t_end,
        nakshatra=n_n,
        nakshatra_end=n_end,
        yoga=astro.yoga_at(sr),
        karana=astro.karana_at(sr),
        moon_rashi=astro.rashi_moon_at(sr),
        sun_rashi=astro.rashi_sun_at(sr),
        illumination=round(astro.illumination(sr), 3),
        rahu=_eighth(sr, ss, RAHU[wd]),
        yamaganda=_eighth(sr, ss, YAMA[wd]),
        gulika=_eighth(sr, ss, GULIKA[wd]),
        abhijit=(sr + day / 2 - day / 30, sr + day / 2 + day / 30),
        brahma_muhurta=(sr - night * 2 / 15, sr - night / 15),
    )


def month_sun_table(obs: astro.Observer, year: int) -> list[dict]:
    """Sunrise/sunset on the 15th of each AD month — used by trek/peak pages."""
    rows = []
    for m in range(1, 13):
        d = date(year, m, 15)
        sr, ss = astro.sunrise(obs, d), astro.sunset(obs, d)
        rows.append({"month": m, "sunrise": sr, "sunset": ss, "day_length": ss - sr})
    return rows


def full_moons(year_ad: int) -> list[datetime]:
    out = []
    t = datetime(year_ad, 1, 1, tzinfo=astro.UTC)
    while True:
        fm = astro.find_phase(180.0, t, 35)
        if fm.year != year_ad:
            break
        out.append(fm)
        t = fm + timedelta(days=20)
    return out


def new_moons(year_ad: int) -> list[datetime]:
    out = []
    t = datetime(year_ad, 1, 1, tzinfo=astro.UTC)
    while True:
        nm = astro.find_phase(0.0, t, 35)
        if nm.year != year_ad:
            break
        out.append(nm)
        t = nm + timedelta(days=20)
    return out
