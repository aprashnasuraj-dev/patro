/** Name-day lookups over the vendored datasets (worker/worldcal/data/namedays, built by scripts/worldcal/vendor-namedays.mjs). */
import cz from "./data/namedays/czech-republic.json";
import sk from "./data/namedays/slovakia.json";
import hu from "./data/namedays/hungary.json";
import pl from "./data/namedays/poland.json";
import { isGregorianLeap, parseIso, pad2 } from "./dates";

type Dataset = {
  country: string; code: string; lang: string; tz: string; leapRule: "fixed" | "hu-shift";
  source: { name: string; url: string; package: string };
  license: { name: string; url: string };
  reviewNotes: string[];
  days: Record<string, string[]>;
};

export type NamedayCountry = {
  slug: string;
  enabled: boolean;
  data: Dataset;
  t: {
    countryName: string; todayTitle: (date: string) => string; todayH1: string; dateTitle: (label: string) => string;
    nameTitle: (name: string) => string; nameH1: (name: string) => string; whose: string; tomorrow: string; yesterday: string;
    week: string; allNames: string; noName: string; greeting: string; greetingNote: string; search: string; searchButton: string;
    sourceLine: string; when: (name: string) => string; leapNote?: string; calendarCta: string; months: string[];
    weekdays: string[]; dataset: string; notFound: (q: string) => string; month: string;
  };
};

const CS_MONTHS = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const SK_MONTHS = ["januára", "februára", "marca", "apríla", "mája", "júna", "júla", "augusta", "septembra", "októbra", "novembra", "decembra"];
const HU_MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
const PL_MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

export const NAMEDAY_COUNTRIES: NamedayCountry[] = [
  {
    slug: "czech-republic", enabled: true, data: cz as Dataset,
    t: {
      countryName: "Česko", todayTitle: (d) => `Svátek dnes (${d}) – kdo má dnes svátek`, todayH1: "Kdo má dnes svátek", dateTitle: (l) => `Svátek ${l} – kdo slaví jmeniny`,
      nameTitle: (n) => `Kdy má svátek ${n}? Datum jmenin`, nameH1: (n) => `Kdy má svátek ${n}`, whose: "Svátek má", tomorrow: "Zítra", yesterday: "Včera",
      week: "Svátky na příštích 7 dní", allNames: "Všechna jména v kalendáři", noName: "Tento den není v kalendáři žádné jméno (státní svátek).",
      greeting: "Všechno nejlepší k svátku!", greetingNote: "Tradiční přání", search: "Hledat jméno", searchButton: "Najít",
      sourceLine: "Zdroj jmen", when: (n) => `${n} má svátek`, calendarCta: "Přidat připomínku do kalendáře", months: CS_MONTHS,
      weekdays: ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"], dataset: "Otevřená data (CC BY-SA)", notFound: (q) => `Jméno „${q}“ v kalendáři nenajdeme.`, month: "Měsíc",
    },
  },
  {
    slug: "slovakia", enabled: true, data: sk as Dataset,
    t: {
      countryName: "Slovensko", todayTitle: (d) => `Meniny dnes (${d}) – kto má dnes meniny`, todayH1: "Kto má dnes meniny", dateTitle: (l) => `Meniny ${l} – kto oslavuje`,
      nameTitle: (n) => `Kedy má meniny ${n}? Dátum menín`, nameH1: (n) => `Kedy má meniny ${n}`, whose: "Meniny má", tomorrow: "Zajtra", yesterday: "Včera",
      week: "Meniny na najbližších 7 dní", allNames: "Všetky mená v kalendári", noName: "V tento deň nie je v kalendári žiadne meno (sviatok).",
      greeting: "Veľa všetkého dobrého!", greetingNote: "Tradičné prianie", search: "Hľadať meno", searchButton: "Hľadať",
      sourceLine: "Zdroj mien (podľa kalendára MK SR)", when: (n) => `${n} má meniny`, calendarCta: "Pridať pripomienku do kalendára", months: SK_MONTHS,
      weekdays: ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"], dataset: "Otvorené dáta", notFound: (q) => `Meno „${q}“ sme v kalendári nenašli.`, month: "Mesiac",
    },
  },
  {
    slug: "hungary", enabled: true, data: hu as Dataset,
    t: {
      countryName: "Magyarország", todayTitle: (d) => `Mai névnap (${d}) – kinek van ma névnapja`, todayH1: "Kinek van ma névnapja", dateTitle: (l) => `Névnap ${l} – kik ünnepelnek`,
      nameTitle: (n) => `Mikor van ${n} névnapja? Névnap dátuma`, nameH1: (n) => `Mikor van ${n} névnapja`, whose: "Névnapjukat ünneplik", tomorrow: "Holnap", yesterday: "Tegnap",
      week: "Névnapok a következő 7 napban", allNames: "Minden név a naptárban", noName: "Ezen a napon nincs névnap.",
      greeting: "Boldog névnapot!", greetingNote: "Hagyományos jókívánság", search: "Név keresése", searchButton: "Keresés",
      sourceLine: "A nevek forrása", when: (n) => `${n} névnapja`, leapNote: "Szökőévben február 24-én nincs névnap, a február 24–28-i névnapok egy nappal később, február 25–29-én vannak.",
      calendarCta: "Emlékeztető hozzáadása a naptárhoz", months: HU_MONTHS,
      weekdays: ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"], dataset: "Nyílt adatok (CC BY-SA)", notFound: (q) => `A(z) „${q}” név nem szerepel a naptárban.`, month: "Hónap",
    },
  },
  {
    slug: "poland", enabled: true, data: pl as Dataset,
    t: {
      countryName: "Polska", todayTitle: (d) => `Imieniny dzisiaj (${d}) – kto obchodzi imieniny`, todayH1: "Kto dziś obchodzi imieniny", dateTitle: (l) => `Imieniny ${l} – kto obchodzi`,
      nameTitle: (n) => `Kiedy imieniny obchodzi ${n}? Daty imienin`, nameH1: (n) => `Kiedy imieniny obchodzi ${n}`, whose: "Imieniny obchodzą", tomorrow: "Jutro", yesterday: "Wczoraj",
      week: "Imieniny w najbliższych 7 dniach", allNames: "Wszystkie imiona w kalendarzu", noName: "Brak imienin tego dnia.",
      greeting: "Wszystkiego najlepszego!", greetingNote: "Tradycyjne życzenia", search: "Szukaj imienia", searchButton: "Szukaj",
      sourceLine: "Źródło imion", when: (n) => `${n} obchodzi imieniny`, calendarCta: "Dodaj przypomnienie do kalendarza", months: PL_MONTHS,
      weekdays: ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"], dataset: "Dane", notFound: (q) => `Nie znaleziono imienia „${q}”.`, month: "Miesiąc",
    },
  },
];

export const countryBySlug = (slug: string) => NAMEDAY_COUNTRIES.find((c) => c.slug === slug && c.enabled) || null;

/** Names celebrated on a civil date, applying the country's leap-year rule. */
export function namesOn(c: NamedayCountry, isoDate: string): string[] {
  const p = parseIso(isoDate);
  if (!p) return [];
  if (c.data.leapRule === "hu-shift" && p.m === 2 && isGregorianLeap(p.y)) {
    if (p.d === 24) return [];
    if (p.d >= 25) return c.data.days[`02-${pad2(p.d - 1)}`] || [];
  }
  return c.data.days[`${pad2(p.m)}-${pad2(p.d)}`] || [];
}

/** Names for a month-day key (non-leap reading), used by the static per-date pages. */
export const namesOnKey = (c: NamedayCountry, key: string) => c.data.days[key] || [];

export const slugifyName = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/ø/g, "o").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type NameEntry = { slug: string; names: string[]; keys: string[] };
const indexCache = new Map<string, Map<string, NameEntry>>();

export function nameIndex(c: NamedayCountry): Map<string, NameEntry> {
  let idx = indexCache.get(c.slug);
  if (idx) return idx;
  idx = new Map();
  for (const [key, names] of Object.entries(c.data.days)) {
    for (const name of names) {
      const slug = slugifyName(name);
      if (!slug) continue;
      const e = idx.get(slug) || { slug, names: [], keys: [] };
      if (!e.names.includes(name)) e.names.push(name);
      if (!e.keys.includes(key)) e.keys.push(key);
      idx.set(slug, e);
    }
  }
  indexCache.set(c.slug, idx);
  return idx;
}

export function dateLabel(c: NamedayCountry, key: string): string {
  const [m, d] = key.split("-").map(Number);
  if (c.data.lang === "hu") return `${c.t.months[m - 1]} ${d}.`;
  if (c.data.lang === "pl") return `${d} ${c.t.months[m - 1]}`;
  return `${d}. ${c.t.months[m - 1]}`;
}
