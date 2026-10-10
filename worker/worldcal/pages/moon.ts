import { addDaysIso, daysInGregorianMonth, isoToJdn, localHm, pad2, parseIso, todayIn } from "../dates";
import { esc, page } from "../html";
import { haircutRating, moonDay, type DayType, type MoonDay, type MoonEvent, type Sign } from "../engines/moon";
import { FAMILIES, INDEX_WINDOW, type FamilyId } from "../config";
import type { Ctx, Rendered } from "../types";

type MoonLang = "de" | "es" | "it";
const FAMILY: Record<MoonLang, FamilyId> = { de: "moon-de", es: "moon-es", it: "moon-it" };
const RANGE = { min: 1950, max: 2100 };

type Strings = {
  locale: string; brand: string; todayTitle: (d: string, t: string) => string; todayH1: string; dateTitle: (d: string, t: string) => string; monthTitle: (m: string) => string;
  phase: string; waxing: string; waning: string; asc: string; desc: string; dayType: string; sign: string; signTropical: string; constellationModel: string;
  types: Record<DayType, string>; signs: Record<Sign, string>; events: Record<MoonEvent["kind"], string>; illum: string;
  unfavourable: string; next7: string; month: string; prev: string; next: string; today: string; garden: string;
  advice: Record<DayType, string>; ascAdvice: string; descAdvice: string; waxAdvice: string; wanAdvice: string; restAdvice: string;
  disclaimer: string; months: string[]; weekdays: string[]; from: string; phaseOnly?: string; hair?: string;
};

const SIGNS_DE: Record<Sign, string> = { aries: "Widder", taurus: "Stier", gemini: "Zwillinge", cancer: "Krebs", leo: "Löwe", virgo: "Jungfrau", libra: "Waage", scorpio: "Skorpion", sagittarius: "Schütze", capricorn: "Steinbock", aquarius: "Wassermann", pisces: "Fische" };
const SIGNS_ES: Record<Sign, string> = { aries: "Aries", taurus: "Tauro", gemini: "Géminis", cancer: "Cáncer", leo: "Leo", virgo: "Virgo", libra: "Libra", scorpio: "Escorpio", sagittarius: "Sagitario", capricorn: "Capricornio", aquarius: "Acuario", pisces: "Piscis" };
const SIGNS_IT: Record<Sign, string> = { aries: "Ariete", taurus: "Toro", gemini: "Gemelli", cancer: "Cancro", leo: "Leone", virgo: "Vergine", libra: "Bilancia", scorpio: "Scorpione", sagittarius: "Sagittario", capricorn: "Capricorno", aquarius: "Acquario", pisces: "Pesci" };

const SCIENCE = "Mayoral et al. (2020), Agronomy 10(7):955";
const STR: Record<MoonLang, Strings> = {
  de: {
    locale: "de-DE", brand: "Mondkalender", todayTitle: (d, t) => `Mondkalender heute (${d}): ${t} – Garten & Haare schneiden`, todayH1: "Mondkalender heute", dateTitle: (d, t) => `Mondkalender ${d}: ${t}, Mondphase und Mondzeichen`,
    monthTitle: (m) => `Mondkalender ${m}: Fruchttage, Wurzeltage, Blütentage, Blatttage`, phase: "Mondphase", waxing: "zunehmender Mond", waning: "abnehmender Mond", asc: "aufsteigender Mond", desc: "absteigender Mond",
    dayType: "Tagesqualität (biodynamisch, Sternbild-Modell)", sign: "Mondzeichen", signTropical: "Mondzeichen (Tierkreis, tropisch)", constellationModel: "Sternbild",
    types: { fruit: "Fruchttag", root: "Wurzeltag", flower: "Blütentag", leaf: "Blatttag" }, signs: SIGNS_DE,
    events: { "new-moon": "Neumond", "first-quarter": "erstes Viertel", "full-moon": "Vollmond", "last-quarter": "letztes Viertel", "ascending-node": "aufsteigender Mondknoten", "descending-node": "absteigender Mondknoten", perigee: "Erdnähe (Perigäum)", apogee: "Erdferne (Apogäum)", "turn-ascending": "Mond beginnt aufzusteigen", "turn-descending": "Mond beginnt abzusteigen" },
    illum: "beleuchtet", unfavourable: "Knoten- oder Erdnähe/-ferne-Tag: traditionell kein Säen und Pflanzen", next7: "Die nächsten 7 Tage", month: "Monatsübersicht", prev: "Vortag", next: "Folgetag", today: "Heute", garden: "Gartenarbeit nach der Tradition",
    advice: { fruit: "Fruchttag: Tomaten, Bohnen, Erbsen, Kürbis, Paprika, Getreide und Obst säen, pflanzen oder ernten.", root: "Wurzeltag: Karotten, Kartoffeln, Zwiebeln, Rote Bete, Radieschen und Knoblauch.", flower: "Blütentag: Blumen, Blühpflanzen, Brokkoli und Blumenkohl; Schnittblumen halten länger.", leaf: "Blatttag: Salat, Spinat, Kohl und Kräuter; traditionell guter Gießtag." },
    ascAdvice: "Aufsteigender Mond: Säen, Veredeln und Ernten von Obst und oberirdischem Gemüse.", descAdvice: "Absteigender Mond: Pflanzen, Umpflanzen, Düngen, Rückschnitt und Ernte von Wurzelgemüse.",
    waxAdvice: "Zunehmender Mond: traditionell gut für Wachstum über der Erde.", wanAdvice: "Abnehmender Mond: traditionell gut für Wurzeln, Rückschnitt und Unkraut jäten.", restAdvice: "Heute ist ein ungünstiger Tag (Mondknoten, Erdnähe oder Erdferne): Säen und Pflanzen besser verschieben.",
    disclaimer: `Mondkalender sind eine Tradition. Eine wissenschaftliche Übersichtsarbeit fand keine verlässlichen Belege für einen Einfluss der Mondphasen auf Pflanzen (${SCIENCE}). Astronomische Daten (Phasen, Zeichen, Knoten, Erdnähe) sind berechnet; Zeichenwechsel als Uhrzeit Berlin.`,
    months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"], weekdays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], from: "ab",
    hair: "Haare schneiden",
  },
  es: {
    locale: "es-ES", brand: "Calendario lunar", todayTitle: (d, t) => `Calendario lunar de hoy (${d}): ${t} – huerto y jardín`, todayH1: "Calendario lunar de hoy", dateTitle: (d, t) => `Calendario lunar ${d}: ${t}, fase lunar y signo`,
    monthTitle: (m) => `Calendario lunar ${m} para el huerto: días de fruto, raíz, flor y hoja`, phase: "Fase lunar", waxing: "luna creciente", waning: "luna menguante", asc: "luna ascendente", desc: "luna descendente",
    dayType: "Tipo de día (tradición biodinámica, constelaciones)", sign: "Signo lunar", signTropical: "Signo lunar (zodiaco tropical)", constellationModel: "Constelación",
    types: { fruit: "día de fruto", root: "día de raíz", flower: "día de flor", leaf: "día de hoja" }, signs: SIGNS_ES,
    events: { "new-moon": "luna nueva", "first-quarter": "cuarto creciente", "full-moon": "luna llena", "last-quarter": "cuarto menguante", "ascending-node": "nodo ascendente", "descending-node": "nodo descendente", perigee: "perigeo", apogee: "apogeo", "turn-ascending": "la luna empieza a ascender", "turn-descending": "la luna empieza a descender" },
    illum: "iluminada", unfavourable: "Día de nodo, perigeo o apogeo: tradicionalmente no se siembra ni se planta", next7: "Próximos 7 días", month: "Calendario del mes", prev: "Día anterior", next: "Día siguiente", today: "Hoy", garden: "Huerto según la tradición",
    advice: { fruit: "Día de fruto: tomates, judías, guisantes, calabazas, pimientos, cereales y frutales.", root: "Día de raíz: zanahorias, patatas, cebollas, remolacha, rábanos y ajos.", flower: "Día de flor: flores, plantas ornamentales, brócoli y coliflor.", leaf: "Día de hoja: lechugas, espinacas, coles y aromáticas; buen día de riego según la tradición." },
    ascAdvice: "Luna ascendente: sembrar, injertar y cosechar frutos y hortalizas de parte aérea.", descAdvice: "Luna descendente: plantar, trasplantar, abonar, podar y cosechar raíces.",
    waxAdvice: "Luna creciente: tradicionalmente favorece el crecimiento aéreo.", wanAdvice: "Luna menguante: tradicionalmente favorece raíces, poda y escarda.", restAdvice: "Hoy es un día desfavorable (nodo, perigeo o apogeo): mejor no sembrar ni plantar.",
    disclaimer: `El calendario lunar es una tradición. Una revisión científica no encontró pruebas fiables de que las fases lunares influyan en las plantas (${SCIENCE}). Los datos astronómicos están calculados; horas en Madrid.`,
    months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"], weekdays: ["do", "lu", "ma", "mi", "ju", "vi", "sá"], from: "desde",
  },
  it: {
    locale: "it-IT", brand: "Calendario lunare", todayTitle: (d, t) => `Calendario lunare di oggi (${d}): ${t} – orto e giardino`, todayH1: "Calendario lunare di oggi", dateTitle: (d, t) => `Calendario lunare ${d}: ${t}, fase lunare e segno`,
    monthTitle: (m) => `Calendario lunare ${m} per l'orto: fasi lunari e giorni frutto, radice, fiore, foglia`, phase: "Fase lunare", waxing: "luna crescente", waning: "luna calante", asc: "luna ascendente", desc: "luna discendente",
    dayType: "Tipo di giorno (tradizione biodinamica, costellazioni)", sign: "Segno lunare", signTropical: "Segno lunare (zodiaco tropicale)", constellationModel: "Costellazione",
    types: { fruit: "giorno frutto", root: "giorno radice", flower: "giorno fiore", leaf: "giorno foglia" }, signs: SIGNS_IT,
    events: { "new-moon": "luna nuova", "first-quarter": "primo quarto", "full-moon": "luna piena", "last-quarter": "ultimo quarto", "ascending-node": "nodo ascendente", "descending-node": "nodo discendente", perigee: "perigeo", apogee: "apogeo", "turn-ascending": "la luna inizia a salire", "turn-descending": "la luna inizia a scendere" },
    illum: "illuminata", unfavourable: "Giorno di nodo, perigeo o apogeo: per tradizione niente semine e trapianti", next7: "Prossimi 7 giorni", month: "Calendario del mese", prev: "Giorno precedente", next: "Giorno successivo", today: "Oggi", garden: "Orto secondo la tradizione",
    advice: { fruit: "Giorno frutto: pomodori, fagioli, piselli, zucche, peperoni, cereali e alberi da frutto.", root: "Giorno radice: carote, patate, cipolle, barbabietole, ravanelli e aglio.", flower: "Giorno fiore: fiori, piante ornamentali, broccoli e cavolfiori.", leaf: "Giorno foglia: lattuga, spinaci, cavoli ed erbe aromatiche; per tradizione buon giorno per annaffiare." },
    ascAdvice: "Luna ascendente: semine, innesti e raccolta di frutti e ortaggi da foglia.", descAdvice: "Luna discendente: trapianti, concimazioni, potature e raccolta di radici.",
    waxAdvice: "Luna crescente (lunario tradizionale): favorisce la crescita della parte aerea; si seminano ortaggi da frutto e da foglia.", wanAdvice: "Luna calante (lunario tradizionale): favorisce radici, bulbi, potature e conservazione dei raccolti.", restAdvice: "Oggi è un giorno sfavorevole (nodo, perigeo o apogeo): meglio rimandare semine e trapianti.",
    disclaimer: `Il calendario lunare è una tradizione. Una revisione scientifica non ha trovato prove affidabili di un effetto delle fasi lunari sulle piante (${SCIENCE}). I dati astronomici sono calcolati; orari di Roma.`,
    months: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"], weekdays: ["dom", "lun", "mar", "mer", "gio", "ven", "sab"], from: "dalle",
    phaseOnly: "Nel lunario tradizionale italiano conta soprattutto la fase: crescente o calante. Il tipo di giorno (frutto, radice, fiore, foglia) segue invece il metodo biodinamico.",
  },
};

const PHASE_ICON = (angle: number) => ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][Math.round(angle / 45) % 8];
const dLabel = (s: Strings, iso: string) => {
  const p = parseIso(iso)!;
  if (s.locale === "de-DE") return `${p.d}. ${s.months[p.m - 1]} ${p.y}`;
  if (s.locale === "es-ES") return `${p.d} de ${s.months[p.m - 1]} de ${p.y}`;
  return `${p.d} ${s.months[p.m - 1]} ${p.y}`;
};

const shortLabel = (s: Strings, iso: string) => {
  const p = parseIso(iso)!;
  return `${s.weekdays[new Date(iso + "T12:00:00Z").getUTCDay()]} ${p.d}.${p.m}.`;
};

function prefix(lang: MoonLang) { return FAMILIES[FAMILY[lang]].prefix; }
function tz(lang: MoonLang) { return FAMILIES[FAMILY[lang]].tz; }
const alternates = (path: (l: MoonLang) => string) => (["de", "es", "it"] as MoonLang[]).map((l) => ({ lang: l, path: path(l) }));

function typeLine(s: Strings, md: MoonDay): string {
  return md.dayTypes.map((t, i) => `${esc(s.types[t.value])}${i ? ` <span class="muted">${esc(s.from)} ${esc(localHm(t.from, md.tz))}</span>` : ""}`).join(" → ");
}
function signLine(s: Strings, md: MoonDay): string {
  return md.signs.map((t, i) => `${esc(s.signs[t.value])}${i ? ` <span class="muted">${esc(s.from)} ${esc(localHm(t.from, md.tz))}</span>` : ""}`).join(" → ");
}

function dayBody(lang: MoonLang, md: MoonDay, isToday: boolean): string {
  const s = STR[lang];
  const P = prefix(lang);
  const ev = md.events.map((e) => `<li>${esc(localHm(e.at, md.tz))} — ${esc(s.events[e.kind])}${e.distanceKm ? ` (${e.distanceKm.toLocaleString(s.locale)} km)` : ""}</li>`).join("");
  const week = Array.from({ length: 7 }, (_, i) => addDaysIso(md.date, i + 1)).map((iso) => {
    const d = moonDay(iso, md.tz);
    return `<tr><td><a href="${P}/${iso}">${esc(shortLabel(s, iso))}</a></td><td>${PHASE_ICON(d.phaseAngle)}</td><td>${esc(s.types[d.mainDayType])}${d.unfavourable ? " ⚠" : ""}</td><td>${esc(s.signs[d.mainSign])}</td><td title="${esc(d.ascending ? s.asc : s.desc)}">${d.ascending ? "↑" : "↓"}</td></tr>`;
  }).join("");
  const hair = lang === "de" ? `<p><a href="${P}/haare-schneiden">✂ ${esc(s.hair!)}: ${esc({ best: "sehr günstig (Löwe)", good: "günstig (Jungfrau)", neutral: "neutral", avoid: "ungünstig (Fische/Krebs)" }[haircutRating(md)])}</a></p>` : "";
  const [y, m] = md.date.split("-");
  return `<section><p class="big">${PHASE_ICON(md.phaseAngle)} ${esc(md.waxing ? s.waxing : s.waning)} · ${Math.round(md.illumination * 100)} % ${esc(s.illum)}</p>
<table><tbody><tr><th>${esc(s.dayType)}</th><td>${typeLine(s, md)}</td></tr><tr><th>${esc(s.signTropical)}</th><td>${signLine(s, md)}</td></tr>
<tr><th>${esc(md.ascending ? s.asc : s.desc)}</th><td>${esc(md.ascending ? s.ascAdvice : s.descAdvice)}</td></tr></tbody></table>${md.unfavourable ? `<p class="warn">⚠ ${esc(s.unfavourable)}</p>` : ""}${hair}</section>
${ev ? `<section><h2>${esc(s.phase)}</h2><ul>${ev}</ul></section>` : ""}
<section><h2>${esc(s.garden)}</h2><p>${esc(s.advice[md.mainDayType])}</p><p>${esc(md.waxing ? s.waxAdvice : s.wanAdvice)}</p>${md.unfavourable ? `<p class="warn">${esc(s.restAdvice)}</p>` : ""}${s.phaseOnly ? `<p class="note">${esc(s.phaseOnly)}</p>` : ""}</section>
<section><h2>${esc(s.next7)}</h2><table><tbody>${week}</tbody></table><p><a href="${P}/${addDaysIso(md.date, -1)}">← ${esc(s.prev)}</a> · <a href="${P}/${addDaysIso(md.date, 1)}">${esc(s.next)} →</a> · <a href="${P}/${y}/${m}">${esc(s.month)}</a>${isToday ? "" : ` · <a href="${P}">${esc(s.today)}</a>`}</p></section>`;
}

function todayPage(ctx: Ctx, lang: MoonLang): Rendered {
  const s = STR[lang], P = prefix(lang);
  const iso = todayIn(tz(lang), ctx.now);
  const md = moonDay(iso, tz(lang));
  return {
    status: 200, maxAge: "midnight", tz: tz(lang), indexable: true,
    html: page({
      site: ctx.site, path: P, lang, title: s.todayTitle(dLabel(s, iso), s.types[md.mainDayType]), description: `${dLabel(s, iso)}: ${md.waxing ? s.waxing : s.waning}, ${s.types[md.mainDayType]}, ${s.signs[md.mainSign]}, ${md.ascending ? s.asc : s.desc}.`,
      h1: esc(s.todayH1), sub: esc(dLabel(s, iso)), crumbs: [{ href: P, label: s.brand }], indexable: true, alternates: alternates((l) => prefix(l)),
      body: dayBody(lang, md, true), footer: `<p class="note">${esc(s.disclaimer)}</p>`,
    }),
  };
}

function datePage(ctx: Ctx, lang: MoonLang, iso: string): Rendered | null {
  const p = parseIso(iso);
  if (!p || p.y < RANGE.min || p.y > RANGE.max) return null;
  const s = STR[lang], P = prefix(lang);
  const md = moonDay(iso, tz(lang));
  const today = todayIn(tz(lang), ctx.now);
  const diff = isoToJdn(iso) - isoToJdn(today);
  const ix = diff >= -INDEX_WINDOW.pastDays && diff <= INDEX_WINDOW.futureDays;
  return {
    status: 200, maxAge: 86400 * 7, indexable: ix,
    html: page({
      site: ctx.site, path: `${P}/${iso}`, lang, title: s.dateTitle(dLabel(s, iso), s.types[md.mainDayType]), description: `${dLabel(s, iso)}: ${md.waxing ? s.waxing : s.waning}, ${s.types[md.mainDayType]}, ${s.signs[md.mainSign]}, ${md.ascending ? s.asc : s.desc}.`,
      h1: esc(`${s.brand} ${dLabel(s, iso)}`), crumbs: [{ href: P, label: s.brand }, { href: `${P}/${iso.slice(0, 4)}/${iso.slice(5, 7)}`, label: `${s.months[p.m - 1]} ${p.y}` }, { href: `${P}/${iso}`, label: dLabel(s, iso) }],
      indexable: ix, alternates: alternates((l) => `${prefix(l)}/${iso}`), body: dayBody(lang, md, iso === today), footer: `<p class="note">${esc(s.disclaimer)}</p>`,
    }),
  };
}

function monthPage(ctx: Ctx, lang: MoonLang, y: number, m: number): Rendered | null {
  if (y < RANGE.min || y > RANGE.max || m < 1 || m > 12) return null;
  const s = STR[lang], P = prefix(lang);
  const rows = Array.from({ length: daysInGregorianMonth(y, m) }, (_, i) => `${y}-${pad2(m)}-${pad2(i + 1)}`).map((iso) => {
    const d = moonDay(iso, tz(lang));
    const wd = s.weekdays[new Date(iso + "T12:00:00Z").getUTCDay()];
    return `<tr><td><a href="${P}/${iso}">${wd} ${Number(iso.slice(8))}.</a></td><td>${PHASE_ICON(d.phaseAngle)} ${d.events.filter((e) => ["new-moon", "first-quarter", "full-moon", "last-quarter"].includes(e.kind)).map((e) => esc(s.events[e.kind])).join(", ")}</td><td>${typeLine(s, d)}${d.unfavourable ? " ⚠" : ""}</td><td>${esc(s.signs[d.mainSign])}</td><td>${esc(d.ascending ? "↑" : "↓")}</td></tr>`;
  }).join("");
  const today = todayIn(tz(lang), ctx.now);
  const monthsAway = (y - Number(today.slice(0, 4))) * 12 + (m - Number(today.slice(5, 7)));
  const ix = monthsAway >= -12 && monthsAway <= 24;
  const prevY = m === 1 ? y - 1 : y, prevM = m === 1 ? 12 : m - 1, nextY = m === 12 ? y + 1 : y, nextM = m === 12 ? 1 : m + 1;
  return {
    status: 200, maxAge: 86400 * 7, indexable: ix,
    html: page({
      site: ctx.site, path: `${P}/${y}/${pad2(m)}`, lang, title: s.monthTitle(`${s.months[m - 1]} ${y}`), description: `${s.brand} ${s.months[m - 1]} ${y}: ${s.phase}, ${Object.values(s.types).join(", ")}.`,
      h1: esc(`${s.brand} ${s.months[m - 1]} ${y}`), crumbs: [{ href: P, label: s.brand }, { href: `${P}/${y}/${pad2(m)}`, label: `${s.months[m - 1]} ${y}` }], indexable: ix,
      alternates: alternates((l) => `${prefix(l)}/${y}/${pad2(m)}`),
      body: `<section><table><thead><tr><th></th><th>${esc(s.phase)}</th><th>${esc(s.dayType)}</th><th>${esc(s.sign)}</th><th>↑↓</th></tr></thead><tbody>${rows}</tbody></table><p class="note">⚠ ${esc(s.unfavourable)}</p></section>
<section><p><a href="${P}/${prevY}/${pad2(prevM)}">← ${esc(s.months[prevM - 1])} ${prevY}</a> · <a href="${P}/${nextY}/${pad2(nextM)}">${esc(s.months[nextM - 1])} ${nextY} →</a></p></section>`,
      footer: `<p class="note">${esc(s.disclaimer)}</p>`,
    }),
  };
}

function haircutPage(ctx: Ctx): Rendered {
  const P = prefix("de"), TZ = tz("de"), s = STR.de;
  const today = todayIn(TZ, ctx.now);
  const days = Array.from({ length: 31 }, (_, i) => addDaysIso(today, i)).map((iso) => ({ iso, d: moonDay(iso, TZ) }));
  const label = { best: "sehr günstig", good: "günstig", neutral: "neutral", avoid: "ungünstig" } as const;
  const rows = days.map(({ iso, d }) => {
    const r = haircutRating(d);
    const purpose = r === "best" || r === "good" ? (d.waxing ? "für Wachstum und Volumen (zunehmender Mond)" : "für haltbare Kurzhaarschnitte (abnehmender Mond)") : "";
    return `<tr><td><a href="${P}/${iso}">${esc(s.weekdays[new Date(iso + "T12:00:00Z").getUTCDay()])} ${esc(dLabel(s, iso))}</a></td><td>${esc(s.signs[d.mainSign])}</td><td><b>${esc(label[r])}</b>${purpose ? `<br><span class="note">${esc(purpose)}</span>` : ""}</td></tr>`;
  }).join("");
  const r0 = haircutRating(days[0].d);
  return {
    status: 200, maxAge: "midnight", tz: TZ, indexable: true,
    html: page({
      site: ctx.site, path: `${P}/haare-schneiden`, lang: "de", title: `Haare schneiden nach dem Mondkalender: heute ${label[r0]} – die besten Tage der nächsten 30 Tage`,
      description: `Wann Haare schneiden nach dem Mond? Heute steht der Mond im Zeichen ${s.signs[days[0].d.mainSign]} (${label[r0]}). Die günstigsten Tage der nächsten 30 Tage nach der Tradition.`,
      h1: "Haare schneiden nach dem Mondkalender", sub: esc(`Heute: ${s.signs[days[0].d.mainSign]} · ${label[r0]}`), crumbs: [{ href: P, label: s.brand }, { href: `${P}/haare-schneiden`, label: "Haare schneiden" }], indexable: true,
      body: `<section><p>Nach der verbreiteten Tradition gilt: Löwe ist das beste Zeichen, Jungfrau das zweitbeste; in Fische und Krebs lieber nicht schneiden. Bei zunehmendem Mond schneiden, wenn die Haare kräftig nachwachsen sollen; bei abnehmendem Mond, wenn ein kurzer Schnitt lange halten soll. Grundlage ist der tropische Tierkreis.</p></section>
<section><table><thead><tr><th>Tag</th><th>Mondzeichen</th><th>Bewertung</th></tr></thead><tbody>${rows}</tbody></table></section>`,
      footer: `<p class="note">${esc(s.disclaimer)}</p>`,
    }),
  };
}

export function moonRoute(lang: MoonLang, ctx: Ctx, rest: string[]): Rendered | null {
  if (!rest.length) return todayPage(ctx, lang);
  if (rest.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(rest[0])) return datePage(ctx, lang, rest[0]);
  if (rest.length === 2 && /^\d{4}$/.test(rest[0]) && /^\d{2}$/.test(rest[1])) return monthPage(ctx, lang, Number(rest[0]), Number(rest[1]));
  if (lang === "de" && rest.length === 1 && rest[0] === "haare-schneiden") return haircutPage(ctx);
  return null;
}

export function moonUrls(lang: MoonLang, now: Date): string[] {
  const P = prefix(lang);
  const out = [P, ...(lang === "de" ? [`${P}/haare-schneiden`] : [])];
  const today = todayIn(tz(lang), now);
  const y0 = Number(today.slice(0, 4)), m0 = Number(today.slice(5, 7));
  for (let k = -12; k <= 24; k++) { const t = y0 * 12 + (m0 - 1) + k; out.push(`${P}/${Math.floor(t / 12)}/${pad2((t % 12) + 1)}`); }
  for (let i = -INDEX_WINDOW.pastDays; i <= INDEX_WINDOW.futureDays; i++) out.push(`${P}/${addDaysIso(today, i)}`);
  return out;
}

export type { MoonLang };
