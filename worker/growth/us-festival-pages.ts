/**
 * /us/* — Hindu & Nepali festival dates and timing windows for US cities (English).
 *
 *   /us/festivals                 hub: upcoming festivals with New York + Los Angeles dates
 *   /us/{festival}-{year}         one festival: date + window for 27 US cities, compared with India/Nepal/diaspora
 *   /us/ekadashi-{year}           all Ekadashi fasts with parana windows (New York + Los Angeles)
 *   /us/ekadashi-{year}/{city}    same for one US city (noindex — utility page)
 *
 * Demand evidence (Google Trends, US, Oct 2026): "diwali 2026 usa" +1,750%, "karwa chauth 2026" +1,200%,
 * Diwali peaks above "full moon" in the US. Competitor reference: drikpanchang.com (~179K US visits/mo).
 * Why we can win some of it: same accuracy (validated, see research/validation-log.md), faster pages,
 * one page per festival comparing ALL US cities, and explicit "US date vs India date" answers.
 */
import { addDays } from "../../src/patro-tools/core/astro";
import { CITY_BY_SLUG, US_CITIES, WORLD_CITIES, cityLabel, type GrowthCity } from "./cities";
import { breadcrumbs, crumbsHtml, esc, notFound, redirect, shell, siteOrigin, ymd, type GrowthEnv } from "./html";
import { ekadashisOfYear, FESTIVAL_BY_SLUG, FESTIVAL_DEFS, festivalTimings, type FestivalDef, type FestivalTiming } from "./us-festivals";

const NY = CITY_BY_SLUG.get("new-york")!;
const LA = CITY_BY_SLUG.get("los-angeles")!;

const dayLabel = (date: string, style: "long" | "short" = "long") =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: style, month: style === "long" ? "long" : "short", day: "numeric", ...(style === "long" ? { year: "numeric" } : {}) }).format(new Date(date + "T12:00:00Z"));

function t(instant: Date | null | undefined, city: GrowthCity, refDate?: string) {
  if (!instant) return "—";
  const local = ymd(instant, city.tz);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: city.tz, hour: "numeric", minute: "2-digit" }).format(instant);
  if (refDate && local !== refDate) return `${time} (${new Intl.DateTimeFormat("en-US", { timeZone: city.tz, month: "short", day: "numeric" }).format(instant)})`;
  return time;
}

export function yearWindowUs(now = new Date()) {
  const y = now.getUTCFullYear();
  return { min: y - 1, max: y + 3 };
}

function timingCell(def: FestivalDef, x: FestivalTiming, city: GrowthCity) {
  switch (def.timing) {
    case "moonrise": return `Moonrise <strong>${esc(t(x.moonrise, city, x.date))}</strong><div class="note">Fast: sunrise ${esc(t(x.sunrise, city))} → moonrise</div>`;
    case "sunset-sunrise": return `Sunset arghya <strong>${esc(t(x.sunset, city))}</strong><div class="note">Usha arghya: sunrise ${esc(t(x.nextSunrise, city, addDays(x.date, 1)))} next day</div>`;
    case "sunrise": return `Sunrise ${esc(t(x.sunrise, city))}`;
    default:
      if (!x.window) return `<span class="note">Tithi does not overlap the usual window — follow your temple's guidance</span>`;
      return `<strong>${esc(t(x.window.start, city, x.date))} – ${esc(t(x.window.end, city, x.date))}</strong>`;
  }
}

function ruleExplainer(def: FestivalDef) {
  const o = def.rule.observance;
  const tithi = `${def.rule.paksha === "shukla" ? "Shukla" : "Krishna"} ${def.rule.tithi === 15 ? (def.rule.paksha === "shukla" ? "Purnima" : "Amavasya") : `tithi ${def.rule.tithi}`}`;
  const base = `${def.name} falls on ${tithi} of the lunar month (purnimanta naming).`;
  const how = def.rule.moonrise
    ? "The fasting day is the date whose evening moonrise happens while Chaturthi is in force at your location. Because the US is 9½–15½ hours behind India, this is often a different calendar date from India."
    : o === "udaya" ? "The day is the date on which this tithi is in force at local sunrise."
    : o === "pradosh" ? "The day is the evening on which the tithi is in force during pradosh — the first part of the night after sunset (3/15 of the night)."
    : o === "aparahna" ? "The day is the one on which the tithi covers aparahna, the fourth fifth of the daytime (afternoon)."
    : o === "madhyahna" ? "The day is the one on which the tithi covers madhyahna, the third fifth of the daytime (midday)."
    : "The day is the night on which the tithi covers nishita, the period around the middle of the night.";
  return `<p>${esc(base)} ${esc(how)} Times are computed for each city's latitude, longitude and time zone (daylight saving included).</p>`;
}

function festivalPage(request: Request, env: GrowthEnv, def: FestivalDef, year: number) {
  const rows: string[] = [];
  const nyT: FestivalTiming | undefined = festivalTimings(def, year, NY)[0];
  const near = nyT?.date;
  for (const c of US_CITIES) {
    const x = c.slug === NY.slug ? nyT : festivalTimings(def, year, c, near)[0];
    if (!x) { rows.push(`<tr id="${c.slug}"><td>${esc(cityLabel(c))}</td><td colspan="3" class="note">Not in ${year}</td></tr>`); continue; }
    rows.push(`<tr id="${c.slug}"><td>${esc(cityLabel(c))}</td><td>${esc(dayLabel(x.date, "short"))}${x.fallback ? ' <span class="tag">edge case</span>' : ""}</td><td class="wrap">${timingCell(def, x, c)}${x.bhadraEnd ? `<div class="note">Bhadra ends ${esc(t(x.bhadraEnd, c, x.date))}</div>` : ""}</td><td class="wrap note">${esc(t(x.tithiStart, c, x.date))} → ${esc(t(x.tithiEnd, c, x.date))}</td></tr>`);
  }
  const world = WORLD_CITIES.map((c) => {
    const x = festivalTimings(def, year, c, near)[0];
    return x ? `<tr><td>${esc(cityLabel(c))}</td><td>${esc(dayLabel(x.date, "short"))}</td><td class="wrap">${timingCell(def, x, c)}</td></tr>` : "";
  }).join("");
  const delhi = festivalTimings(def, year, CITY_BY_SLUG.get("delhi")!, near)[0];
  const ktm = festivalTimings(def, year, CITY_BY_SLUG.get("kathmandu")!, near)[0];
  if (!nyT) return notFound(`${def.name} does not fall in ${year}`);
  const differsIndia = delhi && delhi.date !== nyT.date;
  const indiaLine = delhi ? `In India (New Delhi) it is <strong>${esc(dayLabel(delhi.date))}</strong>${differsIndia ? " — <strong>a different date from the US</strong>, because the lunar day starts at the same moment worldwide but falls on different local dates" : ", the same date"}.` : "";
  const nepalLine = ktm ? ` Computed date for Nepal: ${esc(dayLabel(ktm.date))}${def.ne ? ` (${esc(def.ne)})` : ""}; Nepal's official holiday list is on the <a href="/festivals">Nepali calendar</a>.` : "";
  const keyTime = def.timing === "moonrise" ? `Moonrise in New York: <strong>${esc(t(nyT.moonrise, NY, nyT.date))}</strong> ET.`
    : def.timing === "sunset-sunrise" ? `Sunset arghya in New York: <strong>${esc(t(nyT.sunset, NY))}</strong> ET; usha arghya next morning at ${esc(t(nyT.nextSunrise, NY))}.`
    : nyT.window ? `${esc(def.timingLabel)} in New York: <strong>${esc(t(nyT.window.start, NY, nyT.date))} – ${esc(t(nyT.window.end, NY, nyT.date))}</strong> ET.` : "";
  const related = (def.related || []).map((s) => FESTIVAL_BY_SLUG.get(s)).filter(Boolean) as FestivalDef[];
  const { min, max } = yearWindowUs();
  const years = []; for (let y = min; y <= max; y++) years.push(y);
  const path = `/us/${def.slug}-${year}`;
  const crumbs: Array<[string, string]> = [["Aafnai Patro", "/"], ["US festival times", "/us/festivals"], [`${def.name} ${year}`, path]];
  const body = `${crumbsHtml(crumbs)}
<h1>${esc(def.name)} ${year} in the USA: Date and ${esc(def.timing === "moonrise" ? "Moonrise Time" : def.timing === "sunset-sunrise" ? "Arghya Times" : "Muhurat")} by City</h1>
${def.verified ? "" : `<p class="answer note">Provisional: this festival's rule is still being checked against an independent panchang. Confirm with your temple.</p>`}
<div class="answer"><p>In the US, ${esc(def.name)} ${year} is on <strong>${esc(dayLabel(nyT.date))}</strong> (New York; same date in most US cities — see the table).${nyT.publicDate ? ` ${esc(def.publicLabel || "Main celebration")}: ${esc(dayLabel(nyT.publicDate))}.` : ""}</p><p>${keyTime}</p><p>${indiaLine}${nepalLine}</p></div>
<section class="card"><h2>${esc(def.name)} ${year} — every major US city</h2><div class="tablewrap"><table><thead><tr><th>City</th><th>Date</th><th>${esc(def.timingLabel)}</th><th>Tithi (local)</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
<p class="note">All times are local to each city. Cities in the same metro (e.g. Edison and New York) can differ by a minute or two.</p></section>
<section class="card"><h2>Canada, UK, Australia, Gulf, India and Nepal</h2><div class="tablewrap"><table><thead><tr><th>City</th><th>Date</th><th>${esc(def.timingLabel)}</th></tr></thead><tbody>${world}</tbody></table></div></section>
<section class="card"><h2>About ${esc(def.name)}</h2><p>${esc(def.about)}</p>${def.alt?.length ? `<p class="note">Also called: ${esc(def.alt.join(", "))}.</p>` : ""}<h3>How the date is decided</h3>${ruleExplainer(def)}
<p class="note">Different families and temples follow different traditions (for example Smarta vs Vaishnava, or Nepal's official list). When in doubt, follow your family priest or local temple.</p></section>
${related.length ? `<section class="card"><h2>Related</h2><p class="links">${related.map((r) => `<a href="/us/${r.slug}-${year}">${esc(r.name)} ${year}</a>`).join("")}<a href="/us/ekadashi-${year}">Ekadashi ${year}</a><a href="/moon/full-moon/${year}">Full moons ${year}</a></p></section>` : ""}
<section class="card"><h2>Other years</h2><p class="links">${years.map((y) => (y === year ? `<span class="tag">${y}</span>` : `<a href="/us/${def.slug}-${y}">${esc(def.name)} ${y}</a>`)).join("")}</p></section>`;
  const description = `${def.name} ${year} in the USA is on ${dayLabel(nyT.date)}. ${def.timingLabel} for New York, New Jersey, Dallas, Houston, Chicago, Bay Area, Los Angeles, Atlanta, DC and 18 more US cities${differsIndia ? `; India observes it on ${dayLabel(delhi!.date, "short")}` : ""}.`;
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: `${def.name} ${year} in the USA`, url: siteOrigin(env) + path, inLanguage: "en", description, about: { "@type": "Thing", name: def.name, alternateName: def.alt } },
    breadcrumbs(env, crumbs),
  ] };
  return shell(request, env, {
    title: `${def.name} ${year} USA Date & ${def.timing === "moonrise" ? "Moonrise Time" : def.timing === "sunset-sunrise" ? "Arghya Time" : "Muhurat"} — NY, NJ, TX, CA & All US Cities`,
    description, body, schema, index: !!def.verified, sMaxAge: 604_800, backend: "growth-us-festival",
  });
}

function ekadashiPage(request: Request, env: GrowthEnv, year: number, city: GrowthCity | null, now: Date) {
  const primary = city ?? NY;
  const list = ekadashisOfYear(year, primary);
  const second = city ? null : ekadashisOfYear(year, LA);
  const next = list.find((e) => e.date >= ymd(now, primary.tz));
  const rows = list.map((e) => {
    const la = second?.find((x) => x.name === e.name && Math.abs(Date.parse(x.date) - Date.parse(e.date)) < 3 * 86_400_000);
    const pd = addDays(e.date, 1);
    return `<tr${next && next.date === e.date ? ' style="font-weight:600"' : ""}><td class="wrap"><strong>${esc(e.name)}</strong>${e.adhik ? ' <span class="tag">Adhik</span>' : ""}</td><td>${esc(dayLabel(e.date, "short"))}</td><td>${esc(t(e.parana.start, primary, pd))} – ${esc(t(e.parana.end, primary, pd))}<div class="note">${esc(dayLabel(pd, "short"))}</div></td>${second ? `<td>${la ? `${esc(dayLabel(la.date, "short"))}<div class="note">parana ${esc(t(la.parana.start, LA, addDays(la.date, 1)))} – ${esc(t(la.parana.end, LA, addDays(la.date, 1)))}</div>` : "—"}</td>` : ""}<td class="wrap note">${esc(e.parana.note || "")}</td></tr>`;
  }).join("");
  const label = cityLabel(primary);
  const path = city ? `/us/ekadashi-${year}/${city.slug}` : `/us/ekadashi-${year}`;
  const crumbs: Array<[string, string]> = [["Aafnai Patro", "/"], ["US festival times", "/us/festivals"], [`Ekadashi ${year}`, `/us/ekadashi-${year}`], ...(city ? [[city.name, path] as [string, string]] : [])];
  const body = `${crumbsHtml(crumbs)}
<h1>Ekadashi ${year} Dates in the USA${city ? ` — ${esc(label)}` : ""} (with Parana Time)</h1>
<div class="answer">${next ? `<p>Next Ekadashi${city ? ` in ${esc(city.name)}` : " (New York)"}: <strong>${esc(next.name)}</strong> on <strong>${esc(dayLabel(next.date))}</strong>. Break the fast (parana) on ${esc(dayLabel(addDays(next.date, 1), "short"))} between ${esc(t(next.parana.start, primary))} and ${esc(t(next.parana.end, primary))}.</p>` : `<p>${year} has ${list.length} Ekadashis.</p>`}
<p>${year} has <strong>${list.length} Ekadashi fasts</strong>${list.some((e) => e.adhik) ? " (including Padmini and Parama in the Adhik month)" : ""}. US dates can differ from India by a day, so use the dates for your own city.</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>Ekadashi</th><th>Fast${second ? " (New York, ET)" : ""}</th><th>Parana (break fast)</th>${second ? "<th>Los Angeles (PT)</th>" : ""}<th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Rule used: householder (Smarta) tradition — the fasting day has Ekadashi at local sunrise; when Ekadashi touches two sunrises the second day is taken, and when Dwadashi ends before the next sunrise the fast moves a day earlier. Parana is after sunrise and after Hari Vasara (the first quarter of Dwadashi), in the morning when possible, otherwise in the afternoon. ISKCON/Vaishnava dates can differ — notes show where.</p></section>
<section class="card"><h2>Ekadashi ${year} for your city</h2><p class="links">${US_CITIES.map((c) => `<a href="/us/ekadashi-${year}/${c.slug}">${esc(c.name)}</a>`).join("")}</p></section>`;
  return shell(request, env, {
    title: city ? `Ekadashi ${year} in ${label}: All Dates & Parana Times` : `Ekadashi ${year} USA: All ${list.length} Dates & Parana Times (ET & PT)`,
    description: `All ${list.length} Ekadashi fasting dates for ${year} in ${city ? label : "the USA (New York and Los Angeles)"}, with parana (fast-breaking) times, Adhik month Ekadashis and Smarta/Vaishnava notes.`,
    body, schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `Ekadashi ${year}`, url: siteOrigin(env) + path, inLanguage: "en" }, breadcrumbs(env, crumbs)] },
    index: !city, sMaxAge: 86_400, backend: "growth-us-ekadashi",
  });
}

function hubPage(request: Request, env: GrowthEnv, now: Date) {
  const today = ymd(now, NY.tz);
  const y = now.getUTCFullYear();
  const items: Array<{ def: FestivalDef; date: string; year: number }> = [];
  for (const year of [y, y + 1]) for (const def of FESTIVAL_DEFS) {
    const x = festivalTimings(def, year, NY)[0];
    if (x && x.date >= today && x.date <= addDays(today, 370)) items.push({ def, date: x.date, year });
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["US festival times", "/us/festivals"]])}
<h1>Hindu and Nepali Festival Dates in the USA (Next 12 Months)</h1>
<div class="answer"><p>Dates for the US are worked out from local sunrise, sunset and moonrise, so they can differ from India or Nepal by a day. Each festival page lists the date and the key time for 27 US cities.</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>Festival</th><th>New York</th><th>Los Angeles</th></tr></thead><tbody>
${items.map(({ def, date, year }) => { const la = festivalTimings(def, year, LA, date)[0]; return `<tr><td><a href="/us/${def.slug}-${year}">${esc(def.name)} ${year}</a>${def.verified ? "" : ' <span class="tag">provisional</span>'}</td><td>${esc(dayLabel(date, "short"))}</td><td>${la ? esc(dayLabel(la.date, "short")) : "—"}</td></tr>`; }).join("")}
</tbody></table></div><p class="links"><a href="/us/ekadashi-${y}">Ekadashi ${y}</a><a href="/us/ekadashi-${y + 1}">Ekadashi ${y + 1}</a><a href="/moon/full-moon/${y}">Purnima / full moons ${y}</a><a href="/moon/new-moon/${y}">Amavasya / new moons ${y}</a></p></section>`;
  return shell(request, env, {
    title: "Hindu & Nepali Festival Dates in the USA — Diwali, Karwa Chauth, Ekadashi & More",
    description: "Upcoming Hindu and Nepali festival dates for the US with local muhurat, moonrise and arghya times for 27 cities: Diwali, Dhanteras, Bhai Dooj, Karwa Chauth, Chhath, Ekadashi and more.",
    body, schema: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", name: "Festival dates in the USA", url: siteOrigin(env) + "/us/festivals", inLanguage: "en" }, breadcrumbs(env, [["Aafnai Patro", "/"], ["US festival times", "/us/festivals"]])] },
    sMaxAge: 21_600, backend: "growth-us-hub",
  });
}

export function usFestivalRoutes(now = new Date()) {
  const { min, max } = yearWindowUs(now);
  const routes = ["/us/festivals"];
  for (let y = min; y <= max; y++) {
    routes.push(`/us/ekadashi-${y}`);
    for (const def of FESTIVAL_DEFS) if (def.verified) routes.push(`/us/${def.slug}-${y}`);
  }
  return routes;
}

export async function usFestivalPageResponse(request: Request, env: GrowthEnv, now = new Date()): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const raw = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const path = raw.toLowerCase();
  if (path !== "/us" && !path.startsWith("/us/")) return null;
  if (raw !== path) return redirect(request, path);
  try {
    if (path === "/us") return redirect(request, "/us/festivals", 302);
    if (path === "/us/festivals") return hubPage(request, env, now);
    const { min, max } = yearWindowUs(now);
    let m = path.match(/^\/us\/ekadashi-(\d{4})(?:\/([a-z-]+))?$/);
    if (m) {
      const year = Number(m[1]);
      if (year < min || year > max) return notFound("Year outside the published window");
      const city = m[2] ? CITY_BY_SLUG.get(m[2]) : null;
      if (m[2] && (!city || city.country !== "US")) return notFound("Unknown city");
      return ekadashiPage(request, env, year, city ?? null, now);
    }
    m = path.match(/^\/us\/([a-z-]+)-(\d{4})$/);
    if (m) {
      const def = FESTIVAL_BY_SLUG.get(m[1]);
      const year = Number(m[2]);
      if (!def) return notFound("Unknown festival");
      if (year < min || year > max) return notFound("Year outside the published window");
      return festivalPage(request, env, def, year);
    }
    return null;
  } catch (error) {
    return new Response("Festival page temporarily unavailable", { status: 503, headers: { "cache-control": "no-store", "retry-after": "120", "x-robots-tag": "noindex, nofollow", "x-error": String((error as Error)?.message || error).slice(0, 120) } });
  }
}
