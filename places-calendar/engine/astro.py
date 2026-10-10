"""
Astronomy core for the Aafnai Patro places engine.

Everything here is computed from first principles with `astronomy-engine`
(pure Python port of Don Cross's Astronomy Engine, accurate to ~1 arcminute),
so no ephemeris files or network access are needed at build time.

Conventions
-----------
* All public functions take / return timezone-aware `datetime` objects.
* Nepal Standard Time is a fixed UTC+05:45 offset (in use since 1986).
* Sidereal positions use the Lahiri (Chitrapaksha) ayanamsa, the standard
  used by Nepal Panchanga Nirnayak Samiti and Indian national calendars.
* Sunrise / sunset are for the upper limb of the Sun with standard
  atmospheric refraction, which is the panchang convention.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone, date
from functools import lru_cache

import astronomy as ae

NPT = timezone(timedelta(hours=5, minutes=45), name="NPT")
UTC = timezone.utc
J2000 = datetime(2000, 1, 1, 12, 0, 0, tzinfo=UTC)

TITHI_DEG = 12.0
NAK_DEG = 360.0 / 27.0


# --------------------------------------------------------------------------
# Time helpers
# --------------------------------------------------------------------------
def to_time(dt: datetime) -> ae.Time:
    """datetime (aware) -> astronomy.Time"""
    if dt.tzinfo is None:
        raise ValueError("naive datetime passed to to_time")
    days = (dt - J2000).total_seconds() / 86400.0
    return ae.Time(days)


def from_time(t: ae.Time, tz=NPT) -> datetime:
    return (J2000 + timedelta(days=t.ut)).astimezone(tz)


def local_midnight(d: date, tz=NPT) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=tz)


# --------------------------------------------------------------------------
# Positions
# --------------------------------------------------------------------------
def ayanamsa_lahiri(dt: datetime) -> float:
    """Lahiri ayanamsa in degrees.

    Uses the IAU-1976-precession based polynomial that reproduces the
    Indian Astronomical Ephemeris value (23d 51' 25.5" at J2000.0) to within
    ~1 arcsecond over 1900-2100.
    """
    t = (dt - J2000).total_seconds() / (86400.0 * 36525.0)  # Julian centuries
    # general precession in longitude (arcsec), Lieske 1977
    p = 5029.0966 * t + 1.11113 * t * t - 0.000006 * t ** 3
    return 23.857092 + p / 3600.0


def sun_tropical(dt: datetime) -> float:
    return ae.SunPosition(to_time(dt)).elon % 360.0


def moon_tropical(dt: datetime) -> float:
    return ae.EclipticGeoMoon(to_time(dt)).lon % 360.0


def sun_sidereal(dt: datetime) -> float:
    return (sun_tropical(dt) - ayanamsa_lahiri(dt)) % 360.0


def moon_sidereal(dt: datetime) -> float:
    return (moon_tropical(dt) - ayanamsa_lahiri(dt)) % 360.0


def elongation(dt: datetime) -> float:
    """Moon minus Sun ecliptic longitude, 0..360 (the 'moon phase angle')."""
    return ae.MoonPhase(to_time(dt)) % 360.0


def illumination(dt: datetime) -> float:
    """Fraction of the Moon's disc that is lit (0..1)."""
    return ae.Illumination(ae.Body.Moon, to_time(dt)).phase_fraction


# --------------------------------------------------------------------------
# Panchang elements at an instant
# --------------------------------------------------------------------------
def tithi_at(dt: datetime) -> int:
    """Absolute tithi number 1..30 (1-15 Shukla, 16-30 Krishna; 15=Purnima, 30=Aunsi)."""
    return int(elongation(dt) // TITHI_DEG) + 1


def nakshatra_at(dt: datetime) -> int:
    """Nakshatra index 1..27 (1 = Ashwini)."""
    return int(moon_sidereal(dt) // NAK_DEG) + 1


def yoga_at(dt: datetime) -> int:
    """Yoga index 1..27 (1 = Vishkambha)."""
    return int(((sun_sidereal(dt) + moon_sidereal(dt)) % 360.0) // NAK_DEG) + 1


def karana_at(dt: datetime) -> int:
    """Karana index 1..60 (half-tithis), mapped to names in panchang.py."""
    return int(elongation(dt) // 6.0) + 1


def rashi_moon_at(dt: datetime) -> int:
    return int(moon_sidereal(dt) // 30.0) + 1


def rashi_sun_at(dt: datetime) -> int:
    return int(sun_sidereal(dt) // 30.0) + 1


# --------------------------------------------------------------------------
# Event searches
# --------------------------------------------------------------------------
def find_phase(target_deg: float, after: datetime, limit_days: float = 32.0) -> datetime:
    """First instant after `after` when elongation == target_deg (mod 360)."""
    t = ae.SearchMoonPhase(target_deg % 360.0, to_time(after), limit_days)
    if t is None:
        raise RuntimeError(f"moon phase {target_deg} not found after {after}")
    return from_time(t)


def tithi_bounds(dt: datetime) -> tuple[int, datetime, datetime]:
    """Tithi current at dt with its start and end instants."""
    n = tithi_at(dt)
    start = find_phase((n - 1) * TITHI_DEG, dt - timedelta(days=1.6), 2.0)
    if start > dt:  # numerical edge
        start = find_phase((n - 1) * TITHI_DEG, dt - timedelta(days=2.5), 3.0)
    end = find_phase(n * TITHI_DEG, start + timedelta(hours=1), 2.0)
    return n, start, end


def _bisect(f, lo: datetime, hi: datetime, steps: int = 40) -> datetime:
    flo = f(lo)
    for _ in range(steps):
        mid = lo + (hi - lo) / 2
        fm = f(mid)
        if (fm >= 0) == (flo >= 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return lo + (hi - lo) / 2


def _angle_diff(a: float, b: float) -> float:
    return (a - b + 540.0) % 360.0 - 180.0


def nakshatra_bounds(dt: datetime) -> tuple[int, datetime, datetime]:
    n = nakshatra_at(dt)
    s_target = (n - 1) * NAK_DEG
    e_target = n * NAK_DEG % 360.0
    f_start = lambda x: _angle_diff(moon_sidereal(x), s_target)
    f_end = lambda x: _angle_diff(moon_sidereal(x), e_target)
    start = _bisect(f_start, dt - timedelta(days=1.3), dt)
    end = _bisect(f_end, dt, dt + timedelta(days=1.3))
    return n, start, end


def sankranti(sign_index_0: int, after: datetime, limit_days: float = 40.0) -> datetime:
    """Instant the Sun enters sidereal sign `sign_index_0` (0=Mesha) after `after`."""
    target = sign_index_0 * 30.0
    f = lambda x: _angle_diff(sun_sidereal(x), target)
    # coarse scan in 1-day steps, then bisect
    t0 = after
    prev = f(t0)
    for _ in range(int(limit_days) + 1):
        t1 = t0 + timedelta(days=1)
        cur = f(t1)
        if prev < 0 <= cur and abs(cur - prev) < 90:
            return _bisect(f, t0, t1)
        t0, prev = t1, cur
    raise RuntimeError(f"sankranti {sign_index_0} not found after {after}")


# --------------------------------------------------------------------------
# Rise / set
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class Observer:
    lat: float
    lon: float
    elev_m: float = 0.0

    def ae(self) -> ae.Observer:
        return ae.Observer(self.lat, self.lon, self.elev_m)


KATHMANDU = Observer(27.7172, 85.3240, 1345)


@lru_cache(maxsize=200_000)
def _riseset(body_name: str, lat: float, lon: float, elev: float, y: int, m: int, d: int, rise: bool):
    body = getattr(ae.Body, body_name)
    obs = ae.Observer(lat, lon, elev)
    start = to_time(local_midnight(date(y, m, d)))
    direction = ae.Direction.Rise if rise else ae.Direction.Set
    t = ae.SearchRiseSet(body, obs, direction, start, 1.0)
    return None if t is None else from_time(t)


def sunrise(obs: Observer, d: date) -> datetime:
    r = _riseset("Sun", obs.lat, obs.lon, obs.elev_m, d.year, d.month, d.day, True)
    if r is None:
        raise RuntimeError("no sunrise")
    return r


def sunset(obs: Observer, d: date) -> datetime:
    r = _riseset("Sun", obs.lat, obs.lon, obs.elev_m, d.year, d.month, d.day, False)
    if r is None:
        raise RuntimeError("no sunset")
    return r


def moonrise(obs: Observer, d: date):
    return _riseset("Moon", obs.lat, obs.lon, obs.elev_m, d.year, d.month, d.day, True)


def moonset(obs: Observer, d: date):
    return _riseset("Moon", obs.lat, obs.lon, obs.elev_m, d.year, d.month, d.day, False)


def solar_noon(obs: Observer, d: date) -> datetime:
    sr, ss = sunrise(obs, d), sunset(obs, d)
    return sr + (ss - sr) / 2


# --------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------
def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def bearing_deg(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def compass(deg: float) -> str:
    pts = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    return pts[int((deg + 11.25) // 22.5) % 16]
