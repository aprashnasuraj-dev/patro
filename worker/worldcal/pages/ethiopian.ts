import { addDaysIso, gregorianToJdn, isoToJdn, jdnToGregorian, jdnToIso, parseIso, pad2, todayIn } from "../dates";
import { esc, page } from "../html";
import { ethiopianYearRing } from "../visuals";
import {
  bahireHasab, ethiopianClock, ethiopianHolidays, ethMonthLength, ethToJdn, ETH_MONTHS, ETH_WEEKDAYS, ethWeekday, evangelistOf,
  FEAST_OFFSETS, formatEthAm, formatEthEn, geezNumeral, isEthLeap, isValidEth, jdnToEth, type FeastKey,
} from "../engines/ethiopic";
import { INDEX_WINDOW } from "../config";
import type { Ctx, Rendered } from "../types";

const P = "/ethiopian-calendar";
const TZ = "Africa/Addis_Ababa";
const YEAR_RANGE = { min: 1900, max: 2100 }; // E.C. years served
const INDEXED_YEARS = { min: 1990, max: 2030 };
const INDEXED_GREG_YEARS = { min: 2000, max: 2035 };

const gLong = (jdn: number) => {
  const g = jdnToGregorian(jdn);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(g.y, g.m - 1, g.d)));
};
const gShort = (jdn: number) => {
  const g = jdnToGregorian(jdn);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(Date.UTC(g.y, g.m - 1, g.d)));
};
const crumbsBase = [{ href: P, label: "Ethiopian calendar" }];
const FOOT = `<p class="note">Conversion: epoch 1 Meskerem 1 E.C. = JDN 1724221; leap year when the Ethiopian year mod 4 = 3 (Pagume 6). Checked against the Unicode ICU/CLDR Ethiopic calendar for every day from 1890 to 2109. Movable feasts use Bahire Hasab, which equals the Orthodox (Julian) Easter computus. Islamic holidays are tentative until announced.</p>`;

function converterForms(): string {
  const months = ETH_MONTHS.map((m, i) => `<option value="${i + 1}">${esc(m.en)} · ${esc(m.am)}</option>`).join("");
  return `<section><h2>Converter <span lang="am" class="muted">መቀየሪያ</span></h2>
<form class="inline" method="get" action="${P}/convert"><label>Gregorian date<input type="date" name="g" required></label><button>To Ethiopian</button></form>
<form class="inline" method="get" action="${P}/convert" style="margin-top:10px"><label>Day<input type="number" name="ed" min="1" max="30" required style="width:5em"></label><label>Month<select name="em">${months}</select></label><label>Year (E.C.)<input type="number" name="ey" min="${YEAR_RANGE.min}" max="${YEAR_RANGE.max}" required style="width:6em"></label><button>To Gregorian</button></form></section>`;
}

function dateCard(jdn: number): string {
  const e = jdnToEth(jdn);
  const ev = evangelistOf(e.year);
  return `<section><h2>This day in both calendars</h2>
<table><tbody><tr><th>Ethiopian date</th><td>${esc(ethWeekday(jdn).en)}, ${esc(formatEthEn(e))}</td></tr><tr><th>Gregorian date</th><td>${esc(gLong(jdn))}</td></tr>
<tr><th>Year</th><td><a href="${P}/${e.year}">${e.year} E.C.</a> · ${esc(ev.en)} year (<span lang="am">${esc(ev.am)}</span>)${isEthLeap(e.year) ? " · leap year (Pagume has 6 days)" : ""} · Amete Alem ${e.year + 5500}</td></tr>
<tr><th>Month</th><td><a href="${P}/${e.year}/${ETH_MONTHS[e.month - 1].slug}">${esc(ETH_MONTHS[e.month - 1].en)} <span lang="am">${esc(ETH_MONTHS[e.month - 1].am)}</span></a>, day ${e.day} of ${ethMonthLength(e.year, e.month)}</td></tr></tbody></table></section>`;
}

/** Hero: the 13-month ring with today's position, plus the date in Ge'ez script. */
function hero(jdn: number) {
  const e = jdnToEth(jdn);
  const yearLen = isEthLeap(e.year) ? 366 : 365;
  return {
    art: ethiopianYearRing(e.month, e.day, yearLen, ETH_MONTHS.map((m) => m.am), { big: String(e.day), small: `${ETH_MONTHS[e.month - 1].en} ${e.year}` }),
    lede: `<span class="geez" lang="am">${esc(formatEthAm(e, jdn))}</span><br><span class="muted" lang="am">${esc(formatEthAm(e, jdn, true))}</span><br><span class="note">The ring is the Ethiopian year: twelve months of 30 days and the short month of Pagume (green).</span>`,
  };
}

function holidayRows(list: ReturnType<typeof ethiopianHolidays>): string {
  return list.map((h) => {
    const e = jdnToEth(h.jdn);
    return `<tr><td>${esc(gShort(h.jdn))}</td><td>${esc(h.en)} <span lang="am">${esc(h.am)}</span>${h.kind === "religious" ? ' <span class="muted">(observance)</span>' : ""}${h.note ? `<br><span class="note${h.tentative ? "" : " warn"}">${esc(h.note)}</span>` : ""}</td><td>${esc(formatEthEn(e))}</td></tr>`;
  }).join("");
}

function todayPage(ctx: Ctx): Rendered {
  const todayIso = todayIn(TZ, ctx.now);
  const jdn = isoToJdn(todayIso);
  const gy = Number(todayIso.slice(0, 4));
  const upcoming = [...ethiopianHolidays(gy), ...ethiopianHolidays(gy + 1)].filter((h) => h.jdn >= jdn && h.kind === "public").slice(0, 6);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ctx.now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value), mm = Number(parts.find((p) => p.type === "minute")?.value);
  const clock = ethiopianClock(hh, mm);
  const e = jdnToEth(jdn);
  const body = `${dateCard(jdn)}
<section><h2>Ethiopian time now (Addis Ababa)</h2><p class="big" id="et-clock">${clock.hour}:${pad2(clock.minute)} <span class="muted">${clock.daytime ? "daytime hours" : "night hours"}</span></p>
<p class="note">Ethiopian hours are counted from about 6 am (sunrise) and 6 pm. <a href="${P}/time">How Ethiopian time works</a>.</p></section>
${converterForms()}
<section><h2>Upcoming holidays</h2><table><tbody>${holidayRows(upcoming)}</tbody></table><p><a href="${P}/holidays/${gy}">All holidays ${gy}</a> · <a href="${P}/${e.year}">Calendar ${e.year} E.C.</a></p></section>
<script>(function(){function t(){var d=new Date(Date.now()+3*3600e3),h=d.getUTCHours(),m=d.getUTCMinutes(),e=((h+5)%12)+1,el=document.getElementById("et-clock");if(el)el.firstChild.nodeValue=e+":"+(m<10?"0":"")+m+" ";}setInterval(t,30000);})();</script>`;
  return {
    status: 200, maxAge: "midnight", tz: TZ, indexable: true,
    html: page({
      site: ctx.site, path: P, lang: "en", title: `Ethiopian calendar today: ${formatEthEn(e)} · ${formatEthAm(e, jdn)}`,
      description: `Today in the Ethiopian calendar is ${ethWeekday(jdn).en}, ${formatEthEn(e)} (${formatEthAm(e, jdn)}). Converter, Ethiopian time, holidays and 13-month calendars.`,
      h1: `Ethiopian calendar today<br><span lang="am" class="muted" style="font-size:.6em">የኢትዮጵያ ቀን መቁጠሪያ</span>`, sub: esc(gLong(jdn)),
      hero: hero(jdn).art, lede: hero(jdn).lede, crumbs: crumbsBase, indexable: true, body, footer: FOOT,
    }),
  };
}

function datePage(ctx: Ctx, isoDate: string): Rendered | null {
  const p = parseIso(isoDate);
  if (!p) return null;
  const jdn = gregorianToJdn(p.y, p.m, p.d);
  const e = jdnToEth(jdn);
  if (e.year < YEAR_RANGE.min || e.year > YEAR_RANGE.max) return null;
  const todayJdn = isoToJdn(todayIn(TZ, ctx.now));
  const indexable = jdn >= todayJdn - INDEX_WINDOW.pastDays && jdn <= todayJdn + INDEX_WINDOW.futureDays;
  const hol = ethiopianHolidays(p.y).filter((h) => h.jdn === jdn);
  const body = `${dateCard(jdn)}${hol.length ? `<section><h2>On this day</h2><table><tbody>${holidayRows(hol)}</tbody></table></section>` : ""}
<section><p><a href="${P}/date/${addDaysIso(isoDate, -1)}">← ${esc(gShort(jdn - 1))}</a> · <a href="${P}/date/${addDaysIso(isoDate, 1)}">${esc(gShort(jdn + 1))} →</a></p></section>${converterForms()}`;
  return {
    status: 200, maxAge: 86400 * 7, indexable,
    html: page({
      site: ctx.site, path: `${P}/date/${isoDate}`, lang: "en", title: `${gShort(jdn)} in the Ethiopian calendar: ${formatEthEn(e)}`,
      description: `${gLong(jdn)} = ${ethWeekday(jdn).en}, ${formatEthEn(e)} (${formatEthAm(e, jdn)}).`, h1: esc(`${gShort(jdn)} = ${formatEthEn(e)}`),
      hero: hero(jdn).art, lede: hero(jdn).lede,
      crumbs: [...crumbsBase, { href: `${P}/${e.year}`, label: `${e.year} E.C.` }, { href: `${P}/date/${isoDate}`, label: gShort(jdn) }], indexable, body, footer: FOOT,
    }),
  };
}

function convert(ctx: Ctx): Rendered {
  const q = ctx.url.searchParams;
  const g = q.get("g");
  if (g && parseIso(g)) return { status: 302, location: `${P}/date/${g}` };
  const ey = Number(q.get("ey")), em = Number(q.get("em")), ed = Number(q.get("ed"));
  if (ey && em && ed && isValidEth({ year: ey, month: em, day: ed }) && ey >= YEAR_RANGE.min && ey <= YEAR_RANGE.max) return { status: 302, location: `${P}/date/${jdnToIso(ethToJdn(ey, em, ed))}` };
  return { status: 302, location: P };
}

function yearPage(ctx: Ctx, ey: number): Rendered | null {
  if (ey < YEAR_RANGE.min || ey > YEAR_RANGE.max) return null;
  const ev = evangelistOf(ey);
  const rows = ETH_MONTHS.map((m, i) => {
    const start = ethToJdn(ey, i + 1, 1), end = start + ethMonthLength(ey, i + 1) - 1;
    return `<tr><td><a href="${P}/${ey}/${m.slug}">${esc(m.en)}</a> <span lang="am">${esc(m.am)}</span></td><td>${esc(gShort(start))} – ${esc(gShort(end))}</td><td>${ethMonthLength(ey, i + 1)}</td></tr>`;
  }).join("");
  const start = ethToJdn(ey, 1, 1), end = ethToJdn(ey, 13, ethMonthLength(ey, 13));
  const g0 = jdnToGregorian(start).y;
  const hol = [...ethiopianHolidays(g0), ...ethiopianHolidays(g0 + 1)].filter((h) => h.jdn >= start && h.jdn <= end);
  const bh = bahireHasab(ey);
  const feastRows = (Object.keys(FEAST_OFFSETS) as FeastKey[]).map((k) => `<tr><td>${esc(FEAST_OFFSETS[k].en)} <span lang="am">${esc(FEAST_OFFSETS[k].am)}</span></td><td>${esc(gShort(bh.feasts[k]))}</td><td>${esc(formatEthEn(jdnToEth(bh.feasts[k])))}</td></tr>`).join("");
  const body = `<section><table><tbody><tr><th>Evangelist year</th><td>${esc(ev.en)} <span lang="am">${esc(ev.am)}</span></td></tr><tr><th>Leap year</th><td>${isEthLeap(ey) ? "Yes — Pagume has 6 days" : "No — Pagume has 5 days"}</td></tr>
<tr><th>Starts</th><td>${esc(gLong(start))}</td></tr><tr><th>Ends</th><td>${esc(gLong(end))}</td></tr><tr><th>Ge'ez numerals</th><td lang="am">${esc(geezNumeral(ey))}</td></tr></tbody></table></section>
<section><h2>The 13 months of ${ey} E.C.</h2><table><thead><tr><th>Month</th><th>Gregorian</th><th>Days</th></tr></thead><tbody>${rows}</tbody></table></section>
<section><h2>Holidays in ${ey} E.C.</h2><table><tbody>${holidayRows(hol)}</tbody></table></section>
<section><h2>Bahire Hasab ${ey} E.C.</h2><p class="note">Amete Alem ${bh.ameteAlem} · Wenber ${bh.wenber} · Abekte ${bh.abekte} · Metqe ${bh.metqe} · Tewsak ${bh.tewsak}</p><table><tbody>${feastRows}</tbody></table></section>
<section><p><a href="${P}/${ey - 1}">← ${ey - 1} E.C.</a> · <a href="${P}/${ey + 1}">${ey + 1} E.C. →</a></p></section>`;
  return {
    status: 200, maxAge: 86400 * 7, indexable: ey >= INDEXED_YEARS.min && ey <= INDEXED_YEARS.max,
    html: page({
      site: ctx.site, path: `${P}/${ey}`, lang: "en", title: `Ethiopian calendar ${ey} E.C. (${g0}/${g0 + 1}) — months, holidays and Fasika date`,
      description: `Ethiopian year ${ey} runs from ${gShort(start)} to ${gShort(end)}. ${ev.en} year${isEthLeap(ey) ? ", leap year" : ""}. Fasika ${gShort(bh.feasts.fasika)}.`,
      h1: `Ethiopian calendar ${ey} E.C.`, sub: `<span lang="am">${esc(geezNumeral(ey))} ዓ.ም.</span>`,
      hero: (() => { const t = jdnToEth(isoToJdn(todayIn(TZ, ctx.now))); const inYear = t.year === ey; return ethiopianYearRing(inYear ? t.month : 1, inYear ? t.day : 1, isEthLeap(ey) ? 366 : 365, ETH_MONTHS.map((m) => m.am), { big: String(ey), small: `${ev.en.split(" ")[0]} year` }); })(), crumbs: [...crumbsBase, { href: `${P}/${ey}`, label: `${ey} E.C.` }],
      indexable: ey >= INDEXED_YEARS.min && ey <= INDEXED_YEARS.max, body, footer: FOOT,
    }),
  };
}

function monthPage(ctx: Ctx, ey: number, slug: string): Rendered | null {
  const mi = ETH_MONTHS.findIndex((m) => m.slug === slug);
  if (mi < 0 || ey < YEAR_RANGE.min || ey > YEAR_RANGE.max) return null;
  const month = mi + 1, len = ethMonthLength(ey, month);
  const start = ethToJdn(ey, month, 1);
  const g0 = jdnToGregorian(start).y;
  const hol = [...ethiopianHolidays(g0), ...ethiopianHolidays(g0 + 1)];
  const todayJdn = isoToJdn(todayIn(TZ, ctx.now));
  const lead = ((start % 7) + 7) % 7; // Monday-first: JDN mod 7 == 0 is Monday
  let cells = ETH_WEEKDAYS.map((w) => `<div class="h" lang="am">${esc(w.am)}</div>`).join("");
  for (let i = 0; i < lead; i++) cells += "<div></div>";
  for (let d = 1; d <= len; d++) {
    const j = start + d - 1;
    const h = hol.filter((x) => x.jdn === j && x.kind === "public").map((x) => x.en.split(" (")[0]);
    cells += `<div${j === todayJdn ? ' class="today"' : ""}><a href="${P}/date/${jdnToIso(j)}"><b>${d}</b></a> <span class="muted">${esc(gShort(j).replace(/ \d{4}$/, ""))}</span>${h.length ? `<br>${esc(h.join(", "))}` : ""}</div>`;
  }
  const prev = month === 1 ? `${ey - 1}/pagume` : `${ey}/${ETH_MONTHS[mi - 1].slug}`;
  const next = month === 13 ? `${ey + 1}/meskerem` : `${ey}/${ETH_MONTHS[mi + 1].slug}`;
  const m = ETH_MONTHS[mi];
  return {
    status: 200, maxAge: 86400 * 7, indexable: ey >= INDEXED_YEARS.min && ey <= INDEXED_YEARS.max,
    html: page({
      site: ctx.site, path: `${P}/${ey}/${slug}`, lang: "en", title: `${m.en} ${ey} (${m.am}) — Ethiopian calendar with Gregorian dates`,
      description: `${m.en} ${ey} E.C. runs from ${gShort(start)} to ${gShort(start + len - 1)}: ${len} days with Gregorian dates and holidays.`,
      h1: `${esc(m.en)} ${ey}`, sub: `<span lang="am">${esc(m.am)} ${esc(geezNumeral(ey))}</span><br>${esc(`${gShort(start)} – ${gShort(start + len - 1)}`)}`,
      crumbs: [...crumbsBase, { href: `${P}/${ey}`, label: `${ey} E.C.` }, { href: `${P}/${ey}/${slug}`, label: m.en }], indexable: ey >= INDEXED_YEARS.min && ey <= INDEXED_YEARS.max,
      body: `<section><div class="cal">${cells}</div></section><section><p><a href="${P}/${prev}">← previous month</a> · <a href="${P}/${next}">next month →</a></p></section>`, footer: FOOT,
    }),
  };
}

function holidaysPage(ctx: Ctx, gy: number): Rendered | null {
  if (gy < YEAR_RANGE.min + 7 || gy > YEAR_RANGE.max + 7) return null;
  const list = ethiopianHolidays(gy);
  const pub = list.filter((h) => h.kind === "public"), rel = list.filter((h) => h.kind === "religious");
  const indexable = gy >= INDEXED_GREG_YEARS.min && gy <= INDEXED_GREG_YEARS.max;
  return {
    status: 200, maxAge: 86400 * 7, indexable,
    html: page({
      site: ctx.site, path: `${P}/holidays/${gy}`, lang: "en", title: `Ethiopian holidays ${gy}: Genna, Timkat, Fasika, Enkutatash, Meskel dates`,
      description: `Ethiopian public holidays and Orthodox feasts in ${gy} with Ethiopian dates: Fasika ${gShort(list.find((h) => h.key === "fasika")!.jdn)}, Meskel and more.`,
      h1: `Ethiopian holidays ${gy}`, crumbs: [...crumbsBase, { href: `${P}/holidays/${gy}`, label: `Holidays ${gy}` }], indexable,
      body: `<section><h2>Public holidays</h2><table><tbody>${holidayRows(pub)}</tbody></table></section><section><h2>Orthodox observances (Bahire Hasab)</h2><table><tbody>${holidayRows(rel)}</tbody></table></section>
<section><p><a href="${P}/holidays/${gy - 1}">← ${gy - 1}</a> · <a href="${P}/holidays/${gy + 1}">${gy + 1} →</a></p></section>`, footer: FOOT,
    }),
  };
}

function timePage(ctx: Ctx): Rendered {
  const rows = Array.from({ length: 24 }, (_, h) => {
    const c = ethiopianClock(h, 0);
    return `<tr><td>${pad2(h)}:00</td><td>${c.hour}:00</td><td>${c.daytime ? "daytime" : "night"}</td></tr>`;
  }).join("");
  return {
    status: 200, maxAge: 86400 * 30, indexable: true,
    html: page({
      site: ctx.site, path: `${P}/time`, lang: "en", title: "Ethiopian time explained — 12-hour clock from 6 am, with conversion table",
      description: "Ethiopian time counts hours from about 6 am and 6 pm: 7 am is 1 o'clock, noon is 6, 6 pm is 12. Full 24-hour conversion table.",
      h1: "Ethiopian time", sub: '<span lang="am">የኢትዮጵያ ሰዓት</span>', crumbs: [...crumbsBase, { href: `${P}/time`, label: "Ethiopian time" }], indexable: true,
      body: `<section><p>In Ethiopia the day's hours start at about sunrise. 7 am international time is 1 o'clock in the morning Ethiopian time, noon is 6, and 6 pm is 12. Rule: Ethiopian hour = ((hour + 5) mod 12) + 1; minutes stay the same.</p></section>
<section><table><thead><tr><th>International (24 h)</th><th>Ethiopian</th><th>Cycle</th></tr></thead><tbody>${rows}</tbody></table></section>`, footer: FOOT,
    }),
  };
}

export function ethiopianRoute(ctx: Ctx, rest: string[]): Rendered | null {
  if (!rest.length) return todayPage(ctx);
  if (rest.length === 1 && rest[0] === "convert") return convert(ctx);
  if (rest.length === 1 && rest[0] === "time") return timePage(ctx);
  if (rest.length === 2 && rest[0] === "date") return datePage(ctx, rest[1]);
  if (rest.length === 2 && rest[0] === "holidays" && /^\d{4}$/.test(rest[1])) return holidaysPage(ctx, Number(rest[1]));
  if (/^\d{4}$/.test(rest[0])) {
    if (rest.length === 1) return yearPage(ctx, Number(rest[0]));
    if (rest.length === 2) return monthPage(ctx, Number(rest[0]), rest[1]);
  }
  return null;
}

export function ethiopianUrls(now: Date): string[] {
  const out = [P, `${P}/time`];
  for (let ey = INDEXED_YEARS.min; ey <= INDEXED_YEARS.max; ey++) {
    out.push(`${P}/${ey}`);
    for (const m of ETH_MONTHS) out.push(`${P}/${ey}/${m.slug}`);
  }
  for (let gy = INDEXED_GREG_YEARS.min; gy <= INDEXED_GREG_YEARS.max; gy++) out.push(`${P}/holidays/${gy}`);
  const t = isoToJdn(todayIn(TZ, now));
  for (let j = t - INDEX_WINDOW.pastDays; j <= t + INDEX_WINDOW.futureDays; j++) out.push(`${P}/date/${jdnToIso(j)}`);
  return out;
}
