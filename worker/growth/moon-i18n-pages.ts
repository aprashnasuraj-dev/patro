/**
 * Localized moon pages: /de/mond, /fr/lune, /es/luna, /it/luna (+ /…/vollmond|pleine-lune|luna-llena|luna-piena/{year}).
 * Same engine as /moon; strings, time zones and cities come from i18n.ts. hreflang links all versions.
 */
import { zonedMidnight } from "../../src/patro-tools/core/astro";
import { breadcrumbs, esc, moonLiveBlock, moonSvg, notFound, redirect, shell, siteOrigin, ymd, type GrowthEnv } from "./html";
import { DE_FULL_MOON_NAMES, fmtDateL, fmtTimeL, fullMoonAlternates, LOCALES, moonTodayAlternates, type LocaleStrings } from "./i18n";
import { fullMoonsOfYear, quartersBetween, illuminationFraction, moonAgeDays, moonDistanceKm, moonRiseSet, nextQuarter, phaseAngle, phaseKey, tithiAt, yearWindow, type QuarterKind } from "./moon";

const pct = (x: number) => `${Math.round(x * 100)} %`;
const kmL = (x: number, intl: string) => `${Math.round(x).toLocaleString(intl)} km`;

function nav(L: LocaleStrings, y: number) {
  return `<a href="${L.moonPath}">${esc(L.t.moonToday)}</a><a href="${L.fullMoonPath(y)}">${esc(L.t.fullMoons)}</a><a href="${L.eclipseHub}">${esc(L.t.eclipses)}</a><a href="/moon">EN</a>`;
}

function todayPage(request: Request, env: GrowthEnv, L: LocaleStrings, now: Date) {
  const tz = L.zones[0].tz;
  const key = phaseKey(now);
  const name = L.phases[key];
  const lit = pct(illuminationFraction(now));
  const age = moonAgeDays(now).toLocaleString(L.intl, { maximumFractionDigits: 1 });
  const nextFull = nextQuarter(now, "full");
  const hoursToFull = (nextFull.instant.getTime() - now.getTime()) / 3_600_000;
  const isFull = key === "full" || hoursToFull < 18;
  const nextFullDate = fmtDateL(nextFull.instant, tz, L.intl);
  const nextFullTime = fmtTimeL(nextFull.instant, tz, L.intl);
  const tithi = tithiAt(now);
  const nexts = (["new", "first", "full", "last"] as QuarterKind[]).map((k) => nextQuarter(now, k)).sort((a, b) => +a.instant - +b.instant);
  const zoneHeads = L.zones.map((z) => `<th>${esc(z.label)}</th>`).join("");
  const riseRows = L.cities.map((c) => {
    const rs = moonRiseSet(ymd(now, c.tz), c, zonedMidnight);
    return `<tr><td>${esc(c.name)}</td><td>${esc(fmtTimeL(rs.rise, c.tz, L.intl))}</td><td>${esc(fmtTimeL(rs.set, c.tz, L.intl))}</td></tr>`;
  }).join("");
  const year = Number(ymd(nextFull.instant, tz).slice(0, 4));
  const upcoming = fullMoonsOfYear(year).concat(fullMoonsOfYear(year + 1)).filter((f) => f.instant > now).slice(0, 3);
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › ${esc(L.t.moonToday)}</p>
<div class="hero">${moonSvg(phaseAngle(now), 88, "m-svg")}<div><h1>${esc(L.t.h1Today("")).trim()} <span data-m="m-phase">${esc(name)}</span></h1></div></div>
<div class="answer"><p>${L.t.todayIs(`<span data-m="m-phase">${esc(name)}</span>`, `<span data-m="m-lit">${lit}</span>`, `<span data-m="m-age">${esc(age)}</span>`)}</p><div id="m-answer"><p>${isFull ? L.t.fullYes : L.t.fullNo(esc(nextFullDate), esc(nextFullTime), Math.max(0, Math.round(hoursToFull / 24)))}</p></div></div>
<section class="card grid">
 <div class="stat"><b>${esc(L.t.phase)}</b><span data-m="m-phase">${esc(name)}</span></div>
 <div class="stat"><b>${esc(L.t.illumination)}</b><span data-m="m-lit">${lit}</span></div>
 <div class="stat"><b>${esc(L.t.age)}</b><span><span data-m="m-age">${esc(age)}</span> ${esc(L.t.days)}</span></div>
 <div class="stat"><b>${esc(L.t.distance)}</b><span>${kmL(moonDistanceKm(now), L.intl)}</span></div>
 <div class="stat"><b>${esc(L.t.tithi)}</b><span>${esc(tithi.en)}</span></div>
 <div class="stat"><b>${esc(L.t.nextNew)}</b><span>${esc(fmtTimeL(nextQuarter(now, "new").instant, tz, L.intl, true))}</span></div>
</section>
<section class="card"><h2>${esc(L.t.nextPhases)}</h2><div class="tablewrap"><table><thead><tr><th>${esc(L.t.phase)}</th>${zoneHeads}</tr></thead><tbody>
${nexts.map((q) => `<tr><td>${esc(L.phases[q.kind])}</td>${L.zones.map((z) => `<td>${esc(fmtTimeL(q.instant, z.tz, L.intl, true))}</td>`).join("")}</tr>`).join("")}
</tbody></table></div></section>
<section class="card"><h2>${esc(L.t.riseSet)}</h2><div class="tablewrap"><table><thead><tr><th>${esc(L.t.city)}</th><th>${esc(L.t.rise)}</th><th>${esc(L.t.set)}</th></tr></thead><tbody>${riseRows}</tbody></table></div><p class="note">${esc(L.t.riseNote)}</p></section>
<section class="card"><h2>${esc(L.t.upcomingFull)}</h2><ul>${upcoming.map((f) => `<li><strong>${esc(fmtDateL(f.instant, tz, L.intl))}</strong>, ${esc(fmtTimeL(f.instant, tz, L.intl))}${f.eclipse ? ` · ${esc(L.t.eclipseWord(f.eclipse.kind))}` : ""}${f.closestOfYear ? ` · ${esc(L.t.closest)}` : ""}</li>`).join("")}</ul>
<p class="links"><a href="${L.fullMoonPath(year)}">${esc(L.t.fullMoons)} ${year}</a><a href="${L.eclipseHub}">${esc(L.t.eclipses)}</a></p></section>
${moonLiveBlock({ quarters: quartersBetween(new Date(now.getTime() - 40 * 86_400_000), new Date(now.getTime() + 400 * 86_400_000)).map((q) => [q.kind, q.instant.getTime()] as [string, number]), phases: L.phases, intl: L.intl, yes: `<p>${L.t.fullYes}</p>`, no: `<p>${L.t.fullNo("{date}", "{time}", 0).replace(/\b0\b/, "{days}")}</p>` })}
<section class="card"><h2>${esc(L.t.calcTitle)}</h2><p>${esc(L.t.calcBody)}</p></section>`;
  const desc = L.t.descToday(name, lit, age, `${nextFullDate} ${nextFullTime}`);
  return shell(request, env, {
    lang: L.lang, title: L.t.titleToday(name, lit, fmtDateL(now, tz, L.intl, false)), description: desc, body,
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: L.t.h1Today(name), url: siteOrigin(env) + L.moonPath, inLanguage: L.lang, dateModified: now.toISOString(), description: desc }, breadcrumbs(env, [["Aafnai Patro", "/"], [L.t.moonToday, L.moonPath]])] },
    alternates: moonTodayAlternates(), nav: nav(L, now.getUTCFullYear()), footer: L.t.footer, sMaxAge: 900, backend: `growth-moon-today-${L.lang}`,
  });
}

function fullYearPage(request: Request, env: GrowthEnv, L: LocaleStrings, year: number, now: Date) {
  const tz = L.zones[0].tz;
  const list = fullMoonsOfYear(year);
  const next = list.find((f) => f.instant > now);
  const monthOf = (d: Date) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "2-digit" }).format(d)) - 1;
  const rows = list.map((f) => {
    const notes = [L.lang === "de" && !f.blueMoon ? DE_FULL_MOON_NAMES[monthOf(f.instant)] : "", f.blueMoon ? L.t.blue : "", f.closestOfYear ? L.t.closest : "", f.farthestOfYear ? L.t.farthest : "", f.eclipse ? L.t.eclipseWord(f.eclipse.kind) : ""].filter(Boolean);
    return `<tr${next && +next.instant === +f.instant ? ' style="font-weight:600"' : ""}><td>${esc(fmtDateL(f.instant, tz, L.intl, false))}</td>${L.zones.map((z) => `<td>${esc(fmtTimeL(f.instant, z.tz, L.intl, z.tz !== tz))}</td>`).join("")}<td class="wrap">${notes.map((n) => `<span class="tag">${esc(n)}</span>`).join(" ")}</td><td class="wrap">${esc(f.hinduMonth.roman)} Purnima${f.observance ? `<div class="note">${esc(f.observance)}</div>` : ""}</td><td>${kmL(f.distanceKm, L.intl)}</td></tr>`;
  }).join("");
  const { min, max } = yearWindow(now);
  const years: number[] = []; for (let y = min; y <= max; y++) years.push(y);
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="${L.moonPath}">${esc(L.t.moonToday)}</a> › ${esc(L.t.fullMoons)} ${year}</p>
<h1>${esc(L.t.fullH1(year))}</h1>
<div class="answer">${next ? `<p>${L.t.fullNext(esc(fmtDateL(next.instant, tz, L.intl)), esc(fmtTimeL(next.instant, tz, L.intl)))}</p>` : ""}<p>${L.t.fullCount(year, list.length)}</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>${esc(L.t.date)}</th>${L.zones.map((z) => `<th>${esc(z.label)}</th>`).join("")}<th>${esc(L.t.name)}</th><th>${esc(L.t.hinduMonth)}</th><th>${esc(L.t.distance)}</th></tr></thead><tbody>${rows}</tbody></table></div><p class="note">${esc(L.t.namesNote)}</p></section>
<section class="card"><h2>${esc(L.t.otherYears)}</h2><p class="links">${years.map((y) => (y === year ? `<span class="tag">${y}</span>` : `<a href="${L.fullMoonPath(y)}">${y}</a>`)).join("")}</p></section>`;
  return shell(request, env, {
    lang: L.lang, title: L.t.fullTitle(year, list.length), description: L.t.fullDesc(year), body,
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: L.t.fullH1(year), url: siteOrigin(env) + L.fullMoonPath(year), inLanguage: L.lang }, breadcrumbs(env, [["Aafnai Patro", "/"], [L.t.moonToday, L.moonPath], [`${L.t.fullMoons} ${year}`, L.fullMoonPath(year)]])] },
    alternates: fullMoonAlternates(year), nav: nav(L, year), footer: L.t.footer, sMaxAge: next ? 21_600 : 604_800, backend: `growth-moon-full-${L.lang}`,
  });
}

export function moonI18nRoutes(now = new Date()) {
  const { min, max } = yearWindow(now);
  const out: string[] = [];
  for (const L of Object.values(LOCALES)) { out.push(L.moonPath); for (let y = min; y <= max; y++) out.push(L.fullMoonPath(y)); }
  return out;
}

export async function moonI18nPageResponse(request: Request, env: GrowthEnv, now = new Date()): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const raw = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const path = raw.toLowerCase();
  for (const L of Object.values(LOCALES)) {
    if (path !== L.moonPath && !path.startsWith(L.moonPath + "/")) continue;
    if (raw !== path) return redirect(request, path);
    if (path === L.moonPath) return todayPage(request, env, L, now);
    const base = L.fullMoonPath(0).replace(/\/0$/, "");
    if (path === base) return redirect(request, L.fullMoonPath(now.getUTCFullYear()), 302);
    const m = path.match(/\/(\d{4})$/);
    if (m && path === L.fullMoonPath(Number(m[1]))) {
      const { min, max } = yearWindow(now);
      const y = Number(m[1]);
      if (y < min || y > max) return notFound();
      return fullYearPage(request, env, L, y, now);
    }
    return notFound();
  }
  return null;
}
