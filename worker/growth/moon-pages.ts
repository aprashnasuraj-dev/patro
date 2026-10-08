/**
 * /moon page family (English, US-first) — Worker-rendered, no D1.
 *
 *   /moon                         Moon phase today (live, 15-min edge cache)
 *   /moon/{city}                  Moonrise/moonset today + 30-day table with Hindu tithi at sunrise
 *   /moon/full-moon/{year}        Full moon dates, times in every US zone, names, eclipses, Purnima names
 *   /moon/new-moon/{year}         New moon (Amavasya) dates and times
 *   /moon/calendar/{year}         All four principal phases for the year
 *   /moon/{month}-{year}          Day-by-day phase table for one month
 *
 * Demand evidence (Oct 2026): "moon phase today" ~242K/mo US, "current moon phase" ~106K,
 * "is it a full moon tonight" ~82K, "full moon 2026" + "<month> full moon 2026" rising (Google Trends).
 */
import { sunriseSunset, zonedMidnight, addDays } from "../../src/patro-tools/core/astro";
import { ALL_CITIES, CITY_BY_SLUG, US_CITIES, cityLabel, type GrowthCity } from "./cities";
import {
  breadcrumbs, crumbsHtml, esc, fmtDate, moonLiveBlock, fmtTime, moonSvg, MONTH_NAMES, MONTH_SLUGS, notFound, redirect,
  shell, siteOrigin, US_ZONES, ymd, type GrowthEnv,
} from "./html";
import {
  fullMoonsOfYear, illuminationFraction, moonAgeDays, moonAltitude, moonDistanceKm, moonRiseSet, newMoonsOfYear,
  nextQuarter, phaseAngle, phaseName, QUARTER_LABEL, quartersBetween, tithiAt, yearWindow, type QuarterKind,
} from "./moon";
import { EN_PHASES, fullMoonAlternates, moonTodayAlternates } from "./i18n";

const ET = "America/New_York";
const PT = "America/Los_Angeles";
const pct = (x: number) => `${Math.round(x * 100)}%`;
const km = (x: number) => `${Math.round(x).toLocaleString("en-US")} km`;
const mi = (x: number) => `${Math.round(x * 0.621371).toLocaleString("en-US")} mi`;

function zoneCells(instant: Date, zones = US_ZONES.slice(0, 5)) {
  return zones.map((z) => `<td>${esc(fmtTime(instant, z.tz, { date: true }))}</td>`).join("");
}
function zoneHeads(zones = US_ZONES.slice(0, 5)) {
  return zones.map((z) => `<th>${esc(z.label)}</th>`).join("");
}
function yearLinks(base: string, current: number) {
  const { min, max } = yearWindow();
  const ys: number[] = [];
  for (let y = min; y <= max; y++) ys.push(y);
  return `<p class="links">${ys.map((y) => (y === current ? `<span class="tag">${y}</span>` : `<a href="${base}/${y}">${y}</a>`)).join("")}</p>`;
}
function cityLinks(cities: GrowthCity[] = ALL_CITIES) {
  return `<p class="links">${cities.map((c) => `<a href="/moon/${c.slug}">${esc(c.name)}</a>`).join("")}</p>`;
}

// ---------------------------------------------------------------------------- /moon
function todayPage(request: Request, env: GrowthEnv, now: Date) {
  const angle = phaseAngle(now);
  const name = phaseName(now);
  const illum = illuminationFraction(now);
  const age = moonAgeDays(now);
  const dist = moonDistanceKm(now);
  const tithi = tithiAt(now);
  const nextFull = nextQuarter(now, "full");
  const nextNew = nextQuarter(now, "new");
  const nexts = (["new", "first", "full", "last"] as QuarterKind[]).map((k) => nextQuarter(now, k)).sort((a, b) => +a.instant - +b.instant);
  const hoursToFull = (nextFull.instant.getTime() - now.getTime()) / 3_600_000;
  const prevFullClose = quartersBetween(new Date(now.getTime() - 30 * 3_600_000), now).some((q) => q.kind === "full");
  const fullTonight = hoursToFull < 30 || prevFullClose;
  const year = Number(ymd(nextFull.instant, ET).slice(0, 4));
  const fm = fullMoonsOfYear(year).find((f) => Math.abs(+f.instant - +nextFull.instant) < 60_000);
  const nextFullName = fm ? fm.usName : "Full Moon";
  const dateET = fmtDate(now, ET);
  const daysToFull = Math.max(0, Math.round(hoursToFull / 24));

  const answer = fullTonight
    ? `<p><strong>Yes — the Moon is full${hoursToFull < 30 && hoursToFull > 0 ? ` at ${esc(fmtTime(nextFull.instant, ET, { date: true }))} ET` : " right now"}.</strong> It looks full to the eye for about a night either side.</p>`
    : `<p><strong>No — tonight is not a full moon.</strong> The next full moon${fm ? ` (the ${esc(nextFullName)})` : ""} is <strong>${esc(fmtDate(nextFull.instant, ET))}</strong> at ${esc(fmtTime(nextFull.instant, ET))} ET — in about ${daysToFull} day${daysToFull === 1 ? "" : "s"}.</p>`;

  const major = US_CITIES.filter((c) => ["new-york", "chicago", "dallas", "denver", "los-angeles", "seattle", "atlanta", "washington-dc"].includes(c.slug));
  const riseRows = major.map((c) => {
    const d = ymd(now, c.tz);
    const rs = moonRiseSet(d, c, zonedMidnight);
    return `<tr><td><a href="/moon/${c.slug}">${esc(cityLabel(c))}</a></td><td>${esc(fmtTime(rs.rise, c.tz))}</td><td>${esc(fmtTime(rs.set, c.tz))}</td></tr>`;
  }).join("");

  const upcoming = fullMoonsOfYear(year).concat(fullMoonsOfYear(year + 1)).filter((f) => f.instant > now).slice(0, 3);
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["Moon", "/moon"]])}
<div class="hero">${moonSvg(angle, 88, "m-svg")}<div><h1>Moon Phase Today: <span data-m="m-phase">${esc(name)}</span></h1><p class="note">Values update live in your browser · times in your own time zone</p></div></div>
<div class="answer"><p>Today's moon is a <strong data-m="m-phase">${esc(name)}</strong>, <span data-m="m-lit">${pct(illum)}</span> illuminated and <span data-m="m-age">${age.toFixed(1)}</span> days old.</p><div id="m-answer">${answer}</div></div>
<section class="card grid">
 <div class="stat"><b>Phase</b><span data-m="m-phase">${esc(name)}</span></div>
 <div class="stat"><b>Illumination</b><span data-m="m-lit">${pct(illum)}</span></div>
 <div class="stat"><b>Moon age</b><span><span data-m="m-age">${age.toFixed(1)}</span> days</span></div>
 <div class="stat"><b>Distance from Earth</b><span>${km(dist)}</span><div class="note">${mi(dist)}</div></div>
 <div class="stat"><b>Hindu lunar day (tithi)</b><span>${esc(tithi.en)}</span><div class="note" lang="ne">${esc(tithi.ne)}</div></div>
 <div class="stat"><b>Next new moon</b><span>${esc(fmtTime(nextNew.instant, ET, { date: true }))} ET</span></div>
</section>
<section class="card"><h2>Next moon phases in US time zones</h2><div class="tablewrap"><table><thead><tr><th>Phase</th>${zoneHeads()}</tr></thead><tbody>
${nexts.map((q) => `<tr><td>${esc(QUARTER_LABEL[q.kind])}</td>${zoneCells(q.instant)}</tr>`).join("")}
</tbody></table></div></section>
<section class="card"><h2>Moonrise and moonset today</h2><div class="tablewrap"><table><thead><tr><th>City</th><th>Moonrise</th><th>Moonset</th></tr></thead><tbody>${riseRows}</tbody></table></div>
<p class="note">Local times for each city's calendar date. "—" means the Moon does not rise or set on that date.</p><h3>More cities</h3>${cityLinks()}</section>
<section class="card"><h2>Upcoming full moons</h2><ul>${upcoming.map((f) => `<li><strong>${esc(f.usName)}</strong> — ${esc(fmtDate(f.instant, ET))}, ${esc(fmtTime(f.instant, ET))} ET${f.observance ? ` · ${esc(f.observance)}` : ""}${f.eclipse ? ` · <strong>${esc(f.eclipse.kind)} lunar eclipse</strong>` : ""}</li>`).join("")}</ul>
<p class="links"><a href="/moon/full-moon/${year}">Full moon calendar ${year}</a><a href="/moon/new-moon/${year}">New moons ${year}</a><a href="/moon/calendar/${year}">Moon phase calendar ${year}</a><a href="/moon/${MONTH_SLUGS[Number(ymd(now, ET).slice(5, 7)) - 1]}-${ymd(now, ET).slice(0, 4)}">This month day by day</a></p></section>
${moonLiveBlock({ quarters: quartersBetween(new Date(now.getTime() - 40 * 86_400_000), new Date(now.getTime() + 400 * 86_400_000)).map((q) => [q.kind, q.instant.getTime()] as [string, number]), phases: EN_PHASES, intl: "en-US", yes: "<p><strong>Yes — the Moon is full tonight.</strong> It looks full to the eye for about a night either side.</p>", no: "<p><strong>No — tonight is not a full moon.</strong> The next full moon is <strong>{date}</strong> at {time} (your time) — in about {days} days.</p>" })}
<section class="card"><h2>How these numbers are calculated</h2><p>Phase, illumination and distance are computed for the current moment from an astronomical model (astronomy-engine, ~1 arc-minute accuracy). Principal phases (new, first quarter, full, last quarter) are exact instants; we name a day by its principal phase when that instant is within 12 hours. The Hindu lunar day (tithi) is the 12° step of the Moon–Sun angle used by Nepali and Indian calendars — see the <a href="/">Nepali calendar</a> for today's official tithi in Nepal.</p></section>`;

  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: `Moon Phase Today: ${name}`, url: siteOrigin(env) + "/moon", inLanguage: "en", dateModified: now.toISOString(),
      about: { "@type": "Thing", name: "Moon phase" }, description: `Today's moon: ${name}, ${pct(illum)} illuminated. Next full moon ${fmtDate(nextFull.instant, ET)}.` },
    breadcrumbs(env, [["Aafnai Patro", "/"], ["Moon", "/moon"]]),
  ] };
  return shell(request, env, {
    title: `Moon Phase Today (${fmtDate(now, ET, "short")}): ${name}, ${pct(illum)} Lit | Is Tonight a Full Moon?`,
    description: `Moon phase today: ${name}, ${pct(illum)} illuminated, ${age.toFixed(1)} days old. Next full moon: ${fmtDate(nextFull.instant, ET)} ${fmtTime(nextFull.instant, ET)} ET. Moonrise & moonset for US cities.`,
    body, schema, sMaxAge: 900, backend: "growth-moon-today", alternates: moonTodayAlternates(),
  });
}

// ---------------------------------------------------------------------------- /moon/{city}
function cityPage(request: Request, env: GrowthEnv, city: GrowthCity, now: Date) {
  const today = ymd(now, city.tz);
  const rows: string[] = [];
  let todayRs = { rise: null as Date | null, set: null as Date | null };
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, i);
    const rs = moonRiseSet(d, city, zonedMidnight);
    if (i === 0) todayRs = rs;
    let tithi = "—";
    try { const { sunrise } = sunriseSunset(d, city); const t = tithiAt(sunrise); tithi = `${t.en}`; } catch { /* polar day/night */ }
    const noon = new Date(zonedMidnight(d, city.tz).getTime() + 12 * 3_600_000);
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(d + "T12:00:00Z"));
    rows.push(`<tr><td>${esc(label)}</td><td>${esc(fmtTime(rs.rise, city.tz))}</td><td>${esc(fmtTime(rs.set, city.tz))}</td><td>${esc(phaseName(noon))}</td><td>${pct(illuminationFraction(noon))}</td><td>${esc(tithi)}</td></tr>`);
  }
  const angle = phaseAngle(now);
  const name = phaseName(now);
  const nextFull = nextQuarter(now, "full");
  const others = (city.country === "US" ? US_CITIES : ALL_CITIES).filter((c) => c.slug !== city.slug).slice(0, 18);
  const label = cityLabel(city);
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["Moon", "/moon"], [city.name, `/moon/${city.slug}`]])}
<div class="hero">${moonSvg(angle)}<div><h1>Moonrise and Moonset Today in ${esc(label)}</h1><p class="note">${esc(fmtDate(now, city.tz))} · times in ${esc(city.tz.replace(/_/g, " "))}</p></div></div>
<div class="answer"><p>Moonrise: <strong>${esc(fmtTime(todayRs.rise, city.tz))}</strong> · Moonset: <strong>${esc(fmtTime(todayRs.set, city.tz))}</strong></p>
<p>The Moon is a ${esc(name)} (${pct(illuminationFraction(now))} lit). Next full moon in ${esc(city.name)}: ${esc(fmtDate(nextFull.instant, city.tz))} at ${esc(fmtTime(nextFull.instant, city.tz))}.</p></div>
<section class="card"><h2>Moon times for the next 30 days in ${esc(city.name)}</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Moonrise</th><th>Moonset</th><th>Phase (noon)</th><th>Lit</th><th>Tithi at sunrise</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
<p class="note">"Tithi at sunrise" is the Hindu lunar day in force at local sunrise in ${esc(city.name)} — the rule most temples use for fasts like Ekadashi. It can differ from the tithi in India or Nepal on the same date.</p></section>
<section class="card"><h2>Other cities</h2>${cityLinks(others)}<p class="links"><a href="/moon">Moon phase today</a><a href="/us/festivals">Festival dates &amp; muhurat in US cities</a></p></section>`;
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: `Moonrise and Moonset in ${label}`, url: `${siteOrigin(env)}/moon/${city.slug}`, inLanguage: "en",
      about: { "@type": "Place", name: label, geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lon } } },
    breadcrumbs(env, [["Aafnai Patro", "/"], ["Moon", "/moon"], [city.name, `/moon/${city.slug}`]]),
  ] };
  return shell(request, env, {
    title: `Moonrise & Moonset Today in ${label} — Moon Phase & 30-Day Times`,
    description: `Moonrise ${fmtTime(todayRs.rise, city.tz)}, moonset ${fmtTime(todayRs.set, city.tz)} today in ${label}. 30-day moonrise/moonset table with moon phase, illumination and Hindu tithi at sunrise.`,
    body, schema, sMaxAge: 3600, backend: "growth-moon-city",
  });
}

// ---------------------------------------------------------------------------- /moon/full-moon/{year}
function fullMoonYearPage(request: Request, env: GrowthEnv, year: number, now: Date) {
  const list = fullMoonsOfYear(year);
  const next = list.find((f) => f.instant > now);
  const vis = US_CITIES.filter((c) => ["new-york", "chicago", "denver", "los-angeles", "honolulu"].includes(c.slug));
  const rows = list.map((f) => {
    const flags = [f.blueMoon ? "Blue Moon" : "", f.closestOfYear ? "Closest (biggest) full moon of the year" : "", f.farthestOfYear ? "Farthest (smallest)" : "", f.eclipse ? `${f.eclipse.kind} lunar eclipse` : ""].filter(Boolean);
    return `<tr${next && +f.instant === +next.instant ? ' style="font-weight:600"' : ""}><td class="wrap"><strong>${esc(f.usName)}</strong>${f.usNameNote ? `<div class="note">also ${esc(f.usNameNote)}</div>` : ""}</td><td>${esc(fmtDate(f.instant, ET, "short"))}</td>${zoneCells(f.instant)}<td>${esc(fmtTime(f.instant, "UTC", { date: true }))}</td><td>${esc(fmtTime(f.instant, "Asia/Kathmandu", { date: true }))}</td><td class="wrap">${esc(f.hinduMonth.roman)} Purnima${f.hinduMonth.adhik ? " (Adhik)" : ""}${f.observance ? `<div class="note">${esc(f.observance)}</div>` : ""}</td><td>${km(f.distanceKm)}</td><td class="wrap">${flags.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</td></tr>`;
  }).join("");
  const eclipses = list.filter((f) => f.eclipse);
  const eclipseHtml = eclipses.length ? `<section class="card"><h2>Lunar eclipses in ${year}</h2>${eclipses.map((f) => {
    const e = f.eclipse!;
    const dur = e.kind === "total" ? `${Math.round(e.sdTotalMin * 2)} min of totality` : e.kind === "partial" ? `${Math.round(e.sdPartialMin * 2)} min partial phase` : `${Math.round(e.sdPenumMin * 2)} min penumbral`;
    return `<h3>${esc(e.kind[0].toUpperCase() + e.kind.slice(1))} lunar eclipse — ${esc(fmtDate(e.peak, ET))}</h3><p>Peak: ${esc(fmtTime(e.peak, ET))} ET · ${esc(fmtTime(e.peak, PT))} PT · ${esc(fmtTime(e.peak, "UTC"))} UTC · ${dur}.</p>
<div class="tablewrap"><table><thead><tr><th>City</th><th>Moon at peak</th></tr></thead><tbody>${vis.map((c) => { const alt = moonAltitude(e.peak, c); return `<tr><td>${esc(cityLabel(c))}</td><td>${alt > 0 ? `Visible — ${Math.round(alt)}° above the horizon` : "Below the horizon (not visible at peak)"}</td></tr>`; }).join("")}</tbody></table></div>`;
  }).join("")}<p class="note">Hindu tradition observes a sutak (inauspicious) period before an eclipse; rules vary by family and temple.</p></section>` : "";
  const answer = next
    ? `<p>The next full moon is the <strong>${esc(next.usName)}</strong> on <strong>${esc(fmtDate(next.instant, ET))}</strong> at ${esc(fmtTime(next.instant, ET))} ET (${esc(fmtTime(next.instant, PT))} PT).</p>`
    : `<p>${year} had ${list.length} full moons. The first was the ${esc(list[0].usName)} on ${esc(fmtDate(list[0].instant, ET))}.</p>`;
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["Moon", "/moon"], [`Full moons ${year}`, `/moon/full-moon/${year}`]])}
<h1>Full Moon Calendar ${year}: Dates, Times and Names</h1>
<div class="answer">${answer}<p>${year} has <strong>${list.length} full moons</strong>${list.some((f) => f.blueMoon) ? ", including a Blue Moon" : ""}${eclipses.length ? ` and ${eclipses.length} lunar eclipse${eclipses.length > 1 ? "s" : ""}` : ""}.</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>Name</th><th>Date (ET)</th>${zoneHeads()}<th>UTC</th><th>Nepal</th><th>Hindu month · festival</th><th>Distance</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Names follow the traditional North American (Old Farmer's Almanac) convention by Eastern-time calendar month. Harvest Moon = the full moon closest to the September equinox; Hunter's Moon = the one after it. Blue Moon = the second full moon in one calendar month (Eastern time). Hindu month names are amanta (the month that began at the previous new moon); Purnima festivals can fall a day earlier or later depending on local sunrise.</p></section>
${eclipseHtml}
<section class="card"><h2>Other years</h2>${yearLinks("/moon/full-moon", year)}<p class="links"><a href="/moon/new-moon/${year}">New moons ${year}</a><a href="/moon/calendar/${year}">All moon phases ${year}</a><a href="/moon">Moon today</a></p></section>`;
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: `Full Moon Calendar ${year}`, url: `${siteOrigin(env)}/moon/full-moon/${year}`, inLanguage: "en",
      mainEntity: { "@type": "ItemList", numberOfItems: list.length, itemListElement: list.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: `${f.usName} — ${fmtDate(f.instant, ET)}` })) } },
    breadcrumbs(env, [["Aafnai Patro", "/"], ["Moon", "/moon"], [`Full moons ${year}`, `/moon/full-moon/${year}`]]),
  ] };
  return shell(request, env, {
    title: `Full Moon ${year}: All ${list.length} Dates, Times (ET/CT/MT/PT) & Names`,
    description: `Every full moon in ${year} with exact times in Eastern, Central, Mountain and Pacific time, traditional names (Wolf, Harvest, Hunter's...), supermoons, Blue Moon, lunar eclipses and Hindu Purnima names.`,
    body, schema, sMaxAge: next ? 21_600 : 604_800, backend: "growth-moon-full-year", alternates: fullMoonAlternates(year),
  });
}

// ---------------------------------------------------------------------------- /moon/new-moon/{year}
function newMoonYearPage(request: Request, env: GrowthEnv, year: number, now: Date) {
  const list = newMoonsOfYear(year);
  const next = list.find((n) => n.instant > now);
  const rows = list.map((n) => `<tr><td>${esc(fmtDate(n.instant, ET, "short"))}</td>${zoneCells(n.instant)}<td>${esc(fmtTime(n.instant, "UTC", { date: true }))}</td><td>${esc(fmtTime(n.instant, "Asia/Kathmandu", { date: true }))}</td><td class="wrap">${esc(n.purnimanta)} Aunsi / Amavasya<div class="note">Amanta: end of ${esc(n.amantaEnding)}</div></td></tr>`).join("");
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["Moon", "/moon"], [`New moons ${year}`, `/moon/new-moon/${year}`]])}
<h1>New Moon Calendar ${year}: Dates and Times (Amavasya)</h1>
<div class="answer">${next ? `<p>The next new moon is <strong>${esc(fmtDate(next.instant, ET))}</strong> at ${esc(fmtTime(next.instant, ET))} ET (${esc(fmtTime(next.instant, PT))} PT).</p>` : `<p>${year} had ${list.length} new moons.</p>`}<p>New moons are the darkest nights of the month — best for stargazing — and mark Amavasya (Aunsi) in Hindu and Nepali calendars.</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>Date (ET)</th>${zoneHeads()}<th>UTC</th><th>Nepal</th><th>Hindu name</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Nepal and North India name Amavasya by the purnimanta month (e.g. Laxmi Puja is "Kartik Aunsi"); South and West India use the amanta month that ends at that new moon.</p></section>
<section class="card"><h2>Other years</h2>${yearLinks("/moon/new-moon", year)}<p class="links"><a href="/moon/full-moon/${year}">Full moons ${year}</a><a href="/moon/calendar/${year}">All moon phases ${year}</a></p></section>`;
  return shell(request, env, {
    title: `New Moon ${year}: Dates & Times in US Time Zones (Amavasya Calendar)`,
    description: `All ${list.length} new moons of ${year} with exact Eastern, Central, Mountain and Pacific times, plus Nepal time and Hindu Amavasya (Aunsi) month names.`,
    body, schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `New Moon Calendar ${year}`, url: `${siteOrigin(env)}/moon/new-moon/${year}`, inLanguage: "en" }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Moon", "/moon"], [`New moons ${year}`, `/moon/new-moon/${year}`]])] },
    sMaxAge: next ? 21_600 : 604_800, backend: "growth-moon-new-year",
  });
}

// ---------------------------------------------------------------------------- /moon/calendar/{year}
function calendarYearPage(request: Request, env: GrowthEnv, year: number) {
  const qs = quartersBetween(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1)));
  const byMonth = MONTH_NAMES.map((m, i) => ({ m, i, items: qs.filter((q) => Number(ymd(q.instant, ET).slice(5, 7)) - 1 === i && ymd(q.instant, ET).startsWith(String(year))) }));
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["Moon", "/moon"], [`Moon calendar ${year}`, `/moon/calendar/${year}`]])}
<h1>Moon Phase Calendar ${year}</h1>
<div class="answer"><p>All ${qs.length} principal moon phases of ${year} — new moon, first quarter, full moon and last quarter — with Eastern and Pacific times. Open a month for the day-by-day phase and illumination.</p></div>
<section class="grid">${byMonth.map(({ m, i, items }) => `<div class="card"><h2><a href="/moon/${MONTH_SLUGS[i]}-${year}">${m} ${year}</a></h2><table><tbody>${items.map((q) => `<tr><td>${esc(QUARTER_LABEL[q.kind])}</td><td>${esc(fmtTime(q.instant, ET, { date: true }))} ET</td><td>${esc(fmtTime(q.instant, PT))} PT</td></tr>`).join("")}</tbody></table></div>`).join("")}</section>
<section class="card"><h2>Other years</h2>${yearLinks("/moon/calendar", year)}</section>`;
  return shell(request, env, {
    title: `Moon Phase Calendar ${year} — Every New, Quarter & Full Moon (US Times)`,
    description: `${year} moon phase calendar: dates and Eastern/Pacific times of every new moon, first quarter, full moon and last quarter, with monthly day-by-day pages.`,
    body, schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `Moon Phase Calendar ${year}`, url: `${siteOrigin(env)}/moon/calendar/${year}`, inLanguage: "en" }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Moon", "/moon"], [`Moon calendar ${year}`, `/moon/calendar/${year}`]])] },
    sMaxAge: 604_800, backend: "growth-moon-calendar",
  });
}

// ---------------------------------------------------------------------------- /moon/{month}-{year}
function monthPage(request: Request, env: GrowthEnv, monthIdx: number, year: number) {
  const nyc = CITY_BY_SLUG.get("new-york")!;
  const days = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const start = zonedMidnight(`${year}-${String(monthIdx + 1).padStart(2, "0")}-01`, ET);
  const end = new Date(start.getTime() + days * 86_400_000 + 2 * 3_600_000);
  const events = quartersBetween(start, end).filter((q) => ymd(q.instant, ET).slice(0, 7) === `${year}-${String(monthIdx + 1).padStart(2, "0")}`);
  const rows: string[] = [];
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const night = new Date(zonedMidnight(date, ET).getTime() + 21 * 3_600_000); // 9 pm ET
    const rs = moonRiseSet(date, nyc, zonedMidnight);
    let tithi = "—";
    try { tithi = tithiAt(sunriseSunset(date, nyc).sunrise).en; } catch { /* ignore */ }
    const ev = events.find((q) => ymd(q.instant, ET) === date);
    const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(date + "T12:00:00Z"));
    rows.push(`<tr${ev ? ' style="font-weight:600"' : ""}><td>${esc(label)}</td><td>${ev ? `${esc(QUARTER_LABEL[ev.kind])} ${esc(fmtTime(ev.instant, ET))} ET` : esc(phaseName(night))}</td><td>${pct(illuminationFraction(night))}</td><td>${esc(fmtTime(rs.rise, ET))}</td><td>${esc(fmtTime(rs.set, ET))}</td><td>${esc(tithi)}</td></tr>`);
  }
  const fm = fullMoonsOfYear(year).filter((f) => ymd(f.instant, ET).slice(0, 7) === `${year}-${String(monthIdx + 1).padStart(2, "0")}`);
  const mName = MONTH_NAMES[monthIdx];
  const prev = monthIdx === 0 ? [11, year - 1] : [monthIdx - 1, year];
  const nxt = monthIdx === 11 ? [0, year + 1] : [monthIdx + 1, year];
  const { min, max } = yearWindow();
  const body = `${crumbsHtml([["Aafnai Patro", "/"], ["Moon", "/moon"], [`Moon calendar ${year}`, `/moon/calendar/${year}`], [`${mName} ${year}`, `/moon/${MONTH_SLUGS[monthIdx]}-${year}`]])}
<h1>Moon Phases ${mName} ${year}</h1>
<div class="answer">${fm.length ? fm.map((f) => `<p>${esc(mName)} ${year} full moon: <strong>${esc(f.usName)}</strong>, ${esc(fmtDate(f.instant, ET))} at ${esc(fmtTime(f.instant, ET))} ET / ${esc(fmtTime(f.instant, PT))} PT${f.observance ? ` · ${esc(f.observance)}` : ""}.</p>`).join("") : `<p>There is no full moon in ${esc(mName)} ${year} (Eastern time).</p>`}
<p>${events.map((q) => `${esc(QUARTER_LABEL[q.kind])}: ${esc(fmtTime(q.instant, ET, { date: true }))} ET`).join(" · ")}</p></div>
<section class="card"><h2>Day by day (New York times)</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Phase (9 pm ET)</th><th>Lit</th><th>Moonrise</th><th>Moonset</th><th>Tithi at sunrise</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
<p class="note">Moonrise/moonset and tithi are for New York; see <a href="/moon/los-angeles">Los Angeles</a>, <a href="/moon/chicago">Chicago</a>, <a href="/moon/dallas">Dallas</a> and other cities on their own pages.</p></section>
<section class="card"><p class="links">${prev[1] >= min ? `<a href="/moon/${MONTH_SLUGS[prev[0]]}-${prev[1]}">‹ ${MONTH_NAMES[prev[0]]} ${prev[1]}</a>` : ""}<a href="/moon/calendar/${year}">${year} calendar</a><a href="/moon/full-moon/${year}">Full moons ${year}</a>${nxt[1] <= max ? `<a href="/moon/${MONTH_SLUGS[nxt[0]]}-${nxt[1]}">${MONTH_NAMES[nxt[0]]} ${nxt[1]} ›</a>` : ""}</p></section>`;
  return shell(request, env, {
    title: fm[0]
      ? `Moon Phases ${mName} ${year}: ${fm[0].usName} on ${new Intl.DateTimeFormat("en-US", { timeZone: ET, month: "short", day: "numeric" }).format(fm[0].instant)} & Daily Calendar`
      : `Moon Phases ${mName} ${year}: Daily Moon Calendar & Times`,
    description: `${mName} ${year} moon phases: ${events.map((q) => `${QUARTER_LABEL[q.kind]} ${fmtTime(q.instant, ET, { date: true })} ET`).join(", ")}. Daily illumination, moonrise/moonset and Hindu tithi.`,
    body, schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `Moon Phases ${mName} ${year}`, url: `${siteOrigin(env)}/moon/${MONTH_SLUGS[monthIdx]}-${year}`, inLanguage: "en" }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Moon", "/moon"], [`Moon calendar ${year}`, `/moon/calendar/${year}`], [`${mName} ${year}`, `/moon/${MONTH_SLUGS[monthIdx]}-${year}`]])] },
    sMaxAge: 604_800, backend: "growth-moon-month",
  });
}

// ---------------------------------------------------------------------------- dispatcher
export function moonRoutes(now = new Date()) {
  const { min, max } = yearWindow(now);
  const routes = ["/moon", ...ALL_CITIES.map((c) => `/moon/${c.slug}`)];
  for (let y = min; y <= max; y++) {
    routes.push(`/moon/full-moon/${y}`, `/moon/new-moon/${y}`, `/moon/calendar/${y}`);
    for (const m of MONTH_SLUGS) routes.push(`/moon/${m}-${y}`);
  }
  return routes;
}

export async function moonPageResponse(request: Request, env: GrowthEnv, now = new Date()): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const lower = path.toLowerCase();
  if (lower !== "/moon" && !lower.startsWith("/moon/")) return null;
  if (path !== lower) return redirect(request, lower);
  const { min, max } = yearWindow(now);
  try {
    if (path === "/moon") return todayPage(request, env, now);
    if (path === "/moon/full-moon" || path === "/moon/new-moon" || path === "/moon/calendar") return redirect(request, `${path}/${now.getUTCFullYear()}`, 302);
    let m = path.match(/^\/moon\/(full-moon|new-moon|calendar)\/(\d{4})$/);
    if (m) {
      const year = Number(m[2]);
      if (year < min || year > max) return notFound("Year outside the published window");
      if (m[1] === "full-moon") return fullMoonYearPage(request, env, year, now);
      if (m[1] === "new-moon") return newMoonYearPage(request, env, year, now);
      return calendarYearPage(request, env, year);
    }
    m = path.match(/^\/moon\/([a-z]+)-(\d{4})$/);
    if (m && MONTH_SLUGS.includes(m[1])) {
      const year = Number(m[2]);
      if (year < min || year > max) return notFound("Year outside the published window");
      return monthPage(request, env, MONTH_SLUGS.indexOf(m[1]), year);
    }
    m = path.match(/^\/moon\/([a-z-]+)$/);
    if (m) {
      const city = CITY_BY_SLUG.get(m[1]);
      if (city) return cityPage(request, env, city, now);
    }
    return notFound();
  } catch (error) {
    return new Response("Moon page temporarily unavailable", { status: 503, headers: { "cache-control": "no-store", "retry-after": "120", "x-robots-tag": "noindex, nofollow", "x-error": String((error as Error)?.message || error).slice(0, 120) } });
  }
}
