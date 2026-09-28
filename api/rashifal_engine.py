"""Nepal Miti Rashifal calculation service, adapted from the uploaded v1.0.0 bundle.

Public-reading persistence and browser privacy controls remain in the Nepal Miti
Supabase BFF. No birth input is persisted or logged by this service.
"""
import hashlib
import hmac
import os
import secrets
import time as _time_module
import urllib.request
from collections import OrderedDict, defaultdict
from datetime import UTC, date, datetime, time, timedelta
from functools import lru_cache
from threading import Lock, RLock
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import nepali_datetime as nd
import swisseph as swe
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

__version__ = "1.0.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RASHIFAL_", env_file=".env", extra="ignore")
    service_token: str = Field(default="edge-bff-vault-auth-sentinel-not-a-secret-000000000", min_length=32)
    database_url: str = "sqlite:///./rashifal.db"
    ephemeris: Literal["moshier", "swiss"] = "moshier"
    ephemeris_path: str = "./ephe"
    request_limit_per_minute: int = Field(default=60, ge=1, le=10000)
    build_id: str = "nepal-miti-vercel-1"


@lru_cache
def settings() -> Settings:
    return Settings()


Period = Literal["daily", "weekly", "monthly"]
System = Literal["vedic", "western"]
Calendar = Literal["bs", "gregorian"]
Sign = Literal["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ReadingRequest(StrictModel):
    period: Period = "daily"
    system: System = "vedic"
    calendar: Calendar = "bs"
    date: Date | None = None

    @field_validator("date")
    @classmethod
    def check_date(cls, value):
        if value and not Date(2000, 1, 1) <= value <= Date(2040, 12, 31):
            raise ValueError("Reading dates must be between 2000-01-01 and 2040-12-31 (AD).")
        return value


class UniversalRequest(ReadingRequest):
    sign: Sign | None = None


class BirthDetails(StrictModel):
    local_date: Date
    local_time: time
    timezone: str = Field(default="Asia/Kathmandu", max_length=80)
    latitude: float = Field(ge=-89, le=89)
    longitude: float = Field(ge=-180, le=180)
    fold: Literal[0, 1] | None = None

    @field_validator("local_date")
    @classmethod
    def check_birth_date(cls, value):
        if not Date(1900, 1, 1) <= value <= Date(2100, 12, 31):
            raise ValueError("Birth date must be from 1900 onward (AD).")
        return value

    @field_validator("local_time")
    @classmethod
    def local_only(cls, value):
        if value.tzinfo is not None:
            raise ValueError("Use a local clock time without an offset; supply the IANA timezone separately.")
        return value

    @field_validator("timezone")
    @classmethod
    def check_timezone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Use a valid IANA timezone such as Asia/Kathmandu.") from None
        return value

    @model_validator(mode="after")
    def not_future(self):
        from datetime import datetime
        if self.local_date > datetime.now(ZoneInfo(self.timezone)).date():
            raise ValueError("Birth date cannot be in the future in the birthplace timezone.")
        return self


class PersonalRequest(ReadingRequest):
    consent: Literal[True]
    birth: BirthDetails


class GenerateRequest(StrictModel):
    date: Date | None = None
    days: int = Field(default=2, ge=1, le=3)

    _check_date = field_validator("date")(ReadingRequest.check_date.__func__)


NPT = ZoneInfo("Asia/Kathmandu")


def today_npt() -> date:
    return datetime.now(NPT).date()


def bs_label(day: date) -> str:
    return nd.date.from_datetime_date(day).isoformat()


def period_window(day: date, period: str, calendar: str = "bs") -> dict:
    if period == "daily":
        start, end = day, day + timedelta(days=1)
    elif period == "weekly":
        start = day - timedelta(days=(day.weekday() + 1) % 7)
        end = start + timedelta(days=7)
    elif period == "monthly" and calendar == "bs":
        bs = nd.date.from_datetime_date(day)
        start = nd.date(bs.year, bs.month, 1).to_datetime_date()
        ny, nm = (bs.year + 1, 1) if bs.month == 12 else (bs.year, bs.month + 1)
        end = nd.date(ny, nm, 1).to_datetime_date()
    elif period == "monthly" and calendar == "gregorian":
        start = day.replace(day=1)
        end = date(day.year + 1, 1, 1) if day.month == 12 else date(day.year, day.month + 1, 1)
    else:
        raise ValueError("Unsupported period or calendar")
    # Non-monthly keys are calendar independent.
    mode = calendar if period == "monthly" else "civil"
    return {
        "kind": period, "calendar": mode, "timezone": "Asia/Kathmandu",
        "start_date": start.isoformat(), "end_date_exclusive": end.isoformat(),
        "start_bs": bs_label(start), "last_date_bs": bs_label(end - timedelta(days=1)),
        "starts_at": datetime.combine(start, time.min, NPT).isoformat(),
        "ends_at": datetime.combine(end, time.min, NPT).isoformat(),
        "key": f"{period}:{mode}:{start.isoformat()}",
        "days": (end - start).days,
    }


def sample_instants(window: dict):
    start = date.fromisoformat(window["start_date"])
    for offset in range(window["days"]):
        day = start + timedelta(days=offset)
        # Four midpoint samples of equal six-hour bins, NOT exact ingress times.
        for hour in (3, 9, 15, 21):
            yield datetime.combine(day, time(hour), NPT).astimezone(UTC)


def resolve_birth(birth) -> datetime:
    naive = datetime.combine(birth.local_date, birth.local_time)
    zone = ZoneInfo(birth.timezone)
    candidates = []
    for fold in (0, 1):
        aware = naive.replace(tzinfo=zone, fold=fold)
        utc = aware.astimezone(UTC)
        if utc.astimezone(zone).replace(tzinfo=None) == naive and not any(x[1] == utc for x in candidates):
            candidates.append((fold, utc))
    if not candidates:
        raise ValueError("This birth time did not exist because of a clock change; check the recorded time.")
    if len(candidates) == 2:
        if birth.fold is None:
            raise ValueError("This birth time occurred twice. Set fold=0 for the first occurrence or fold=1 for the second.")
        return next(utc for fold, utc in candidates if fold == birth.fold)
    return candidates[0][1]


LOCK = RLock()  # Swiss Ephemeris has process-global mutable settings.
PLANETS = {"sun": swe.SUN, "moon": swe.MOON, "mars": swe.MARS,
           "mercury": swe.MERCURY, "jupiter": swe.JUPITER, "venus": swe.VENUS,
           "saturn": swe.SATURN, "rahu": swe.MEAN_NODE,
           "uranus": swe.URANUS, "neptune": swe.NEPTUNE, "pluto": swe.PLUTO}
CLASSICAL = ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")


def julian_day(instant: datetime) -> float:
    utc = instant.astimezone(UTC)
    return swe.julday(utc.year, utc.month, utc.day,
                     utc.hour + utc.minute / 60 + (utc.second + utc.microsecond / 1e6) / 3600)


def position(longitude: float, speed: float) -> dict:
    longitude %= 360
    return {"longitude": round(longitude, 7), "sign": int(longitude // 30),
            "nakshatra": int(longitude / (360 / 27)),
            "pada": int((longitude % (360 / 27)) / (360 / 108)) + 1,
            "speed": round(speed, 7), "retrograde": speed < 0}


def compute(instant: datetime, latitude=None, longitude=None) -> dict:
    cfg = settings()
    expected = swe.FLG_MOSEPH if cfg.ephemeris == "moshier" else swe.FLG_SWIEPH
    jd = julian_day(instant)
    result = {"at": instant.astimezone(UTC).isoformat(),
              "provider": f"swisseph-{swe.version}/{cfg.ephemeris}",
              "ayanamsha": "Lahiri", "node": "mean", "sidereal": {}, "tropical": {}}
    with LOCK:
        swe.set_ephe_path(cfg.ephemeris_path)
        swe.set_sid_mode(swe.SIDM_LAHIRI)
        result["ayanamsha_degrees"] = swe.get_ayanamsa_ut(jd)
        for zodiac, extra in (("tropical", 0), ("sidereal", swe.FLG_SIDEREAL)):
            for name, body in PLANETS.items():
                values, flags = swe.calc_ut(jd, body, expected | swe.FLG_SPEED | extra)
                # Mean node is analytic; physical planets must use the requested backend.
                if name != "rahu" and flags & 7 != expected:
                    raise RuntimeError("Requested ephemeris files unavailable; refusing silent backend fallback.")
                result[zodiac][name] = position(values[0], values[3])
            node = result[zodiac]["rahu"]
            result[zodiac]["ketu"] = position(node["longitude"] + 180, node["speed"])
            if latitude is not None and longitude is not None:
                try:
                    _, angles = swe.houses_ex(jd, latitude, longitude, b"W", extra)
                except swe.Error as exc:
                    raise ValueError("Ascendant unavailable for these coordinates and time.") from exc
                result[zodiac]["ascendant"] = position(angles[0], 0)
    return result


@lru_cache(maxsize=4096)
def transit(iso_utc: str) -> dict:
    # ONLY public transit instants are cached; birth data never enters this cache.
    return compute(datetime.fromisoformat(iso_utc))


CATALOG = {'signs': [{'id': 'aries', 'index': 0, 'name_ne': 'मेष', 'name_en': 'Aries', 'symbol': '♈'}, {'id': 'taurus', 'index': 1, 'name_ne': 'वृष', 'name_en': 'Taurus', 'symbol': '♉'}, {'id': 'gemini', 'index': 2, 'name_ne': 'मिथुन', 'name_en': 'Gemini', 'symbol': '♊'}, {'id': 'cancer', 'index': 3, 'name_ne': 'कर्कट', 'name_en': 'Cancer', 'symbol': '♋'}, {'id': 'leo', 'index': 4, 'name_ne': 'सिंह', 'name_en': 'Leo', 'symbol': '♌'}, {'id': 'virgo', 'index': 5, 'name_ne': 'कन्या', 'name_en': 'Virgo', 'symbol': '♍'}, {'id': 'libra', 'index': 6, 'name_ne': 'तुला', 'name_en': 'Libra', 'symbol': '♎'}, {'id': 'scorpio', 'index': 7, 'name_ne': 'वृश्चिक', 'name_en': 'Scorpio', 'symbol': '♏'}, {'id': 'sagittarius', 'index': 8, 'name_ne': 'धनु', 'name_en': 'Sagittarius', 'symbol': '♐'}, {'id': 'capricorn', 'index': 9, 'name_ne': 'मकर', 'name_en': 'Capricorn', 'symbol': '♑'}, {'id': 'aquarius', 'index': 10, 'name_ne': 'कुम्भ', 'name_en': 'Aquarius', 'symbol': '♒'}, {'id': 'pisces', 'index': 11, 'name_ne': 'मीन', 'name_en': 'Pisces', 'symbol': '♓'}], 'nakshatras_ne': ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वाफाल्गुनी', 'उत्तराफाल्गुनी', 'हस्त', 'चित्रा', 'स्वाती', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढा', 'उत्तराषाढा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वाभाद्रपदा', 'उत्तराभाद्रपदा', 'रेवती'], 'planets_ne': {'sun': 'सूर्य', 'moon': 'चन्द्र', 'mars': 'मङ्गल', 'mercury': 'बुध', 'jupiter': 'बृहस्पति', 'venus': 'शुक्र', 'saturn': 'शनि', 'rahu': 'राहु', 'ketu': 'केतु', 'ascendant': 'लग्न'}}
RULES = {'version': 'miti-traditional-editorial-1', 'review_status': 'draft_for_astrologer_review', 'vedha': {'sun': {'3': 9, '6': 12, '10': 4, '11': 5}, 'moon': {'1': 5, '3': 9, '6': 12, '7': 2, '10': 4, '11': 8}, 'mars': {'3': 12, '6': 9, '11': 5}, 'mercury': {'2': 5, '4': 3, '6': 9, '8': 1, '10': 8, '11': 12}, 'jupiter': {'2': 12, '5': 4, '7': 3, '9': 10, '11': 8}, 'venus': {'1': 8, '2': 7, '3': 1, '4': 10, '5': 9, '8': 5, '9': 11, '11': 6, '12': 3}, 'saturn': {'3': 12, '6': 9, '11': 5}}, 'vedha_exemptions': [['sun', 'saturn'], ['moon', 'mercury']], 'node_vedha_enabled': False, 'chandra': {'supportive': [1, 3, 6, 7, 10, 11], 'reflective': [4, 8, 12]}, 'tara_names': ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Sadhana', 'Naidhana', 'Mitra', 'Parama Mitra'], 'tara_scores': [50, 87.5, 12.5, 75, 25, 100, 0, 87.5, 100], 'weights': {'chandra': 0.2, 'tara': 0.25, 'gochar': 0.2, 'ashtakavarga': 0.2, 'dasha': 0.15}, 'domain_planets': {'work': ['sun', 'mercury', 'saturn'], 'resources': ['jupiter', 'venus', 'mercury'], 'relationships': ['venus', 'moon', 'jupiter'], 'wellbeing': ['sun', 'moon', 'mars'], 'learning': ['mercury', 'jupiter']}, 'aspects': {'conjunction': {'angle': 0, 'orb': 3, 'score': 50}, 'sextile': {'angle': 60, 'orb': 2, 'score': 75}, 'square': {'angle': 90, 'orb': 3, 'score': 35}, 'trine': {'angle': 120, 'orb': 3, 'score': 75}, 'opposition': {'angle': 180, 'orb': 3, 'score': 35}}, 'dasha_year_days': 365.25}
BAV = {'version': 'bav-unreduced-1', 'source': 'https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/const.py', 'method': 'Unreduced BAV; SAV excludes Lagna target row; eight source contributors include Lagna.', 'expected_totals': {'sun': 48, 'moon': 49, 'mars': 39, 'mercury': 54, 'jupiter': 56, 'venus': 52, 'saturn': 39}, 'tables': {'sun': {'sun': [1, 2, 4, 7, 8, 9, 10, 11], 'moon': [3, 6, 10, 11], 'mars': [1, 2, 4, 7, 8, 9, 10, 11], 'mercury': [3, 5, 6, 9, 10, 11, 12], 'jupiter': [5, 6, 9, 11], 'venus': [6, 7, 12], 'saturn': [1, 2, 4, 7, 8, 9, 10, 11], 'ascendant': [3, 4, 6, 10, 11, 12]}, 'moon': {'sun': [3, 6, 7, 8, 10, 11], 'moon': [1, 3, 6, 7, 9, 10, 11], 'mars': [2, 3, 5, 6, 10, 11], 'mercury': [1, 3, 4, 5, 7, 8, 10, 11], 'jupiter': [1, 2, 4, 7, 8, 10, 11], 'venus': [3, 4, 5, 7, 9, 10, 11], 'saturn': [3, 5, 6, 11], 'ascendant': [3, 6, 10, 11]}, 'mars': {'sun': [3, 5, 6, 10, 11], 'moon': [3, 6, 11], 'mars': [1, 2, 4, 7, 8, 10, 11], 'mercury': [3, 5, 6, 11], 'jupiter': [6, 10, 11, 12], 'venus': [6, 8, 11, 12], 'saturn': [1, 4, 7, 8, 9, 10, 11], 'ascendant': [1, 3, 6, 10, 11]}, 'mercury': {'sun': [5, 6, 9, 11, 12], 'moon': [2, 4, 6, 8, 10, 11], 'mars': [1, 2, 4, 7, 8, 9, 10, 11], 'mercury': [1, 3, 5, 6, 9, 10, 11, 12], 'jupiter': [6, 8, 11, 12], 'venus': [1, 2, 3, 4, 5, 8, 9, 11], 'saturn': [1, 2, 4, 7, 8, 9, 10, 11], 'ascendant': [1, 2, 4, 6, 8, 10, 11]}, 'jupiter': {'sun': [1, 2, 3, 4, 7, 8, 9, 10, 11], 'moon': [2, 5, 7, 9, 11], 'mars': [1, 2, 4, 7, 8, 10, 11], 'mercury': [1, 2, 4, 5, 6, 9, 10, 11], 'jupiter': [1, 2, 3, 4, 7, 8, 10, 11], 'venus': [2, 5, 6, 9, 10, 11], 'saturn': [3, 5, 6, 12], 'ascendant': [1, 2, 4, 5, 6, 7, 9, 10, 11]}, 'venus': {'sun': [8, 11, 12], 'moon': [1, 2, 3, 4, 5, 8, 9, 11, 12], 'mars': [3, 4, 6, 9, 11, 12], 'mercury': [3, 5, 6, 9, 11], 'jupiter': [5, 8, 9, 10, 11], 'venus': [1, 2, 3, 4, 5, 8, 9, 10, 11], 'saturn': [3, 4, 5, 8, 9, 10, 11], 'ascendant': [1, 2, 3, 4, 5, 8, 9, 11]}, 'saturn': {'sun': [1, 2, 4, 7, 8, 10, 11], 'moon': [3, 6, 11], 'mars': [3, 5, 6, 10, 11, 12], 'mercury': [6, 8, 9, 10, 11, 12], 'jupiter': [5, 6, 11, 12], 'venus': [6, 11, 12], 'saturn': [3, 5, 6, 11], 'ascendant': [1, 3, 4, 6, 10, 11]}}}
DATA_HASH = '534e7cd9158868d2'
DASHA = ("ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury")
YEARS = dict(zip(DASHA, (7, 20, 6, 10, 7, 18, 16, 19, 17)))


def house(natal_sign: int, transit_sign: int) -> int:
    return (transit_sign - natal_sign) % 12 + 1


def chandra_bala(natal_sign: int, transit_sign: int) -> dict:
    h = house(natal_sign, transit_sign)
    score = 100 if h in RULES["chandra"]["supportive"] else 0 if h in RULES["chandra"]["reflective"] else 50
    return {"house": h, "score": score}


def tara_bala(natal_star: int, transit_star: int) -> dict:
    count = (transit_star - natal_star) % 27 + 1
    index = (count - 1) % 9
    return {"count": count, "index": index + 1, "paryaya": (count - 1) // 9 + 1,
            "name": RULES["tara_names"][index], "score": RULES["tara_scores"][index]}


def exempt(a, b):
    return a == b or any({a, b} == set(pair) for pair in RULES["vedha_exemptions"])


def gochar(natal_sign: int, positions: dict) -> dict:
    houses = {p: house(natal_sign, positions[p]["sign"]) for p in CLASSICAL}
    result = {}
    for planet, mapping in RULES["vedha"].items():
        h = houses[planet]
        block_house = mapping.get(str(h))
        blockers = [p for p, ph in houses.items() if ph == block_house and not exempt(planet, p)] if block_house else []
        reverse_houses = [int(good) for good, bad in mapping.items() if bad == h]
        reverse = [p for p, ph in houses.items() if ph in reverse_houses and not exempt(planet, p)] if block_house is None else []
        # A blocked benefit or reverse obstruction is neutral, never another guaranteed benefit.
        score = (50 if blockers else 100) if block_house is not None else (50 if reverse else 25)
        result[planet] = {"house": h, "favorable": block_house is not None,
                          "vedha_house": block_house, "blockers": blockers,
                          "vipreet_blockers": reverse, "score": score}
    return result


def ashtakavarga(natal: dict) -> dict:
    rows = {}
    for target, contributors in BAV["tables"].items():
        row = [0] * 12
        for source, offsets in contributors.items():
            for offset in offsets:
                row[(natal[source]["sign"] + offset - 1) % 12] += 1
        if sum(row) != BAV["expected_totals"][target]:
            raise RuntimeError("Ashtakavarga rule table failed its invariant.")
        rows[target] = row
    sav = [sum(row[i] for row in rows.values()) for i in range(12)]
    assert sum(sav) == 337
    return {"method": "unreduced", "bav": rows, "sav": sav, "total": sum(sav)}


def vimshottari(birth: datetime, natal_moon_longitude: float, at: datetime) -> dict:
    if at < birth:
        raise ValueError("The selected period includes time before birth.")
    star_float = (natal_moon_longitude % 360) / (360 / 27)
    first = int(star_float) % 9
    fraction = star_float % 1
    year_days = RULES["dasha_year_days"]
    start = birth - timedelta(days=fraction * YEARS[DASHA[first]] * year_days)
    for step in range(27):  # Covers three 120-year cycles; supported births need fewer.
        lord = DASHA[(first + step) % 9]
        end = start + timedelta(days=YEARS[lord] * year_days)
        if start <= at < end:
            ant_start = start
            base = DASHA.index(lord)
            for sub in range(9):
                ant = DASHA[(base + sub) % 9]
                ant_end = end if sub == 8 else ant_start + (end - start) * (YEARS[ant] / 120)
                if ant_start <= at < ant_end:
                    return {"maha": lord, "antar": ant, "maha_start": start.isoformat(),
                            "maha_end": end.isoformat(), "antar_start": ant_start.isoformat(),
                            "antar_end": ant_end.isoformat(), "year_days": year_days}
                ant_start = ant_end
        start = end
    raise ValueError("Dasha date outside supported span")


def vedic_metrics(snapshot: dict, sign: int, natal=None, av=None, birth=None, at=None):
    pos = snapshot["sidereal"]
    chandra = chandra_bala(sign, pos["moon"]["sign"])
    transits = gochar(sign, pos)
    common = {"chandra": chandra["score"]}
    detail = {"chandra": chandra, "gochar": transits}
    if natal is not None:
        tara = tara_bala(natal["moon"]["nakshatra"], pos["moon"]["nakshatra"])
        dasha = vimshottari(birth, natal["moon"]["longitude"], at)
        common["tara"] = tara["score"]
        detail.update(tara=tara, dasha=dasha)
        detail["ashtakavarga"] = {p: {"bav": av["bav"][p][pos[p]["sign"]],
                                      "sav": av["sav"][pos[p]["sign"]]} for p in CLASSICAL}
    domains = {}
    contributions = {}
    for domain, planets in RULES["domain_planets"].items():
        parts = dict(common)
        parts["gochar"] = sum(transits[p]["score"] for p in planets) / len(planets)
        if natal is not None:
            # Blend normalized BAV and SAV; scoring is editorial, not an outcome probability.
            av_scores = [0.5 * av["bav"][p][pos[p]["sign"]] / 8 * 100 +
                         0.5 * av["sav"][pos[p]["sign"]] / 56 * 100 for p in planets]
            parts["ashtakavarga"] = sum(av_scores) / len(av_scores)
            def lord_score(lord):
                # Nodes have no BAV or verified Vedha table in this rule pack: neutral, explicit.
                return transits[lord]["score"] if lord in transits else 50
            parts["dasha"] = 0.6 * lord_score(dasha["maha"]) + 0.4 * lord_score(dasha["antar"])
        weights = {key: RULES["weights"][key] for key in parts}
        total = sum(weights.values())
        contributions[domain] = {k: {"score": round(v, 2), "weight": round(weights[k] / total, 4)} for k, v in parts.items()}
        domains[domain] = round(sum(parts[k] * weights[k] for k in parts) / total, 2)
    return {"domains": domains, "overall": round(sum(domains.values()) / len(domains), 2),
            "layers": detail, "contributions": contributions}


def angular_distance(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def western_aspects(transiting: dict, natal: dict) -> list:
    result = []
    planets = [p for p in transiting if p not in ("rahu", "ketu", "ascendant")]
    for p in planets:
        for q, n in natal.items():
            if q in ("rahu", "ketu"):
                continue
            distance = angular_distance(transiting[p]["longitude"], n["longitude"])
            for name, config in RULES["aspects"].items():
                orb = abs(distance - config["angle"])
                if orb <= config["orb"]:
                    future = angular_distance(transiting[p]["longitude"] + transiting[p]["speed"] / 24,
                                              n["longitude"])
                    next_orb = abs(future - config["angle"])
                    result.append({"transit": p, "natal": q, "aspect": name,
                                   "orb": round(orb, 4), "strength": round(1 - orb / config["orb"], 4),
                                   "motion": "exact" if orb < 0.0001 else "applying" if next_orb < orb else "separating",
                                   "score": config["score"]})
    return sorted(result, key=lambda a: a["orb"])


def western_metrics(snapshot, sign, natal=None):
    pos = snapshot["tropical"]
    domains = {}
    if natal is None:
        # Sign-only solar whole-sign houses: NO invented natal Sun degree or natal aspects.
        domain_houses = {"work": [6, 10, 11], "resources": [2, 8, 11], "relationships": [5, 7, 11],
                         "wellbeing": [1, 4, 6], "learning": [3, 5, 9]}
        houses = {p: house(sign, pos[p]["sign"]) for p in CLASSICAL}
        for domain, planets in RULES["domain_planets"].items():
            domains[domain] = round(sum(70 if houses[p] in domain_houses[domain] else 50 for p in planets) / len(planets), 2)
        layers = {"solar_houses": houses, "method": "solar-whole-sign-editorial"}
    else:
        aspects = western_aspects(pos, natal)
        for domain, planets in RULES["domain_planets"].items():
            relevant = [a for a in aspects if a["natal"] in planets or a["transit"] in planets]
            denominator = sum(a["strength"] for a in relevant)
            domains[domain] = round(sum(a["score"] * a["strength"] for a in relevant) / denominator, 2) if denominator else 50
        layers = {"aspects": aspects, "method": "transit-to-natal-tropical"}
    return {"domains": domains, "overall": round(sum(domains.values()) / len(domains), 2), "layers": layers}


"""Original, deterministic Nepali/English editorial copy; no paid model required."""


COPY = {'ne': {'domains': {'work': {'supportive': ['प्राथमिकताको एउटा काम अघि बढाउन समय छुट्याउनुहोस्। स्पष्ट तयारीसहित गरेको कुराकानी उपयोगी हुन सक्छ।', 'आफ्नो काम देखिने गरी प्रगति टिपोट गर्नुहोस्। सहयोग चाहिने ठाउँमा ठोस अनुरोध राख्नुहोस्।'], 'balanced': ['नयाँ जिम्मेवारी लिनुअघि बाँकी काम र उपलब्ध समय मिलाउनुहोस्। सानो तर पूरा हुने लक्ष्य रोज्नुहोस्।', 'कामको गति स्थिर राख्नुहोस्। सहमत भएका कुरा छोटो लिखित टिपोटमा राख्दा अस्पष्टता कम हुन्छ।'], 'reflective': ['कामलाई साना चरणमा बाँड्नुहोस्। दबाबमा ठूलो वाचा गर्नुभन्दा समय र स्रोत फेरि जाँच्नुहोस्।', 'ढिलाइ भए योजनामा केही खाली समय राख्नुहोस्। प्रतिक्रिया दिनुअघि तथ्य र अपेक्षा स्पष्ट गर्नुहोस्।']}, 'resources': {'supportive': ['आम्दानी, खर्च र बाँकी दायित्व एकै ठाउँमा हेर्नुहोस्। बचतको सानो बानीलाई निरन्तरता दिने योजना बनाउनुहोस्।', 'रोकिएका हिसाब मिलाउने र आवश्यक खर्चको सूची बनाउने समय निकाल्नुहोस्। कुनै अवसरको सर्त पढेर मात्रै निर्णय गर्नुहोस्।'], 'balanced': ['खर्चको सीमा तय गरेर आवश्यक र वैकल्पिक कुरा छुट्याउनुहोस्। अनुमानभन्दा वास्तविक हिसाबलाई आधार बनाउनुहोस्।', 'साझा खर्च वा लेनदेनमा रकम र समय स्पष्ट राख्नुहोस्। राशिफललाई आर्थिक निर्णयको आधार नबनाउनुहोस्।'], 'reflective': ['हतारको खरिद अघि केही समय पर्खेर आवश्यकता जाँच्नुहोस्। सानो नियमित खर्च पनि जोडेर हेर्नुहोस्।', 'पैसासँग सम्बन्धित वाचा स्वीकार्नुअघि बजेट जाँच्नुहोस्। अस्पष्ट शुल्क वा सर्त भए पहिले बुझ्नुहोस्।']}, 'relationships': {'supportive': ['कसैको कुरा बीचमा नरोकी सुन्ने समय निकाल्नुहोस्। प्रशंसा गर्दा त्यसको ठोस कारण पनि भन्नुहोस्।', 'साझा योजनामा दुवै पक्षको अपेक्षा सोध्नुहोस्। सानो सहयोग र नियमित संवादलाई स्थान दिनुहोस्।'], 'balanced': ['आफ्नो आवश्यकता सरल भाषामा भन्नुहोस्। अर्काको मौनतालाई अर्थ लगाउनुभन्दा सोधेर बुझ्नुहोस्।', 'काम र व्यक्तिगत समयबीच सीमा मिलाउनुहोस्। असहमति भए विषयमा केन्द्रित भएर कुरा गर्नुहोस्।'], 'reflective': ['संवेदनशील कुराकानीका लागि शान्त समय रोज्नुहोस्। मनमा आएको अनुमानलाई तथ्य ठानेर प्रतिक्रिया नदिनुहोस्।', 'मतभेद हुँदा केही समय लिएर फेरि संवाद गर्नुहोस्। व्यक्तिभन्दा समाधान गर्नुपर्ने विषयमा ध्यान दिनुहोस्।']}, 'wellbeing': {'supportive': ['आफ्नो दिनचर्यामा आराम, पानी र सहज हिँडडुलको समय राख्नुहोस्। आफ्नो क्षमताअनुसार कामको गति मिलाउनुहोस्।', 'ऊर्जा राम्रो लागेको बेला पनि विश्रामको समय छोड्नुहोस्। सुत्ने र उठ्ने समय नियमित राख्ने प्रयास गर्नुहोस्।'], 'balanced': ['शरीरले दिएको संकेत र दैनिक थकानलाई ध्यान दिनुहोस्। कामबीच छोटो विश्रामलाई दिनचर्याको भाग बनाउनुहोस्।', 'आराम र गतिविधिको सन्तुलन हेर्नुहोस्। स्वास्थ्यसम्बन्धी चिन्ता भए योग्य स्वास्थ्यकर्मीको सल्लाह लिनुहोस्।'], 'reflective': ['व्यस्ततालाई घटाएर आवश्यक काम पहिले गर्नुहोस्। थकान वा असहजता भए त्यसलाई राशिफलसँग जोडेर बेवास्ता नगर्नुहोस्।', 'आफ्नो सीमालाई सम्मान गर्दै दिनको गति मिलाउनुहोस्। निरन्तर समस्या भए स्वास्थ्यकर्मीसँग कुरा गर्नुहोस्।']}, 'learning': {'supportive': ['जानेको कुरा आफ्नै शब्दमा लेखेर वा अरूलाई बुझाएर अभ्यास गर्नुहोस्। सिकाइलाई एउटा सानो प्रयोगसँग जोड्नुहोस्।', 'बाँकी रहेको प्रश्नको सूची बनाउनुहोस्। प्रतिक्रिया लिएर आफ्नो बुझाइ जाँच्ने अवसर खोज्नुहोस्।'], 'balanced': ['एउटा विषय छानेर छोटो तर नियमित अभ्यास गर्नुहोस्। पढेको कुराको सार आफैँलाई सम्झाएर हेर्नुहोस्।', 'धेरै नयाँ सामग्री थप्नुअघि पुरानो नोट दोहोर्\u200dयाउनुहोस्। स्पष्ट नभएको कुरा अलग टिप्नुहोस्।'], 'reflective': ['अलमल भए विषयलाई आधारभूत चरणबाट दोहोर्\u200dयाउनुहोस्। तुलना गर्नुभन्दा आफ्नो अभ्यासको निरन्तरता हेर्नुहोस्।', 'एकै पटक धेरै विषय समात्नुभन्दा एउटा जिज्ञासाबाट सुरु गर्नुहोस्। गल्तीलाई सुधारको संकेतका रूपमा टिप्नुहोस्।']}}, 'labels': {'work': 'काम', 'resources': 'स्रोत र खर्च', 'relationships': 'सम्बन्ध', 'wellbeing': 'दैनिक सन्तुलन', 'learning': 'सिकाइ'}, 'period': {'daily': 'आजका गणना गरिएका चार समयबिन्दुको आधारमा यो सामान्य चिन्तन तयार गरिएको हो।', 'weekly': 'यो साप्ताहिक पाठमा आइतबारदेखि शनिबारसम्मका दैनिक संकेतको औसत समेटिएको छ।', 'monthly': 'यो मासिक पाठ चयन गरिएको पूरा महिनाका दैनिक संकेतमा आधारित छ।'}, 'summary': 'यस अवधिमा {focus} तर्फ ध्यान दिन र {care} मा आफ्नो वास्तविक अवस्था हेरेर गति मिलाउन सक्नुहुन्छ।', 'note': 'यो परम्परागत ज्योतिषमा आधारित स्वचालित व्याख्या हो। अङ्कहरू सम्पादकीय सूचक हुन्, घटना हुने सम्भावना वा प्रमाणित भविष्यवाणी होइनन्।'}, 'en': {'domains': {'work': {'supportive': ['Set aside time to advance one priority. Prepare a clear request before seeking support.', 'Make progress visible with a short update. State the decision or assistance you need.'], 'balanced': ['Check unfinished tasks and available time before accepting a commitment. Choose a small, finishable goal.', 'Keep a steady pace. Record agreements briefly so expectations remain clear.'], 'reflective': ['Divide work into smaller stages. Recheck time and resources before making a large promise under pressure.', 'Allow a buffer for delays. Clarify facts and expectations before responding to tension.']}, 'resources': {'supportive': ['Review income, expenses and obligations together. Plan a small savings habit you can maintain.', 'Reconcile outstanding records and list essential spending. Read the terms before judging an opportunity.'], 'balanced': ['Set a spending limit and separate needs from optional purchases. Use actual figures rather than estimates.', 'Clarify amounts and dates for shared expenses. Do not use a horoscope as the basis for financial decisions.'], 'reflective': ['Pause before an impulsive purchase and reassess the need. Add up small recurring expenses.', 'Check your budget before accepting a financial commitment. Ask about unclear fees and conditions.']}, 'relationships': {'supportive': ['Make time to listen without interrupting. Be specific about what you appreciate.', 'Ask about each person’s expectations for a shared plan. Give regular conversation and small acts of help some space.'], 'balanced': ['Express your needs plainly. Ask what someone means instead of interpreting silence.', 'Agree on boundaries between work and personal time. Keep disagreements focused on the issue.'], 'reflective': ['Choose a calm moment for a sensitive conversation. Separate assumptions from observed facts.', 'Take a pause when a disagreement escalates, then return to the conversation. Focus on the issue that needs a solution.']}, 'wellbeing': {'supportive': ['Make room for rest, water and comfortable movement. Adjust your pace to your actual capacity.', 'Even on energetic days, preserve time for rest. Aim for a consistent sleep routine.'], 'balanced': ['Notice fatigue and your body’s signals. Include short breaks in your routine.', 'Review the balance of activity and rest. Discuss health concerns with a qualified clinician.'], 'reflective': ['Reduce overload and focus on essentials. Do not dismiss fatigue or symptoms because of a horoscope.', 'Respect your limits and adjust the pace of the day. Persistent concerns deserve professional care.']}, 'learning': {'supportive': ['Explain a concept in your own words and connect it to a small experiment.', 'List unresolved questions. Seek feedback that can test your understanding.'], 'balanced': ['Choose one subject for brief, regular practice. Try recalling its main idea without looking at notes.', 'Review existing notes before adding more material. Record what remains unclear.'], 'reflective': ['Return to the basic steps when a subject feels confusing. Focus on consistent practice rather than comparison.', 'Start with one question instead of many topics. Treat mistakes as useful feedback for revision.']}}, 'labels': {'work': 'Work', 'resources': 'Resources', 'relationships': 'Relationships', 'wellbeing': 'Daily balance', 'learning': 'Learning'}, 'period': {'daily': 'This reflection uses four calculated sample times across the Nepal civil day.', 'weekly': 'This weekly reflection combines daily indicators from Sunday through Saturday.', 'monthly': 'This monthly reflection combines daily indicators across the selected calendar month.'}, 'summary': 'Consider giving attention to {focus}, while adjusting your pace in {care} to your actual circumstances.', 'note': 'Automatically written from traditional astrology rules. Scores are editorial indices, not event probabilities or scientifically validated predictions.'}}


def band(score):
    return "supportive" if score >= 65 else "reflective" if score < 40 else "balanced"


def narrative(scores, key, window, timeline):
    result = {}
    for lang in ("ne", "en"):
        sections = []
        for domain, score in scores.items():
            choices = COPY[lang]["domains"][domain][band(score)]
            number = int(hashlib.sha256(f"{key}:{domain}".encode()).hexdigest()[:8], 16)
            sections.append({"domain": domain, "title": COPY[lang]["labels"][domain],
                             "text": choices[number % len(choices)], "band": band(score)})
        strongest = max(scores, key=scores.get)
        careful = min(scores, key=scores.get)
        result[lang] = {
            "summary": COPY[lang]["period"][window["kind"]] + " " +
                       COPY[lang]["summary"].format(focus=COPY[lang]["labels"][strongest],
                                                     care=COPY[lang]["labels"][careful]),
            "sections": sections,
            "note": COPY[lang]["note"],
        }
    return result


def engine_version():
    cfg = settings()
    return f"{__version__}-{DATA_HASH}-{cfg.ephemeris}-{cfg.build_id}"


def public_key(request):
    window = period_window(request.date or today_npt(), request.period, request.calendar)
    key = f"{engine_version()}:{request.system}:{window['key']}"
    return hashlib.sha256(key.encode()).hexdigest()


def metadata():
    return {"engine_version": engine_version(), "signs": CATALOG["signs"],
            "nakshatras_ne": CATALOG["nakshatras_ne"], "today": today_npt().isoformat(),
            "timezone": "Asia/Kathmandu", "supported_reading_dates": ["2000-01-01", "2040-12-31"],
            "rule_review_status": RULES["review_status"], "weekly_start": "Sunday",
            "default_month": "Bikram Sambat", "ephemeris": settings().ephemeris,
            "sample_hours_npt": [3, 9, 15, 21]}


def reading(request, sign_index=None, birth=None, prepared=None):
    window = period_window(request.date or today_npt(), request.period, request.calendar)
    natal_chart = None
    natal = None
    av = None
    birth_instant = None
    if birth:
        birth_instant = resolve_birth(birth)
        if datetime.fromisoformat(window["starts_at"]) < birth_instant:
            raise ValueError("Choose a period beginning after birth. Use universal mode for the birth period.")
        natal_chart = compute(birth_instant, birth.latitude, birth.longitude)
        natal = natal_chart["sidereal" if request.system == "vedic" else "tropical"]
        sign_index = natal["moon" if request.system == "vedic" else "sun"]["sign"]
        if request.system == "vedic":
            av = ashtakavarga(natal)
    if sign_index is None:
        raise ValueError("A sign or exact birth details are required.")
    sign = CATALOG["signs"][sign_index]
    instants = list(sample_instants(window))
    snapshots = prepared or [transit(t.isoformat()) for t in instants]
    series = []
    details = []
    for instant, snapshot in zip(instants, snapshots):
        metrics = vedic_metrics(snapshot, sign_index, natal, av, birth_instant, instant) if request.system == "vedic" else western_metrics(snapshot, sign_index, natal)
        series.append({"date": instant.astimezone(NPT).date().isoformat(), **metrics})
        details.append({"at": instant.isoformat(), "layers": metrics["layers"],
                        "contributions": metrics.get("contributions")})
    groups = defaultdict(list)
    for point in series:
        groups[point["date"]].append(point)
    timeline = []
    for day, points in groups.items():
        timeline.append({"date": day, "overall": round(sum(p["overall"] for p in points) / len(points), 1),
                         "domains": {k: round(sum(p["domains"][k] for p in points) / len(points), 1)
                                     for k in RULES["domain_planets"]}})
    scores = {k: round(sum(p["domains"][k] for p in series) / len(series), 1) for k in RULES["domain_planets"]}
    overall = round(sum(scores.values()) / len(scores), 1)
    key = f"{engine_version()}:{request.system}:{window['key']}:{sign['id']}"
    # Private identity is deliberately not a hash of the birth details.
    result = {"id": hashlib.sha256(key.encode()).hexdigest()[:24] if not birth else None,
              "engine_version": engine_version(), "mode": "personalized" if birth else "universal",
              "system": request.system, "sign": sign, "window": window,
              "scores": {"overall": overall, "domains": scores, "meaning": "editorial_index_not_probability"},
              "timeline": timeline, "narrative": narrative(scores, key, window, timeline),
              "method": {"ephemeris": snapshots[0]["provider"], "ayanamsha": "Lahiri" if request.system == "vedic" else None,
                         "anchor": "natal_moon" if request.system == "vedic" else "natal_sun" if birth else "selected_sun_sign",
                         "sampling": "4 equal six-hour midpoint samples per Nepal civil day",
                         "sample_count": len(series), "rule_review_status": RULES["review_status"],
                         "not_implemented": ["Shadbala", "rectification", "divisional charts", "exact muhurta", "node Vedha"],
                         "missing_layers": [] if birth else ["natal chart", "Tara Bala", "Ashtakavarga", "Dasha", "natal aspects"]},
              "evidence": {"first_sample": details[0], "last_sample": details[-1]},
              "generated_at": datetime.now(UTC).isoformat()}
    if birth:
        # Derived chart is returned only in a no-store response and never persisted.
        result["natal"] = {"positions": natal, "ashtakavarga": av, "house_system": "whole-sign",
                           "moon_nakshatra_ne": CATALOG["nakshatras_ne"][natal["moon"]["nakshatra"]] if request.system == "vedic" else None}
        # Distinct layer states across the sampled period (incl. Dasha transitions).
        result["evidence"]["sampled_changes"] = [d for i, d in enumerate(details)
            if i == 0 or d["layers"] != details[i-1]["layers"]]
    else:
        # No fake personal layers when only a sign is selected.
        result["method"]["anchor"] = "selected_moon_sign" if request.system == "vedic" else "selected_sun_sign"
    return result


def universal_batch(request):
    window = period_window(request.date or today_npt(), request.period, request.calendar)
    snapshots = [transit(t.isoformat()) for t in sample_instants(window)]
    readings = [reading(request, sign_index=i, prepared=snapshots) for i in range(12)]
    return {"schema_version": "1.0", "engine_version": engine_version(), "window": window,
            "system": request.system, "readings": readings,
            "sky": {"first_sample": snapshots[0], "last_sample": snapshots[-1]},
            "generated_at": datetime.now(UTC).isoformat()}



# ---- Deployment/BFF adapter -------------------------------------------------
BFF_HASH_URL = "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/nepal-miti-protected/api/rashifal/service-token-hash"
HASH_TTL_SECONDS = 300
_hash_lock = Lock()
_hash_cache = {"value": "", "expires": 0.0}
_limits = OrderedDict()
_limit_lock = Lock()

app = FastAPI(title="Nepal Miti Rashifal Calculation Engine", version="1.0.0", docs_url=None, redoc_url=None, openapi_url=None)

def _expected_hash() -> str:
    now = _time_module.monotonic()
    with _hash_lock:
        if _hash_cache["value"] and _hash_cache["expires"] > now:
            return _hash_cache["value"]
    request = urllib.request.Request(BFF_HASH_URL, headers={"User-Agent": "Nepal-Miti-Rashifal/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            value = response.read(256).decode("ascii").strip()
    except Exception as exc:
        raise HTTPException(503, "Service authentication unavailable") from exc
    if len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
        raise HTTPException(503, "Service authentication unavailable")
    with _hash_lock:
        _hash_cache["value"] = value
        _hash_cache["expires"] = now + HASH_TTL_SECONDS
    return value

def _authorize(authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Unauthorized")
    token = authorization[7:]
    if len(token) < 32:
        raise HTTPException(401, "Unauthorized")
    actual = hashlib.sha256(token.encode()).hexdigest()
    if not hmac.compare_digest(actual, _expected_hash()):
        raise HTTPException(401, "Unauthorized")

def _personal_limit(key: str | None) -> None:
    opaque = (key or "unidentified")[:128]
    now = _time_module.monotonic()
    with _limit_lock:
        start, count = _limits.pop(opaque, (now, 0))
        if now - start >= 60:
            start, count = now, 0
        if count >= 60:
            _limits[opaque] = (start, count)
            raise HTTPException(429, "Too many requests. Try again in one minute.", headers={"Retry-After": "60"})
        _limits[opaque] = (start, count + 1)
        while len(_limits) > 10000:
            _limits.popitem(last=False)

def _universal_from_query(request: Request) -> UniversalRequest:
    allowed = {"period", "system", "calendar", "date"}
    data = {}
    for key, value in request.query_params.multi_items():
        if key in {"op", "sign"}:
            continue
        if key not in allowed or key in data:
            raise HTTPException(400, "Invalid query parameter")
        data[key] = value
    return UniversalRequest.model_validate(data)

@app.middleware("http")
async def bounded_requests(request: Request, call_next):
    raw = request.headers.get("content-length", "0")
    try:
        if int(raw) < 0 or int(raw) > 16384:
            return JSONResponse({"detail": "Request too large"}, status_code=413)
    except ValueError:
        return JSONResponse({"detail": "Invalid content length"}, status_code=400)
    if request.method == "POST":
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 16384:
                return JSONResponse({"detail": "Request too large"}, status_code=413)
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    errors = [{"location": list(x["loc"]), "message": x["msg"]} for x in exc.errors()]
    return JSONResponse({"detail": errors}, status_code=422, headers={"Cache-Control": "no-store"})

@app.exception_handler(ValueError)
async def value_error(request, exc):
    return JSONResponse({"detail": str(exc)}, status_code=422, headers={"Cache-Control": "no-store"})

@app.exception_handler(Exception)
async def internal_error(request, exc):
    return JSONResponse({"detail": "Calculation unavailable. Check service health and ephemeris configuration."}, status_code=503, headers={"Cache-Control": "no-store"})

@app.get("/api/rashifal_engine")
def gateway(request: Request, authorization: str | None = Header(default=None)):
    op = request.query_params.get("op", "health")
    if op == "health":
        # Calling metadata also verifies Moshier/engine configuration is loadable.
        meta = metadata()
        return {"status": "ok", "engine_version": meta["engine_version"], "ephemeris": meta["ephemeris"], "persistence": "supabase-postgresql-bff"}
    _authorize(authorization)
    if op == "metadata":
        return metadata()
    if op == "key":
        req = _universal_from_query(request)
        window = period_window(req.date or today_npt(), req.period, req.calendar)
        return {"key": public_key(req), "window": window, "engine_version": engine_version(), "system": req.system}
    if op == "universal":
        req = _universal_from_query(request)
        return universal_batch(req)
    raise HTTPException(404, "Unknown operation")

@app.post("/api/rashifal_engine")
async def personalized_gateway(request: Request, authorization: str | None = Header(default=None), x_rashifal_client: str | None = Header(default=None)):
    if request.query_params.get("op") != "personalized":
        raise HTTPException(404, "Unknown operation")
    _authorize(authorization)
    _personal_limit(x_rashifal_client)
    req = PersonalRequest.model_validate(await request.json())
    return {"schema_version": "1.0", "readings": [reading(req, birth=req.birth)]}