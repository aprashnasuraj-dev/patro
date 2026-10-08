/**
 * Eclipse pages (EN + DE/FR/ES/IT).
 *   /eclipse, /de/finsternis, /fr/eclipse, /es/eclipse, /it/eclissi             hubs (solar + lunar, 2026–2031)
 *   /eclipse/{yyyy-mm-dd} and localized equivalents                              one solar eclipse: local times for ~100 cities
 *
 * Flagship: 2 Aug 2027 total solar eclipse (Spain → Morocco → Algeria → Tunisia → Libya → Egypt → Arabia).
 * Demand: "eclipse 2027" rising worldwide; "eclipse solaire 2027" +700%; "franja eclipse 2027" breakout;
 * Spain's 12 Aug 2026 eclipse dwarfed every other sky search in Spain.
 */
import { breadcrumbs, esc, notFound, redirect, shell, siteOrigin, type GrowthEnv } from "./html";
import { eclipseAlternates, fmtDateL, fmtTimeL, LOCALES, type Lang, type LocaleStrings } from "./i18n";
import { ECLIPSE_CITIES, localSolar, lunarEclipsesBetween, solarEclipsesBetween, type LocalSolar, type SolarKind } from "./eclipse";

const EN: Pick<LocaleStrings, "lang" | "intl" | "eclipsePath" | "eclipseHub"> & { t: LocaleStrings["t"] } = {
  lang: "en", intl: "en-GB", eclipsePath: (d) => `/eclipse/${d}`, eclipseHub: "/eclipse",
  t: {
    ...LOCALES.de.t, // only eclipse keys below are used for EN
    eclH1: (d, k) => `${k} on ${d}: Times for Your City`, eclTitle: (d, k) => `${k} ${d}: Exact Local Times, Coverage & Totality by City`, eclDesc: (d, k) => `${k} on ${d}: start, maximum, end, coverage and totality length for 100 cities in Europe, North Africa, the Middle East and beyond.`,
    eclKind: { total: "Total Solar Eclipse", annular: "Annular Solar Eclipse", partial: "Partial Solar Eclipse", hybrid: "Hybrid Solar Eclipse" },
    eclIntro: (d, k) => `The ${k} of ${d}: for each city, the local time the eclipse starts, peaks and ends.`,
    eclCols: { city: "City", country: "Country", type: "Type", start: "Starts", totality: "Totality", max: "Maximum", end: "Ends", coverage: "Coverage", sunAlt: "Sun altitude", duration: "Length" },
    eclNotVisible: "Not visible", eclBelowHorizon: "Sun below horizon", eclSafety: "Never look at the Sun without protection. Use certified eclipse glasses (ISO 12312-2); remove them only during complete totality.", eclCityNote: "Values are for the city centre. Near the edge of the path of totality, the length changes within a few kilometres.", eclTimesLocal: "All times are local time in each city.",
    eclHubH1: "Solar and Lunar Eclipses", eclHubTitle: "Solar & Lunar Eclipses 2026–2031: Dates, Types and Local Times", eclHubDesc: "Upcoming solar and lunar eclipses with type, date and where they are visible; exact times for 100 cities.", eclHubIntro: "Upcoming eclipses worldwide. Open a solar eclipse for exact times in your city.", eclGreatest: "Greatest eclipse", eclSolar: "Solar eclipses", eclLunar: "Lunar eclipses",
  },
};

const HOME: Record<Lang, string[]> = {
  en: [], es: ["Spain", "Gibraltar", "Mexico", "Argentina"], fr: ["France", "Belgium", "Switzerland", "Morocco", "Algeria", "Tunisia"], de: ["Germany", "Austria", "Switzerland"], it: ["Italy"],
};
const COUNTRY_L: Partial<Record<Lang, Record<string, string>>> = {
  es: { Spain: "España", Morocco: "Marruecos", Algeria: "Argelia", Tunisia: "Túnez", Libya: "Libia", Egypt: "Egipto", "Saudi Arabia": "Arabia Saudí", Yemen: "Yemen", France: "Francia", Germany: "Alemania", Italy: "Italia", "United Kingdom": "Reino Unido", Mexico: "México", "United States": "Estados Unidos", Greece: "Grecia", Belgium: "Bélgica", Netherlands: "Países Bajos", Switzerland: "Suiza", Ireland: "Irlanda", Iceland: "Islandia", Türkiye: "Turquía", Jordan: "Jordania", Somalia: "Somalia", Australia: "Australia", "New Zealand": "Nueva Zelanda", India: "India", Austria: "Austria" },
  fr: { Spain: "Espagne", Morocco: "Maroc", Algeria: "Algérie", Tunisia: "Tunisie", Libya: "Libye", Egypt: "Égypte", "Saudi Arabia": "Arabie saoudite", Yemen: "Yémen", Germany: "Allemagne", Italy: "Italie", "United Kingdom": "Royaume-Uni", Mexico: "Mexique", "United States": "États-Unis", Greece: "Grèce", Belgium: "Belgique", Netherlands: "Pays-Bas", Switzerland: "Suisse", Ireland: "Irlande", Iceland: "Islande", Türkiye: "Turquie", Jordan: "Jordanie", Austria: "Autriche", Portugal: "Portugal" },
  de: { Spain: "Spanien", Morocco: "Marokko", Algeria: "Algerien", Tunisia: "Tunesien", Libya: "Libyen", Egypt: "Ägypten", "Saudi Arabia": "Saudi-Arabien", Yemen: "Jemen", France: "Frankreich", Germany: "Deutschland", Italy: "Italien", "United Kingdom": "Vereinigtes Königreich", Greece: "Griechenland", Belgium: "Belgien", Netherlands: "Niederlande", Switzerland: "Schweiz", Ireland: "Irland", Iceland: "Island", Türkiye: "Türkei", Jordan: "Jordanien", Austria: "Österreich" },
  it: { Spain: "Spagna", Morocco: "Marocco", Algeria: "Algeria", Tunisia: "Tunisia", Libya: "Libia", Egypt: "Egitto", "Saudi Arabia": "Arabia Saudita", Yemen: "Yemen", France: "Francia", Germany: "Germania", "United Kingdom": "Regno Unito", Greece: "Grecia", Belgium: "Belgio", Netherlands: "Paesi Bassi", Switzerland: "Svizzera", Ireland: "Irlanda", Iceland: "Islanda", Türkiye: "Turchia", Jordan: "Giordania", Austria: "Austria", Italy: "Italia" },
};

type Loc = typeof EN | LocaleStrings;
const allLocs = (): Loc[] => [EN, ...Object.values(LOCALES)];

export function eclipseYearWindow(now = new Date()) { const y = now.getUTCFullYear(); return { min: y, max: y + 5 }; }

function mmss(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

function row(L: Loc, r: LocalSolar) {
  const tz = r.city.tz;
  const cName = COUNTRY_L[L.lang as Lang]?.[r.city.country] ?? r.city.country;
  if (r.kind === "none" || !r.visible) return `<tr><td>${esc(r.city.name)}</td><td>${esc(cName)}</td><td colspan="6" class="note">${esc(r.kind === "none" ? L.t.eclNotVisible : L.t.eclBelowHorizon)}</td></tr>`;
  const centralUp = r.peakAltitude > 0;
  const central = r.totalitySeconds > 0 && centralUp
    ? `<strong>${esc(fmtTimeL(r.totalStart, tz, L.intl))}–${esc(fmtTimeL(r.totalEnd, tz, L.intl))}</strong><div class="note">${mmss(r.totalitySeconds)}</div>`
    : "—";
  return `<tr id="${r.city.slug}"${r.totalitySeconds > 0 && centralUp ? ' style="font-weight:600"' : ""}><td>${esc(r.city.name)}</td><td>${esc(cName)}</td><td>${esc(fmtTimeL(r.start, tz, L.intl))}</td><td>${central}</td><td>${esc(fmtTimeL(r.peak, tz, L.intl))}</td><td>${esc(fmtTimeL(r.end, tz, L.intl))}</td><td>${Math.round(r.obscuration * 100)} %</td><td>${Math.round(r.peakAltitude)}°</td></tr>`;
}

function eclipsePage(request: Request, env: GrowthEnv, L: Loc, ec: { date: string; kind: SolarKind; peak: Date }) {
  const kindLabel = L.t.eclKind[ec.kind];
  const dateLabel = fmtDateL(new Date(ec.date + "T12:00:00Z"), "UTC", L.intl);
  const dateShort = new Intl.DateTimeFormat(L.intl, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(ec.date + "T12:00:00Z"));
  const results = ECLIPSE_CITIES.map((c) => localSolar(ec.peak, c));
  const visible = results.filter((r) => r.kind !== "none" && r.visible).sort((a, b) => (b.totalitySeconds - a.totalitySeconds) || (b.obscuration - a.obscuration));
  const home = visible.filter((r) => HOME[L.lang as Lang].includes(r.city.country));
  const rest = visible.filter((r) => !HOME[L.lang as Lang].includes(r.city.country));
  const hidden = results.filter((r) => r.kind === "none" || !r.visible);
  const best = visible.filter((r) => r.totalitySeconds > 0 && r.peakAltitude > 0)[0];
  const C = L.t.eclCols;
  const head = `<thead><tr><th>${esc(C.city)}</th><th>${esc(C.country)}</th><th>${esc(C.start)}</th><th>${esc(ec.kind === "annular" ? C.type : C.totality)}</th><th>${esc(C.max)}</th><th>${esc(C.end)}</th><th>${esc(C.coverage)}</th><th>${esc(C.sunAlt)}</th></tr></thead>`;
  const table = (rows: LocalSolar[]) => `<div class="tablewrap"><table>${head}<tbody>${rows.map((r) => row(L, r)).join("")}</tbody></table></div>`;
  const path = L.eclipsePath(ec.date);
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="${L.eclipseHub}">${esc(L.t.eclHubH1)}</a> › ${esc(ec.date)}</p>
<h1>${esc(L.t.eclH1(dateLabel, kindLabel))}</h1>
<div class="answer"><p>${esc(L.t.eclIntro(dateLabel, kindLabel))}</p>${best ? `<p><strong>${esc(best.city.name)}</strong>: ${esc(C.totality)} ${esc(fmtTimeL(best.totalStart, best.city.tz, L.intl))}–${esc(fmtTimeL(best.totalEnd, best.city.tz, L.intl))} (${mmss(best.totalitySeconds)}).</p>` : ""}<p><strong>⚠ ${esc(L.t.eclSafety)}</strong></p></div>
${home.length ? `<section class="card">${table(home)}</section>` : ""}
<section class="card">${table(rest)}<p class="note">${esc(L.t.eclTimesLocal)} ${esc(L.t.eclCityNote)}</p></section>
${hidden.length ? `<section class="card"><p class="note"><strong>${esc(L.t.eclNotVisible)}:</strong> ${hidden.map((r) => esc(r.city.name)).join(", ")}</p></section>` : ""}
<section class="card"><p class="links">${allLocs().filter((x) => x.lang !== L.lang).map((x) => `<a href="${x.eclipsePath(ec.date)}" hreflang="${x.lang}">${x.lang.toUpperCase()}</a>`).join("")}<a href="${L.eclipseHub}">${esc(L.t.eclHubH1)}</a></p></section>`;
  const desc = L.t.eclDesc(dateLabel, kindLabel);
  return shell(request, env, {
    lang: L.lang, title: L.t.eclTitle(dateShort, kindLabel), description: desc, body,
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: L.t.eclH1(dateLabel, kindLabel), url: siteOrigin(env) + path, inLanguage: L.lang, description: desc }, breadcrumbs(env, [["Aafnai Patro", "/"], [L.t.eclHubH1, L.eclipseHub], [ec.date, path]])] },
    alternates: eclipseAlternates(ec.date), index: visible.length >= 3, sMaxAge: 604_800, backend: `growth-eclipse-${L.lang}`,
    ...(L.lang === "en" ? {} : { footer: (L as LocaleStrings).t.footer }),
  });
}

function hubPage(request: Request, env: GrowthEnv, L: Loc, now: Date) {
  const { min, max } = eclipseYearWindow(now);
  const solar = solarEclipsesBetween(min, max);
  const lunar = lunarEclipsesBetween(min, max);
  const lunarKind = (k: string) => (L.lang === "en" ? ({ total: "Total lunar eclipse", partial: "Partial lunar eclipse", penumbral: "Penumbral lunar eclipse" } as Record<string, string>)[k] : (L as LocaleStrings).t.eclipseWord(k));
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › ${esc(L.t.eclHubH1)}</p><h1>${esc(L.t.eclHubH1)}</h1>
<div class="answer"><p>${esc(L.t.eclHubIntro)}</p></div>
<section class="card"><h2>${esc(L.t.eclSolar)}</h2><div class="tablewrap"><table><tbody>${solar.map((e) => `<tr><td><a href="${L.eclipsePath(e.date)}">${esc(fmtDateL(e.peak, "UTC", L.intl))}</a></td><td>${esc(L.t.eclKind[e.kind])}</td><td class="note">${esc(L.t.eclGreatest)}: ${e.lat?.toFixed(1)}°, ${e.lon?.toFixed(1)}°</td></tr>`).join("")}</tbody></table></div></section>
<section class="card"><h2>${esc(L.t.eclLunar)}</h2><div class="tablewrap"><table><tbody>${lunar.map((e) => `<tr><td>${esc(fmtDateL(e.peak, "UTC", L.intl))}</td><td>${esc(lunarKind(e.kind))}</td><td class="note">${esc(fmtTimeL(e.peak, "UTC", L.intl))} UTC</td></tr>`).join("")}</tbody></table></div></section>
<section class="card"><p class="links">${allLocs().filter((x) => x.lang !== L.lang).map((x) => `<a href="${x.eclipseHub}" hreflang="${x.lang}">${x.lang.toUpperCase()}</a>`).join("")}</p></section>`;
  return shell(request, env, {
    lang: L.lang, title: L.t.eclHubTitle, description: L.t.eclHubDesc, body,
    alternates: [...allLocs().map((x) => ({ lang: x.lang, path: x.eclipseHub })), { lang: "x-default", path: "/eclipse" }],
    sMaxAge: 604_800, backend: `growth-eclipse-hub-${L.lang}`,
    ...(L.lang === "en" ? {} : { footer: (L as LocaleStrings).t.footer }),
  });
}

export function eclipseRoutes(now = new Date()) {
  const { min, max } = eclipseYearWindow(now);
  const solar = solarEclipsesBetween(min, max);
  const indexable = solar.filter((e) => ECLIPSE_CITIES.map((c) => localSolar(e.peak, c)).filter((r) => r.kind !== "none" && r.visible).length >= 3);
  const out: string[] = [];
  for (const L of allLocs()) {
    out.push(L.eclipseHub);
    for (const e of indexable) out.push(L.eclipsePath(e.date));
  }
  return out;
}

export async function eclipsePageResponse(request: Request, env: GrowthEnv, now = new Date()): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const raw = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const path = raw.toLowerCase();
  for (const L of allLocs()) {
    if (path !== L.eclipseHub && !path.startsWith(L.eclipseHub + "/")) continue;
    if (raw !== path) return redirect(request, path);
    if (path === L.eclipseHub) return hubPage(request, env, L, now);
    const m = path.match(/\/(\d{4}-\d{2}-\d{2})$/);
    if (!m) return notFound();
    const { min, max } = eclipseYearWindow(now);
    const y = Number(m[1].slice(0, 4));
    if (y < min - 1 || y > max) return notFound();
    const ec = solarEclipsesBetween(y, y).find((e) => e.date === m[1]);
    if (!ec) return notFound("No solar eclipse on this date");
    return eclipsePage(request, env, L, ec);
  }
  return null;
}
