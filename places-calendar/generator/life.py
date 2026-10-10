"""
Life-event pages.

    /janma/                              birth years
    /janma/{year}/                       one BS year, 12 months
    /janma/{year}/{month}/               every day of a birth month: tithi, nakshatra,
                                         moon rashi (with change times), next tithi birthday
    /shraddha/                           all 360 shraddha tithis + Sorha Shraddha
    /shraddha/{month}-{paksha}-{tithi}/  e.g. /shraddha/kartik-krishna-ashtami/
    /shraddha/sorha-shraddha/{year}/     the 16 days of Pitri Paksha

These pages answer the question and hand over to the existing aafnaipatro.com
tools for the personal part: /tools/tithi-reminder (reminders),
/tools/baby-names (namakshar from nakshatra), /rashifal, /tools/janmadin-akhbar,
and each day's /date/ page.
"""
from __future__ import annotations

from datetime import timedelta

from engine import bs, life, lunar, panchang
from . import model as M
from .i18n import T

MONTH_SLUGS = [m.lower() for m in bs.BS_MONTHS_EN]
JANMA_FIRST = 2000
SHRADDHA_YEARS = 11

L = {
    "en": {
        "janma": "Birth dates",
        "shraddha": "Shraddha",
        "janma_index_h1": "Born in which year? Tithi, nakshatra and rashi by birth date",
        "janma_index_intro": "Pick your BS birth year and month to see the tithi, nakshatra and moon sign of every day, and when your tithi birthday falls this year.",
        "janma_year_h1": "Born in {y} BS",
        "janma_year_intro": "{y} BS ran from {a} to {b}. Choose a month to see each day's tithi, nakshatra and rashi.",
        "janma_h1": "Born in {m} {y} BS",
        "janma_sub": "Tithi, nakshatra and rashi for every day",
        "janma_lede": "{m} {y} BS ran from {a} to {b}. Values are taken at Kathmandu sunrise. Where a change time is shown, use the second value if you were born after that time.",
        "nak": "Nakshatra",
        "rashi": "Rashi (moon sign)",
        "tithi": "Tithi",
        "tithi_bday": "Next tithi birthday",
        "until": "until",
        "then": "then",
        "lunar_month": "Lunar month",
        "adhik_note": "Born in an Adhik (extra) month; the tithi birthday is kept in the regular month of the same name.",
        "use_tools": "Next steps",
        "tool_names": "Find a name from the nakshatra",
        "tool_rashi": "Read today's rashifal",
        "tool_reminder": "Get a yearly tithi birthday reminder",
        "tool_card": "Make a birthday card",
        "age_link": "Age of people born in {y}",
        "day_page": "Full panchang for this day",
        "months": "Months",
        "shraddha_index_h1": "Shraddha dates by tithi",
        "shraddha_index_intro": "Annual shraddha is kept on the tithi of death in the same lunar month. Choose the month and tithi to see the dates for the next {n} years.",
        "shraddha_h1": "{name} Shraddha Dates",
        "shraddha_next": "Next: {d}",
        "shraddha_rule": "Dates use the common rule that a shraddha is performed on the day the tithi covers the afternoon (aparahna) in Kathmandu. Some families and purohits follow a different rule; confirm with yours.",
        "shraddha_adhik": "In a year with an Adhik month of the same name, this page gives the regular month.",
        "year_ad": "Date (AD)",
        "date_bs": "Date (BS)",
        "tithi_time": "Tithi runs",
        "sorha": "Sorha Shraddha",
        "sorha_h1": "Sorha Shraddha {y}: Pitri Paksha dates",
        "sorha_intro": "During Pitri Paksha, a shraddha is offered for each ancestor on the tithi on which they died, whatever the month. The 16 days run from Bhadra Purnima to Asoj Krishna Aunsi.",
        "sorha_link": "In Sorha Shraddha {y}, this tithi falls on {d}",
        "day_tithi": "Tithi",
        "other_months": "Same tithi in other months",
        "set_reminder": "Set a reminder for this tithi",
        "shukla": "Shukla paksha",
        "krishna": "Krishna paksha",
    },
    "ne": {
        "janma": "जन्म मिति",
        "shraddha": "श्राद्ध",
        "janma_index_h1": "कुन सालमा जन्म? जन्म मितिअनुसार तिथि, नक्षत्र र राशि",
        "janma_index_intro": "आफ्नो जन्म साल र महिना छान्नुहोस्; हरेक दिनको तिथि, नक्षत्र र चन्द्र राशि, अनि यस वर्ष तिथिअनुसारको जन्मदिन कहिले पर्छ हेर्नुहोस्।",
        "janma_year_h1": "{y} सालमा जन्मेको",
        "janma_year_intro": "वि.सं. {y} {a} देखि {b} सम्म थियो। हरेक दिनको तिथि, नक्षत्र र राशि हेर्न महिना छान्नुहोस्।",
        "janma_h1": "{y} {m}मा जन्मेको",
        "janma_sub": "हरेक दिनको तिथि, नक्षत्र र राशि",
        "janma_lede": "{y} {m} {a} देखि {b} सम्म थियो। मानहरू काठमाडौंको सूर्योदयका हुन्। परिवर्तनको समय देखाइएको भए त्यसपछि जन्मनुभएको हो भने दोस्रो मान लिनुहोस्।",
        "nak": "नक्षत्र",
        "rashi": "राशि (चन्द्र राशि)",
        "tithi": "तिथि",
        "tithi_bday": "अर्को तिथि जन्मदिन",
        "until": "सम्म",
        "then": "त्यसपछि",
        "lunar_month": "चान्द्र महिना",
        "adhik_note": "अधिक (मल) मासमा जन्म; तिथि जन्मदिन सोही नामको सामान्य महिनामा मनाइन्छ।",
        "use_tools": "अब के गर्ने",
        "tool_names": "नक्षत्रअनुसार नाम खोज्नुहोस्",
        "tool_rashi": "आजको राशिफल पढ्नुहोस्",
        "tool_reminder": "हरेक वर्षको तिथि जन्मदिन सम्झाउने रिमाइन्डर राख्नुहोस्",
        "tool_card": "जन्मदिनको कार्ड बनाउनुहोस्",
        "age_link": "{y} सालमा जन्मेकाको उमेर",
        "day_page": "यस दिनको पूरा पात्रो",
        "months": "महिना",
        "shraddha_index_h1": "तिथिअनुसार श्राद्ध मिति",
        "shraddha_index_intro": "वार्षिक श्राद्ध मृत्यु भएको चान्द्र महिनाको सोही तिथिमा गरिन्छ। आगामी {n} वर्षका मिति हेर्न महिना र तिथि छान्नुहोस्।",
        "shraddha_h1": "{name}को श्राद्ध कहिले?",
        "shraddha_next": "अर्को: {d}",
        "shraddha_rule": "मिति काठमाडौंमा अपराह्न (दिउँसो) व्यापी तिथिमा श्राद्ध गर्ने सामान्य नियमअनुसार निकालिएका हुन्। केही परिवार र पुरोहितले फरक नियम मान्छन्; आफ्नो पुरोहितसँग पुष्टि गर्नुहोस्।",
        "shraddha_adhik": "सोही नामको अधिक मास परेको वर्षमा यहाँ सामान्य (निज) महिनाको मिति दिइएको छ।",
        "year_ad": "मिति (ईस्वी)",
        "date_bs": "मिति (वि.सं.)",
        "tithi_time": "तिथि अवधि",
        "sorha": "सोह्र श्राद्ध",
        "sorha_h1": "सोह्र श्राद्ध {y}: पितृ पक्षका मिति",
        "sorha_intro": "पितृ पक्षमा हरेक पितृका लागि उहाँको मृत्यु भएको तिथिमा, जुनसुकै महिना भए पनि, श्राद्ध गरिन्छ। सोह्र दिन भाद्र पूर्णिमादेखि आश्विन कृष्ण औंसीसम्म हुन्छन्।",
        "sorha_link": "सोह्र श्राद्ध {y} मा यो तिथि {d} मा पर्छ",
        "day_tithi": "तिथि",
        "other_months": "अन्य महिनामा सोही तिथि",
        "set_reminder": "यो तिथिको रिमाइन्डर राख्नुहोस्",
        "shukla": "शुक्ल पक्ष",
        "krishna": "कृष्ण पक्ष",
    },
}
for _l in ("en", "ne"):
    T[_l].update(L[_l])


def t(lang, key, **kw):
    v = T[lang][key]
    return v.format(**kw) if kw else v


def yl(y, lang):
    return bs.ne_num(y) if lang == "ne" else str(y)


def mname(m, lang):
    return (bs.BS_MONTHS_NE if lang == "ne" else bs.BS_MONTHS_EN)[m - 1]


def wd(d, lang):
    return (bs.WEEKDAYS_NE if lang == "ne" else bs.WEEKDAYS_EN)[d.weekday()]


def change_text(a: str, b: str | None, when, lang) -> str:
    if not b:
        return a
    tm = bs.fmt_time(when, lang)
    if lang == "ne":
        return f"{a} ({tm} {t(lang, 'until')}), {t(lang, 'then')} {b}"
    return f"{a} {t(lang, 'until')} {tm}, {t(lang, 'then')} {b}"


def cur_bs():
    return bs.ad_to_bs(M.CFG.today)


def janma_months():
    ty, tm, _ = cur_bs()
    for y in range(JANMA_FIRST, ty + 1):
        for m in range(1, 13):
            if (y, m) <= (ty, tm):
                yield y, m


# --------------------------------------------------------------------------
# Janma
# --------------------------------------------------------------------------
def janma_month_ctx(y: int, m: int, lang: str) -> dict:
    nd = bs.days_in_bs_month(y, m)
    first = bs.bs_to_ad(y, m, 1)
    last = first + timedelta(days=nd - 1)
    names = panchang.NAKSHATRAS_NE if lang == "ne" else panchang.NAKSHATRAS
    rnames = panchang.RASHIS_NE if lang == "ne" else panchang.RASHIS
    ty, tm, td = cur_bs()
    rows = []
    adhik_any = False
    for k in range(nd):
        d = first + timedelta(days=k)
        if d > M.CFG.today:
            break
        i = life.day_info(d)
        nxt = life.tithi_birthdays(i, M.CFG.today, 1)
        adhik_any |= i.lunar_month.adhik
        lm = (lunar.LUNAR_MONTHS_NE if lang == "ne" else lunar.LUNAR_MONTHS)[(i.lunar_month.amanta_index + (1 if i.tithi > 15 else 0)) % 12]
        rows.append({
            "day": bs.ne_num(k + 1) if lang == "ne" else str(k + 1),
            "ad": f"{wd(d, lang)}, {bs.fmt_ad(d, lang)}", "day_url": M.day_url(d),
            "tithi": f"{lm} {lunar.tithi_name(i.tithi, lang)}",
            "nak": change_text(names[i.nak - 1], names[i.nak_next - 1] if i.nak_next else None, i.nak_change, lang),
            "rashi": change_text(rnames[i.rashi - 1], rnames[i.rashi_next - 1] if i.rashi_next else None, i.rashi_change, lang),
            "bday": f"{bs.fmt_bs(nxt[0], lang)} ({bs.fmt_ad(nxt[0], lang)})" if nxt else "—",
            "adhik": i.lunar_month.adhik,
        })
    ylab, mlab = yl(y, lang), mname(m, lang)
    path = ("janma", str(y), MONTH_SLUGS[m - 1])
    h1 = t(lang, "janma_h1", m=mlab, y=ylab)
    title = (f"{h1}: {t(lang, 'janma_sub')}" if lang == "ne"
             else f"{y} {mlab} Janma — {t(lang, 'janma_sub')} ({bs.fmt_ad(first)} – {bs.fmt_ad(last)})")
    lede = t(lang, "janma_lede", m=mlab, y=ylab, a=bs.fmt_ad(first, lang), b=bs.fmt_ad(last, lang))
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "janma"), M.url(lang, "janma")),
              (ylab, M.url(lang, "janma", str(y))), (mlab, M.url(lang, *path))]
    ctx = M.page_shell(lang, path, title, lede, crumbs, None, [])
    pm = (y, m - 1) if m > 1 else (y - 1, 12)
    nm_ = (y, m + 1) if m < 12 else (y + 1, 1)
    ctx.update({
        "kind": "janma_month", "h1": h1, "sub": t(lang, "janma_sub"), "lede": lede, "rows": rows,
        "adhik_any": adhik_any,
        "tools": [("/tools/baby-names", t(lang, "tool_names")), ("/rashifal", t(lang, "tool_rashi")),
                  ("/tools/tithi-reminder", t(lang, "tool_reminder")), ("/tools/janmadin-akhbar", t(lang, "tool_card"))],
        "age_url": M.url(lang, "kati", "umer", str(y)), "age_label": t(lang, "age_link", y=ylab),
        "prev_url": M.url(lang, "janma", str(pm[0]), MONTH_SLUGS[pm[1] - 1]) if pm[0] >= JANMA_FIRST else None,
        "next_url": M.url(lang, "janma", str(nm_[0]), MONTH_SLUGS[nm_[1] - 1]) if nm_ <= (ty, tm) else None,
        "prev_label": f"{mname(pm[1], lang)} {yl(pm[0], lang)}", "next_label": f"{mname(nm_[1], lang)} {yl(nm_[0], lang)}",
        "year_url": M.url(lang, "janma", str(y)), "year_label": ylab,
        "_og": None, "_json": None,
    })
    return ctx


def janma_year_ctx(y: int, lang: str) -> dict:
    ty, tm, _ = cur_bs()
    a, b = bs.bs_year_range_ad(y)
    months = [{"name": mname(m, lang), "url": M.url(lang, "janma", str(y), MONTH_SLUGS[m - 1]),
               "ad": f"{bs.fmt_ad(bs.bs_to_ad(y, m, 1), lang)}"} for m in range(1, 13) if (y, m) <= (ty, tm)]
    ylab = yl(y, lang)
    path = ("janma", str(y))
    h1 = t(lang, "janma_year_h1", y=ylab)
    intro = t(lang, "janma_year_intro", y=ylab, a=bs.fmt_ad(a, lang), b=bs.fmt_ad(min(b, M.CFG.today) if y == ty else b, lang))
    title = (f"{h1}: तिथि, नक्षत्र र राशि" if lang == "ne" else f"{h1}: Tithi, Nakshatra and Rashi by Month")
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "janma"), M.url(lang, "janma")), (ylab, M.url(lang, *path))]
    ctx = M.page_shell(lang, path, title, intro, crumbs, None, [])
    ctx.update({"kind": "janma_year", "h1": h1, "intro": intro, "months": months,
                "age_url": M.url(lang, "kati", "umer", str(y)), "age_label": t(lang, "age_link", y=ylab),
                "_og": None, "_json": None})
    return ctx


def janma_index_ctx(lang: str) -> dict:
    ty, _, _ = cur_bs()
    years = [{"y": yl(y, lang), "url": M.url(lang, "janma", str(y)),
              "ad": f"{bs.bs_year_range_ad(y)[0].year}–{bs.bs_year_range_ad(y)[1].year}"} for y in range(ty, JANMA_FIRST - 1, -1)]
    if lang == "ne":
        for r in years:
            r["ad"] = bs.ne_num(r["ad"])
    path = ("janma",)
    h1 = t(lang, "janma_index_h1")
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "janma"), M.url(lang, *path))]
    ctx = M.page_shell(lang, path, h1, t(lang, "janma_index_intro"), crumbs, None, [])
    ctx.update({"kind": "janma_index", "h1": h1, "intro": t(lang, "janma_index_intro"), "years": years, "_og": None, "_json": None})
    return ctx


# --------------------------------------------------------------------------
# Shraddha
# --------------------------------------------------------------------------
def tithi_slug(month: str, paksha: str, tithi: int) -> str:
    if tithi == 15:
        return f"{month.lower()}-{'purnima' if paksha == 'shukla' else 'aunsi'}"
    return f"{month.lower()}-{paksha}-{lunar.TITHI_NAMES[tithi - 1].lower()}"


def tithi_label(month: str, paksha: str, tithi: int, lang: str) -> str:
    mi = lunar.LUNAR_MONTHS.index(month)
    if lang == "ne":
        mo = lunar.LUNAR_MONTHS_NE[mi]
        if tithi == 15:
            return f"{mo} {'पूर्णिमा' if paksha == 'shukla' else 'औंसी'}"
        return f"{mo} {'शुक्ल' if paksha == 'shukla' else 'कृष्ण'} {lunar.TITHI_NAMES_NE[tithi - 1]}"
    if tithi == 15:
        return f"{month} {'Purnima' if paksha == 'shukla' else 'Aunsi'}"
    return f"{month} {paksha.capitalize()} {lunar.TITHI_NAMES[tithi - 1]}"


def shraddha_keys():
    for month in lunar.LUNAR_MONTHS:
        for paksha in ("shukla", "krishna"):
            for tithi in range(1, 16):
                yield month, paksha, tithi


def _horizon():
    ty, _, _ = cur_bs()
    return M.CFG.today, bs.bs_year_range_ad(min(2100, ty + SHRADDHA_YEARS - 1))[1]


def shraddha_ctx(month: str, paksha: str, tithi: int, lang: str) -> dict:
    d0, d1 = _horizon()
    hits = life.shraddha_dates(month, paksha, tithi, d0, d1)
    rows = [{"bs": bs.fmt_bs(d, lang), "ad": f"{wd(d, lang)}, {bs.fmt_ad(d, lang)}", "url": M.day_url(d),
             "span": f"{bs.fmt_time(s, lang)} {bs.fmt_bs(s.date(), lang)} – {bs.fmt_time(e, lang)} {bs.fmt_bs(e.date(), lang)}"}
            for d, _, s, e in hits]
    label = tithi_label(month, paksha, tithi, lang)
    slug = tithi_slug(month, paksha, tithi)
    path = ("shraddha", slug)
    h1 = t(lang, "shraddha_h1", name=label)
    nxt = f"{bs.fmt_bs(hits[0][0], lang)} ({wd(hits[0][0], lang)}, {bs.fmt_ad(hits[0][0], lang)})" if hits else "—"
    title = (f"{h1} {t(lang, 'shraddha_next', d=nxt)}" if lang == "ne"
             else f"{label} Shraddha Date {cur_bs()[0]}: {nxt}")
    desc = (f"{label}को श्राद्ध: {nxt}। आगामी {bs.ne_num(SHRADDHA_YEARS)} वर्षका मिति र तिथि अवधि।" if lang == "ne"
            else f"{label} shraddha: next on {nxt}. Dates and tithi times for the next {SHRADDHA_YEARS} years.")
    # Sorha shraddha cross-link (Asoj krishna tithis and Bhadra purnima)
    sorha = None
    ty = cur_bs()[0]
    for y in (ty, ty + 1):
        for pk, tt, dd in life.pitri_paksha(y):
            if pk == paksha and tt == tithi and dd >= M.CFG.today:
                sorha = {"txt": t(lang, "sorha_link", y=yl(y, lang), d=bs.fmt_bs(dd, lang)), "url": M.url(lang, "shraddha", "sorha-shraddha", str(y))}
                break
        if sorha:
            break
    others = [{"name": tithi_label(mo, paksha, tithi, lang), "url": M.url(lang, "shraddha", tithi_slug(mo, paksha, tithi))}
              for mo in lunar.LUNAR_MONTHS if mo != month]
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "shraddha"), M.url(lang, "shraddha")), (label, M.url(lang, *path))]
    faq = [(h1, t(lang, "shraddha_next", d=nxt))]
    ctx = M.page_shell(lang, path, title, desc, crumbs, None, [M.faq_ld(faq)])
    ctx.update({"kind": "shraddha", "h1": h1, "next": t(lang, "shraddha_next", d=nxt), "rows": rows,
                "rule": t(lang, "shraddha_rule"), "adhik": t(lang, "shraddha_adhik"), "sorha": sorha, "others": others,
                "reminder": ("/tools/tithi-reminder", t(lang, "set_reminder")), "faq": faq, "_og": None, "_json": None})
    return ctx


def sorha_years():
    ty = cur_bs()[0]
    return [y for y in range(ty, min(2100, ty + SHRADDHA_YEARS - 1) + 1) if life.pitri_paksha(y)]


def sorha_ctx(y: int, lang: str) -> dict:
    days = life.pitri_paksha(y)
    rows = []
    for pk, tt, d in days:
        name = (lunar.tithi_name(tt if pk == "shukla" else 15 + tt, lang))
        rows.append({"tithi": name, "bs": bs.fmt_bs(d, lang), "ad": f"{wd(d, lang)}, {bs.fmt_ad(d, lang)}",
                     "url": M.day_url(d)})
    ylab = yl(y, lang)
    path = ("shraddha", "sorha-shraddha", str(y))
    h1 = t(lang, "sorha_h1", y=ylab)
    span = f"{bs.fmt_bs(days[0][2], lang)} – {bs.fmt_bs(days[-1][2], lang)}"
    title = f"{h1} ({span})"
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "shraddha"), M.url(lang, "shraddha")),
              (t(lang, "sorha"), M.url(lang, "shraddha")), (ylab, M.url(lang, *path))]
    ys = sorha_years()
    ctx = M.page_shell(lang, path, title, f"{t(lang, 'sorha_intro')} {span}", crumbs, None, [])
    ctx.update({"kind": "sorha", "h1": h1, "intro": t(lang, "sorha_intro"), "span": span, "rows": rows,
                "rule": t(lang, "shraddha_rule"),
                "prev_url": M.url(lang, "shraddha", "sorha-shraddha", str(y - 1)) if y - 1 in ys else None,
                "next_url": M.url(lang, "shraddha", "sorha-shraddha", str(y + 1)) if y + 1 in ys else None,
                "prev_label": yl(y - 1, lang), "next_label": yl(y + 1, lang), "hub_url": M.url(lang, "shraddha"),
                "_og": None, "_json": None})
    return ctx


def shraddha_index_ctx(lang: str) -> dict:
    groups = []
    for month in lunar.LUNAR_MONTHS:
        mi = lunar.LUNAR_MONTHS.index(month)
        rows = []
        for paksha in ("shukla", "krishna"):
            rows.append({"paksha": t(lang, paksha),
                         "tithis": [{"t": (lunar.TITHI_NAMES_NE if lang == "ne" else lunar.TITHI_NAMES)[k - 1] if k < 15
                                    else (("पूर्णिमा" if paksha == "shukla" else "औंसी") if lang == "ne" else ("Purnima" if paksha == "shukla" else "Aunsi")),
                                    "url": M.url(lang, "shraddha", tithi_slug(month, paksha, k))} for k in range(1, 16)]})
        groups.append({"month": lunar.LUNAR_MONTHS_NE[mi] if lang == "ne" else month, "rows": rows})
    sorha = [{"y": yl(y, lang), "url": M.url(lang, "shraddha", "sorha-shraddha", str(y))} for y in sorha_years()]
    path = ("shraddha",)
    h1 = t(lang, "shraddha_index_h1")
    intro = t(lang, "shraddha_index_intro", n=bs.ne_num(SHRADDHA_YEARS) if lang == "ne" else SHRADDHA_YEARS)
    crumbs = [(T[lang]["home"], M.url(lang)), (t(lang, "shraddha"), M.url(lang, *path))]
    ctx = M.page_shell(lang, path, h1, intro, crumbs, None, [])
    ctx.update({"kind": "shraddha_index", "h1": h1, "intro": intro, "groups": groups, "sorha": sorha, "_og": None, "_json": None})
    return ctx


def all_tasks(lang: str, only: set) -> list[tuple]:
    out = []
    if "janma" in only:
        out.append(("janma_index", lang))
        ty = cur_bs()[0]
        for y in range(JANMA_FIRST, ty + 1):
            out.append(("janma_year", y, lang))
        for y, m in janma_months():
            out.append(("janma_month", y, m, lang))
    if "shraddha" in only:
        out.append(("shraddha_index", lang))
        for month, paksha, tithi in shraddha_keys():
            out.append(("shraddha", month, paksha, tithi, lang))
        for y in sorha_years():
            out.append(("sorha", y, lang))
    return out
