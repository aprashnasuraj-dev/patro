"""
Bikram Sambat helpers: conversion, names and Nepali numerals.

Conversion uses the `nepali-datetime` lookup tables (BS 1975-2100), which
follow the official calendars published by the Nepal Panchanga Nirnayak
Samiti. Outside that range we refuse rather than guess.
"""
from __future__ import annotations

from datetime import date

import nepali_datetime as nd

BS_MIN = (1975, 1, 1)
BS_MAX = (2100, 12, 30)

BS_MONTHS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj",
                "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
BS_MONTHS_NE = ["वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
                "कार्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"]

WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAYS_NE = ["सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार", "आइतबार"]

AD_MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
                "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"]

NE_DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")


def ne_num(x) -> str:
    """Render a number/string with Devanagari digits."""
    return str(x).translate(NE_DIGITS)


def ad_to_bs(d: date) -> tuple[int, int, int]:
    b = nd.date.from_datetime_date(d)
    return b.year, b.month, b.day


def bs_to_ad(y: int, m: int, d: int) -> date:
    return nd.date(y, m, d).to_datetime_date()


def bs_year_range_ad(y: int) -> tuple[date, date]:
    """First and last AD date of BS year y."""
    start = bs_to_ad(y, 1, 1)
    end = bs_to_ad(y + 1, 1, 1) if y < BS_MAX[0] else bs_to_ad(y, 12, 30)
    from datetime import timedelta
    return start, (end - timedelta(days=1)) if y < BS_MAX[0] else end


def days_in_bs_month(y: int, m: int) -> int:
    from datetime import timedelta
    start = bs_to_ad(y, m, 1)
    nxt = bs_to_ad(y + (m == 12), (m % 12) + 1, 1)
    return (nxt - start).days


def fmt_bs(d: date, lang: str = "en", weekday: bool = False) -> str:
    y, m, dd = ad_to_bs(d)
    if lang == "ne":
        s = f"{ne_num(y)} {BS_MONTHS_NE[m-1]} {ne_num(dd)}"
        if weekday:
            s += f", {WEEKDAYS_NE[d.weekday()]}"
        return s
    s = f"{BS_MONTHS_EN[m-1]} {dd}, {y} BS"
    if weekday:
        s = f"{WEEKDAYS_EN[d.weekday()]}, " + s
    return s


def fmt_ad(d: date, lang: str = "en", weekday: bool = False) -> str:
    if lang == "ne":
        s = f"{AD_MONTHS_NE[d.month-1]} {ne_num(d.day)}, {ne_num(d.year)}"
        if weekday:
            s = f"{WEEKDAYS_NE[d.weekday()]}, " + s
        return s
    s = d.strftime("%B ") + str(d.day) + d.strftime(", %Y")
    if weekday:
        s = d.strftime("%A, ") + s
    return s


def fmt_time(dt, lang: str = "en") -> str:
    """12-hour local time, e.g. 6:02 AM / बिहान ६:०२."""
    if dt is None:
        return "—"
    h, m = dt.hour, dt.minute
    if lang == "ne":
        if h < 4:
            part = "राति"
        elif h < 12:
            part = "बिहान"
        elif h < 16:
            part = "दिउँसो"
        elif h < 19:
            part = "साँझ"
        else:
            part = "राति"
        h12 = h % 12 or 12
        return f"{part} {ne_num(h12)}:{ne_num(f'{m:02d}')}"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def fmt_duration(td, lang: str = "en") -> str:
    mins = int(round(td.total_seconds() / 60))
    h, m = divmod(mins, 60)
    if lang == "ne":
        return f"{ne_num(h)} घण्टा {ne_num(m)} मिनेट"
    return f"{h} h {m} min"
