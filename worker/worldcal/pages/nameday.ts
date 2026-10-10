import { addDaysIso, daysInGregorianMonth, isGregorianLeap, isoToJdn, pad2, parseIso, todayIn, weekdaySun0 } from "../dates";
import { esc, icsYearly, page } from "../html";
import { tearSheet } from "../visuals";
import { countryBySlug, dateLabel, NAMEDAY_COUNTRIES, nameIndex, namesOn, namesOnKey, slugifyName, type NamedayCountry } from "../namedays";
import type { Ctx, Rendered } from "../types";

const P = "/nameday";
const KEY_RE = /^(\d{2})-(\d{2})$/;

const nameLinks = (c: NamedayCountry, names: string[], cls = "chip") =>
  names.map((n) => `<a class="${cls}" href="${P}/${c.slug}/name/${slugifyName(n)}">${esc(n)}</a>`).join(" ");

function sourceFooter(c: NamedayCountry): string {
  const d = c.data;
  return `<p class="note">${esc(c.t.sourceLine)}: <a href="${esc(d.source.url)}" rel="nofollow noopener">${esc(d.source.name)}</a>. ${d.license.url ? `Licence: <a href="${esc(d.license.url)}" rel="nofollow noopener">${esc(d.license.name)}</a>.` : esc(d.license.name)} <a href="${P}/${c.slug}/data.json">${esc(c.t.dataset)}</a>.</p>`;
}

function monthGrid(c: NamedayCountry, y: number, m: number, today: string): string {
  const first = weekdaySun0(isoToJdn(`${y}-${pad2(m)}-01`));
  const lead = (first + 6) % 7; // Monday-first
  const heads = [1, 2, 3, 4, 5, 6, 0].map((i) => `<div class="h">${esc(c.t.weekdays[i].slice(0, 2))}</div>`).join("");
  let cells = "";
  for (let i = 0; i < lead; i++) cells += "<div></div>";
  for (let d = 1; d <= daysInGregorianMonth(y, m); d++) {
    const iso = `${y}-${pad2(m)}-${pad2(d)}`;
    const names = namesOn(c, iso);
    cells += `<div${iso === today ? ' class="today"' : ""}><a href="${P}/${c.slug}/${pad2(m)}-${pad2(d)}"><b>${d}</b></a><br>${names.slice(0, 2).map(esc).join(", ")}${names.length > 2 ? "…" : ""}</div>`;
  }
  return `<div class="cal">${heads}${cells}</div>`;
}

function searchForm(c: NamedayCountry): string {
  return `<form class="inline" method="get" action="${P}/${c.slug}/search"><label>${esc(c.t.search)}<input name="q" required maxlength="40"></label><button>${esc(c.t.searchButton)}</button></form>`;
}

function hub(ctx: Ctx): Rendered {
  const rows = NAMEDAY_COUNTRIES.filter((c) => c.enabled).map((c) => {
    const today = todayIn(c.data.tz, ctx.now);
    return `<tr><td><a href="${P}/${c.slug}">${esc(c.t.countryName)}</a></td><td>${nameLinks(c, namesOn(c, today)) || `<span class="muted">—</span>`}</td></tr>`;
  }).join("");
  return {
    status: 200, maxAge: 3600, indexable: true,
    html: page({
      site: ctx.site, path: P, lang: "en", title: "Today's name days in Europe — Czech, Slovak and Hungarian name days", description: "Whose name day is it today? Name days for Czechia, Slovakia and Hungary with full calendars, every name's date and reminders.",
      h1: "Today's name days", sub: "Name days are celebrated like birthdays in much of Central Europe.", crumbs: [{ href: P, label: "Name days" }], indexable: true,
      body: `<section><table><thead><tr><th>Country</th><th>Today</th></tr></thead><tbody>${rows}</tbody></table></section>`,
    }),
  };
}

function today(ctx: Ctx, c: NamedayCountry): Rendered {
  const t = c.t;
  const todayIso = todayIn(c.data.tz, ctx.now);
  const p = parseIso(todayIso)!;
  const key = `${pad2(p.m)}-${pad2(p.d)}`;
  const names = namesOn(c, todayIso);
  const tomorrow = addDaysIso(todayIso, 1), yesterday = addDaysIso(todayIso, -1);
  const label = dateLabel(c, key);
  const week = Array.from({ length: 7 }, (_, i) => addDaysIso(todayIso, i + 1)).map((iso) => {
    const q = parseIso(iso)!;
    return `<tr><td><a href="${P}/${c.slug}/${pad2(q.m)}-${pad2(q.d)}">${esc(dateLabel(c, `${pad2(q.m)}-${pad2(q.d)}`))}</a> <span class="muted">${esc(t.weekdays[weekdaySun0(isoToJdn(iso))])}</span></td><td>${nameLinks(c, namesOn(c, iso)) || "—"}</td></tr>`;
  }).join("");
  const body = `<section><p class="big">${names.length ? nameLinks(c, names) : esc(t.noName)}</p>
<p>${esc(t.tomorrow)}: ${nameLinks(c, namesOn(c, tomorrow)) || "—"} · ${esc(t.yesterday)}: ${nameLinks(c, namesOn(c, yesterday)) || "—"}</p>
${names.length ? `<p><b>${esc(t.greeting)}</b> <span class="note">(${esc(t.greetingNote)})</span></p>` : ""}${searchForm(c)}</section>
<section><h2>${esc(t.week)}</h2><table><tbody>${week}</tbody></table></section>
<section><h2>${esc(t.months[p.m - 1])} ${p.y}</h2>${monthGrid(c, p.y, p.m, todayIso)}<p><a href="${P}/${c.slug}/month/${pad2(p.m)}">${esc(t.allNames)} →</a></p></section>
${t.leapNote ? `<section><p class="note">${esc(t.leapNote)}</p></section>` : ""}`;
  return {
    status: 200, maxAge: "midnight", tz: c.data.tz, indexable: true,
    html: page({
      site: ctx.site, path: `${P}/${c.slug}`, lang: c.data.lang, title: t.todayTitle(label), description: `${t.whose}: ${names.join(", ") || "—"}. ${t.week}.`,
      h1: esc(t.todayH1), sub: esc(`${t.weekdays[weekdaySun0(isoToJdn(todayIso))]}, ${label} ${p.y}`),
      hero: tearSheet(p.d, t.months[p.m - 1], t.weekdays[weekdaySun0(isoToJdn(todayIso))], names.join(", ") || "—"), crumbs: [{ href: P, label: "Name days" }, { href: `${P}/${c.slug}`, label: t.countryName }],
      indexable: true, body, footer: sourceFooter(c),
    }),
  };
}

function datePage(ctx: Ctx, c: NamedayCountry, key: string): Rendered | null {
  const m = Number(key.slice(0, 2)), d = Number(key.slice(3));
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= daysInGregorianMonth(2024, m))) return null;
  const t = c.t;
  const names = namesOnKey(c, key);
  const prev = addDaysIso(`2024-${key}`, -1).slice(5), next = addDaysIso(`2024-${key}`, 1).slice(5);
  const label = dateLabel(c, key);
  const leap = c.data.leapRule === "hu-shift" && m === 2 && d >= 24 && t.leapNote ? `<p class="note warn">${esc(t.leapNote)}</p>` : "";
  const body = `<section><p class="big">${names.length ? nameLinks(c, names) : esc(t.noName)}</p>${names.length ? `<p><b>${esc(t.greeting)}</b></p>` : ""}${leap}
<p><a href="${P}/${c.slug}/${prev}">← ${esc(dateLabel(c, prev))}</a> · <a href="${P}/${c.slug}/${next}">${esc(dateLabel(c, next))} →</a> · <a href="${P}/${c.slug}/month/${pad2(m)}">${esc(t.months[m - 1])}</a></p></section>`;
  return {
    status: 200, maxAge: 86400 * 7, indexable: true,
    html: page({
      site: ctx.site, path: `${P}/${c.slug}/${key}`, lang: c.data.lang, title: t.dateTitle(label), description: `${label}: ${names.join(", ") || t.noName}`,
      h1: esc(`${t.whose} ${label}`), hero: tearSheet(d, t.months[m - 1], "", names.join(", ") || "—"), crumbs: [{ href: P, label: "Name days" }, { href: `${P}/${c.slug}`, label: t.countryName }, { href: `${P}/${c.slug}/${key}`, label }],
      indexable: true, body, footer: sourceFooter(c),
    }),
  };
}

function monthPage(ctx: Ctx, c: NamedayCountry, mm: string): Rendered | null {
  const m = Number(mm);
  if (!(m >= 1 && m <= 12)) return null;
  const t = c.t;
  const rows = Array.from({ length: daysInGregorianMonth(2024, m) }, (_, i) => `${mm}-${pad2(i + 1)}`)
    .map((key) => `<tr><td><a href="${P}/${c.slug}/${key}">${esc(dateLabel(c, key))}</a></td><td>${nameLinks(c, namesOnKey(c, key)) || "—"}</td></tr>`).join("");
  const nav = Array.from({ length: 12 }, (_, i) => `<a class="chip" href="${P}/${c.slug}/month/${pad2(i + 1)}">${esc(t.months[i])}</a>`).join("");
  return {
    status: 200, maxAge: 86400 * 7, indexable: true,
    html: page({
      site: ctx.site, path: `${P}/${c.slug}/month/${mm}`, lang: c.data.lang, title: `${t.allNames}: ${t.months[m - 1]} – ${t.countryName}`, description: `${t.allNames} — ${t.months[m - 1]}.`,
      h1: esc(`${t.allNames}: ${t.months[m - 1]}`), crumbs: [{ href: P, label: "Name days" }, { href: `${P}/${c.slug}`, label: t.countryName }, { href: `${P}/${c.slug}/month/${mm}`, label: t.months[m - 1] }],
      indexable: true, body: `<section>${nav}</section><section><table><tbody>${rows}</tbody></table></section>`, footer: sourceFooter(c),
    }),
  };
}

/** Civil date of a month-day key in year y, applying the leap rule; null when the key does not occur that year. */
function keyDateInYear(c: NamedayCountry, key: string, y: number): string | null {
  const m = Number(key.slice(0, 2)), d = Number(key.slice(3));
  if (m === 2 && d === 29 && !isGregorianLeap(y)) return null;
  if (c.data.leapRule === "hu-shift" && m === 2 && d >= 24 && d <= 28 && isGregorianLeap(y)) return `${y}-02-${pad2(d + 1)}`;
  return `${y}-${key}`;
}

function nextOccurrence(c: NamedayCountry, key: string, fromIso: string): string {
  const y0 = Number(fromIso.slice(0, 4));
  for (let y = y0; y < y0 + 9; y++) {
    const iso = keyDateInYear(c, key, y);
    if (iso && iso >= fromIso) return iso;
  }
  return fromIso;
}

function namePage(ctx: Ctx, c: NamedayCountry, slug: string): Rendered | null {
  const entry = nameIndex(c).get(slug);
  if (!entry) return null;
  const t = c.t;
  const display = entry.names[0];
  const todayIso = todayIn(c.data.tz, ctx.now);
  const occurrences = entry.keys.map((key) => ({ key, next: nextOccurrence(c, key, todayIso) })).sort((a, b) => a.next.localeCompare(b.next));
  const soonest = occurrences[0];
  const daysUntil = isoToJdn(soonest.next) - isoToJdn(todayIso);
  const rows = occurrences.map(({ key, next }) => {
    const others = namesOnKey(c, key).filter((n) => !entry.names.includes(n));
    return `<tr><td><a href="${P}/${c.slug}/${key}">${esc(dateLabel(c, key))}</a></td><td>${esc(next)} <span class="muted">(${esc(t.weekdays[weekdaySun0(isoToJdn(next))])})</span></td><td>${nameLinks(c, others) || "—"}</td></tr>`;
  }).join("");
  const body = `<section><p class="big">${esc(t.when(display))}: ${occurrences.map((o) => esc(dateLabel(c, o.key))).join(", ")}</p>
<p>${daysUntil === 0 ? `<b>${esc(t.greeting)}</b>` : `${esc(soonest.next)} · ${daysUntil} d`}</p>
<p><a href="${P}/${c.slug}/name/${slug}.ics">📅 ${esc(t.calendarCta)}</a></p></section>
<section><table><tbody>${rows}</tbody></table></section><section>${searchForm(c)}</section>`;
  return {
    status: 200, maxAge: "midnight", tz: c.data.tz, indexable: true,
    html: page({
      site: ctx.site, path: `${P}/${c.slug}/name/${slug}`, lang: c.data.lang, title: t.nameTitle(display), description: `${t.when(display)}: ${occurrences.map((o) => dateLabel(c, o.key)).join(", ")}.`,
      h1: esc(t.nameH1(display)), hero: (() => { const q = parseIso(soonest.next)!; return tearSheet(q.d, t.months[q.m - 1], t.weekdays[weekdaySun0(isoToJdn(soonest.next))], display); })(), crumbs: [{ href: P, label: "Name days" }, { href: `${P}/${c.slug}`, label: t.countryName }, { href: `${P}/${c.slug}/name/${slug}`, label: display }],
      indexable: true, body, footer: sourceFooter(c),
    }),
  };
}

function nameIcs(ctx: Ctx, c: NamedayCountry, slug: string): Rendered | null {
  const entry = nameIndex(c).get(slug);
  if (!entry) return null;
  const key = entry.keys[0];
  const year = parseIso(todayIn(c.data.tz, ctx.now))!.y;
  return { status: 200, maxAge: 86400, indexable: false, contentType: "text/calendar; charset=utf-8", html: icsYearly(`nameday-${c.slug}-${slug}`, c.t.when(entry.names[0]), Number(key.slice(0, 2)), Number(key.slice(3)), year, `${ctx.site}${P}/${c.slug}/name/${slug}`) };
}

function search(ctx: Ctx, c: NamedayCountry): Rendered {
  const q = (ctx.url.searchParams.get("q") || "").trim().slice(0, 40);
  const slug = slugifyName(q);
  if (slug && nameIndex(c).has(slug)) return { status: 302, location: `${P}/${c.slug}/name/${slug}` };
  const near = [...nameIndex(c).values()].filter((e) => slug && e.slug.startsWith(slug.slice(0, 3))).slice(0, 24);
  return {
    status: 200, maxAge: 300, indexable: false,
    html: page({
      site: ctx.site, path: `${P}/${c.slug}/search`, lang: c.data.lang, title: c.t.search, description: c.t.search, h1: esc(c.t.notFound(q)),
      crumbs: [{ href: P, label: "Name days" }, { href: `${P}/${c.slug}`, label: c.t.countryName }], indexable: false,
      body: `<section>${searchForm(c)}<p>${near.map((e) => `<a class="chip" href="${P}/${c.slug}/name/${e.slug}">${esc(e.names[0])}</a>`).join(" ")}</p></section>`,
    }),
  };
}

function dataset(c: NamedayCountry): Rendered {
  const d = c.data;
  return { status: 200, maxAge: 86400, indexable: false, contentType: "application/json; charset=utf-8", html: JSON.stringify({ country: d.country, source: d.source, license: d.license, days: d.days }, null, 1) };
}

export function namedayRoute(ctx: Ctx, rest: string[]): Rendered | null {
  if (!rest.length) return hub(ctx);
  const c = countryBySlug(rest[0]);
  if (!c) return null;
  if (rest.length === 1) return today(ctx, c);
  if (rest.length === 2) {
    if (rest[1] === "search") return search(ctx, c);
    if (rest[1] === "data.json") return dataset(c);
    if (KEY_RE.test(rest[1])) return datePage(ctx, c, rest[1]);
    return null;
  }
  if (rest.length === 3 && rest[1] === "month") return monthPage(ctx, c, rest[2]);
  if (rest.length === 3 && rest[1] === "name") {
    if (rest[2].endsWith(".ics")) return nameIcs(ctx, c, rest[2].slice(0, -4));
    return namePage(ctx, c, rest[2]);
  }
  return null;
}

/** Sitemap URLs for this family. */
export function namedayUrls(): string[] {
  const out = [P];
  for (const c of NAMEDAY_COUNTRIES.filter((x) => x.enabled)) {
    out.push(`${P}/${c.slug}`);
    for (let m = 1; m <= 12; m++) {
      out.push(`${P}/${c.slug}/month/${pad2(m)}`);
      for (let d = 1; d <= daysInGregorianMonth(2024, m); d++) out.push(`${P}/${c.slug}/${pad2(m)}-${pad2(d)}`);
    }
    for (const e of nameIndex(c).values()) out.push(`${P}/${c.slug}/name/${e.slug}`);
  }
  return out;
}
