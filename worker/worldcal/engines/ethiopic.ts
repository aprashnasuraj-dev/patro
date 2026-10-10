/**
 * Ethiopian (Ge'ez) calendar engine.
 *
 * Epoch: 1 Meskerem 1 E.C. = JDN 1724221 (Julian 29 Aug 8 CE). Leap year when E.Y. mod 4 == 3 (Pagume 6).
 * Verified against ICU/CLDR `ethiopic` for every day 1890-01-01 … 2109-12-31 (zero mismatches) — see
 * docs/worldcal/RESEARCH.md. Never hard-code "New Year = 11/12 September": it shifts after 2100.
 */
import { gregorianToJdn, jdnToGregorian, mod, type Ymd } from "../dates";
import { orthodoxEaster } from "./easter";

export const ETH_EPOCH = 1724221;

export type EthDate = { year: number; month: number; day: number }; // month 1..13

export const isEthLeap = (year: number) => mod(year, 4) === 3;
export const ethMonthLength = (year: number, month: number) => (month < 13 ? 30 : isEthLeap(year) ? 6 : 5);

export function ethToJdn(year: number, month: number, day: number): number {
  return ETH_EPOCH + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + (day - 1);
}

export function jdnToEth(jdn: number): EthDate {
  const year = Math.floor((4 * (jdn - ETH_EPOCH) + 1463) / 1461);
  const month = Math.floor((jdn - ethToJdn(year, 1, 1)) / 30) + 1;
  const day = jdn - ethToJdn(year, month, 1) + 1;
  return { year, month, day };
}

export const gregorianToEth = (g: Ymd) => jdnToEth(gregorianToJdn(g.y, g.m, g.d));
export const ethToGregorian = (e: EthDate) => jdnToGregorian(ethToJdn(e.year, e.month, e.day));

export function isValidEth(e: EthDate): boolean {
  return Number.isInteger(e.year) && e.year >= 1 && e.month >= 1 && e.month <= 13 && e.day >= 1 && e.day <= ethMonthLength(e.year, e.month);
}

export const ETH_MONTHS = [
  { am: "መስከረም", en: "Meskerem", slug: "meskerem" },
  { am: "ጥቅምት", en: "Tikimt", slug: "tikimt" },
  { am: "ኅዳር", en: "Hidar", slug: "hidar" },
  { am: "ታኅሣሥ", en: "Tahsas", slug: "tahsas" },
  { am: "ጥር", en: "Tir", slug: "tir" },
  { am: "የካቲት", en: "Yekatit", slug: "yekatit" },
  { am: "መጋቢት", en: "Megabit", slug: "megabit" },
  { am: "ሚያዝያ", en: "Miyazya", slug: "miyazya" },
  { am: "ግንቦት", en: "Ginbot", slug: "ginbot" },
  { am: "ሰኔ", en: "Sene", slug: "sene" },
  { am: "ሐምሌ", en: "Hamle", slug: "hamle" },
  { am: "ነሐሴ", en: "Nehase", slug: "nehase" },
  { am: "ጳጉሜን", en: "Pagume", slug: "pagume" },
] as const;

/** Index 0 = Monday (JDN mod 7 == 0). Amharic from CLDR; transliterations need native review. */
export const ETH_WEEKDAYS = [
  { am: "ሰኞ", en: "Monday" },
  { am: "ማክሰኞ", en: "Tuesday" },
  { am: "ረቡዕ", en: "Wednesday" },
  { am: "ሐሙስ", en: "Thursday" },
  { am: "ዓርብ", en: "Friday" },
  { am: "ቅዳሜ", en: "Saturday" },
  { am: "እሑድ", en: "Sunday" },
] as const;
export const ethWeekday = (jdn: number) => ETH_WEEKDAYS[mod(jdn, 7)];

export const EVANGELISTS = [
  { am: "ዮሐንስ", en: "Yohannes (John)" },
  { am: "ማቴዎስ", en: "Matewos (Matthew)" },
  { am: "ማርቆስ", en: "Markos (Mark)" },
  { am: "ሉቃስ", en: "Lukas (Luke)" },
] as const;
export const ameteAlem = (year: number) => year + 5500;
/** AA mod 4: 1 Matewos, 2 Markos, 3 Lukas (leap year), 0 Yohannes. */
export const evangelistOf = (year: number) => EVANGELISTS[mod(ameteAlem(year), 4)];

/** Ge'ez numerals (U+1369–U+137C). Ge'ez has no zero; valid for 1 … 9999 (calendar range). */
export function geezNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) return String(n);
  const ONES = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
  const TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];
  const pair = (v: number) => TENS[Math.floor(v / 10)] + ONES[v % 10];
  const hi = Math.floor(n / 100), lo = n % 100;
  if (!hi) return pair(lo);
  return (hi === 1 ? "" : pair(hi)) + "፻" + (lo ? pair(lo) : "");
}

/** "ቅዳሜ፣ 30 መስከረም 2019 ዓ.ም." (CLDR gives "ERA1" for the era, so it is appended here). */
export function formatEthAm(e: EthDate, jdn: number, geez = false): string {
  const num = (n: number) => (geez ? geezNumeral(n) : String(n));
  return `${ethWeekday(jdn).am}፣ ${num(e.day)} ${ETH_MONTHS[e.month - 1].am} ${num(e.year)} ዓ.ም.`;
}
export const formatEthEn = (e: EthDate) => `${e.day} ${ETH_MONTHS[e.month - 1].en} ${e.year} E.C.`;

/**
 * Ethiopian clock: hours are counted from about 06:00 (daytime) and 18:00 (night).
 * h_E = ((h_W + 5) mod 12) + 1, minutes unchanged. 08:00 → 2, 18:00 → 12, 00:00 → 6.
 */
export function ethiopianClock(hour24: number, minute: number): { hour: number; minute: number; daytime: boolean } {
  return { hour: mod(hour24 + 5, 12) + 1, minute, daytime: hour24 >= 6 && hour24 < 18 };
}

// ---------- Bahire Hasab (Ethiopian computus) ----------

export type BahireHasab = {
  ameteAlem: number;
  evangelist: (typeof EVANGELISTS)[number];
  medeb: number;
  wenber: number;
  abekte: number;
  metqe: number;
  bealeMetqe: EthDate;
  tewsak: number;
  nenewe: number; // JDN (always Monday)
  feasts: Record<FeastKey, number>; // JDN
};
export type FeastKey = "nenewe" | "abiyTsom" | "debreZeit" | "hosanna" | "siklet" | "fasika" | "rikbeKahnat" | "erget" | "paraclete" | "tsomeHawariat" | "tsomeDihnet";

export const FEAST_OFFSETS: Record<FeastKey, { days: number; en: string; am: string }> = {
  nenewe: { days: 0, en: "Fast of Nineveh (Nenewe)", am: "ጾመ ነነዌ" },
  abiyTsom: { days: 14, en: "Great Lent begins (Abiy Tsom)", am: "ዐቢይ ጾም" },
  debreZeit: { days: 41, en: "Debre Zeit (mid-Lent)", am: "ደብረ ዘይት" },
  hosanna: { days: 62, en: "Palm Sunday (Hosanna)", am: "ሆሣዕና" },
  siklet: { days: 67, en: "Good Friday (Siklet)", am: "ስቅለት" },
  fasika: { days: 69, en: "Easter (Fasika)", am: "ፋሲካ" },
  rikbeKahnat: { days: 93, en: "Rikbe Kahnat", am: "ርክበ ካህናት" },
  erget: { days: 108, en: "Ascension (Erget)", am: "ዕርገት" },
  paraclete: { days: 118, en: "Pentecost (Paraclete)", am: "ጰራቅሊጦስ" },
  tsomeHawariat: { days: 119, en: "Fast of the Apostles begins", am: "ጾመ ሐዋርያት" },
  tsomeDihnet: { days: 121, en: "Wednesday/Friday fasting resumes (Tsome Dihnet)", am: "ጾመ ድኅነት" },
};

const TEWSAK_BY_WEEKDAY_MON0 = [6, 5, 4, 3, 2, 8, 7]; // Mon..Sun → Mon 6, Tue 5, Wed 4, Thu 3, Fri 2, Sat 8, Sun 7

/** Bahire Hasab for Ethiopian year `year` (its movable feasts fall in Gregorian year `year + 8`). */
export function bahireHasab(year: number): BahireHasab {
  const aa = ameteAlem(year);
  const medeb = mod(aa, 19);
  const wenber = medeb === 0 ? 18 : medeb - 1;
  const abekte = mod(wenber * 11, 30);
  const metqe = mod(wenber * 19, 30);
  // Beale Metqe: Meskerem <metqe> when metqe > 14, else Tikimt <metqe>; metqe 0 = Meskerem 30.
  const bealeMetqe: EthDate = metqe === 0 ? { year, month: 1, day: 30 } : metqe > 14 ? { year, month: 1, day: metqe } : { year, month: 2, day: metqe };
  const bmJdn = ethToJdn(bealeMetqe.year, bealeMetqe.month, bealeMetqe.day);
  const tewsak = TEWSAK_BY_WEEKDAY_MON0[mod(bmJdn, 7)];
  const nenewe = bmJdn + 120 + tewsak;
  const feasts = Object.fromEntries(Object.entries(FEAST_OFFSETS).map(([k, v]) => [k, nenewe + v.days])) as Record<FeastKey, number>;
  return { ameteAlem: aa, evangelist: evangelistOf(year), medeb, wenber, abekte, metqe, bealeMetqe, tewsak, nenewe, feasts };
}

/** Fasika via the Julian computus — must equal bahireHasab(...).feasts.fasika (tested 1600–2399). */
export const fasikaJdnForGregorianYear = (gy: number) => {
  const e = orthodoxEaster(gy);
  return gregorianToJdn(e.y, e.m, e.d);
};

// ---------- Public holidays ----------

export type EthHoliday = { key: string; en: string; am: string; jdn: number; kind: "public" | "religious"; note?: string; tentative?: boolean };

/** Holidays fixed in the Ethiopian calendar (stored as Ethiopian dates, converted for display). */
export const FIXED_ETH_HOLIDAYS = [
  { key: "enkutatash", month: 1, day: 1, en: "Ethiopian New Year (Enkutatash)", am: "እንቁጣጣሽ" },
  { key: "meskel", month: 1, day: 17, en: "Finding of the True Cross (Meskel)", am: "መስቀል" },
  { key: "genna", month: 4, day: 29, en: "Ethiopian Christmas (Genna)", am: "ገና" },
  { key: "timkat", month: 5, day: 11, en: "Epiphany (Timkat)", am: "ጥምቀት" },
  { key: "adwa", month: 6, day: 23, en: "Adwa Victory Day", am: "የዓድዋ ድል በዓል" },
  { key: "patriots", month: 8, day: 27, en: "Patriots' Victory Day", am: "የአርበኞች ቀን" },
  { key: "derg", month: 9, day: 20, en: "Derg Downfall Day", am: "ደርግ የወደቀበት ቀን" },
] as const;

/** Hijri-based public holidays: tentative until announced (moon sighting). Only years with a cited list are shown. */
export const ISLAMIC_HOLIDAYS_TENTATIVE: Record<number, { key: string; en: string; am: string; date: string }[]> = {
  2026: [
    { key: "eid-al-fitr", en: "Eid al-Fitr", am: "ኢድ አልፈጥር", date: "2026-03-20" },
    { key: "eid-al-adha", en: "Eid al-Adha", am: "ኢድ አልአድሐ", date: "2026-05-27" },
    { key: "mawlid", en: "Mawlid (Prophet's Birthday)", am: "መውሊድ", date: "2026-08-26" },
  ],
  2027: [
    { key: "eid-al-fitr", en: "Eid al-Fitr", am: "ኢድ አልፈጥር", date: "2027-03-10" },
    { key: "eid-al-adha", en: "Eid al-Adha", am: "ኢድ አልአድሐ", date: "2027-05-17" },
    { key: "mawlid", en: "Mawlid (Prophet's Birthday)", am: "መውሊድ", date: "2027-08-15" },
  ],
};

/** All holidays whose Gregorian date falls in Gregorian year gy, sorted by date. */
export function ethiopianHolidays(gy: number): EthHoliday[] {
  const out: EthHoliday[] = [];
  const start = gregorianToJdn(gy, 1, 1), end = gregorianToJdn(gy, 12, 31);
  for (const ey of [gy - 8, gy - 7]) {
    for (const h of FIXED_ETH_HOLIDAYS) {
      const jdn = ethToJdn(ey, h.month, h.day);
      if (jdn < start || jdn > end) continue;
      const g = jdnToGregorian(jdn);
      const note = h.key === "genna" && g.m === 1 && g.d === 8
        ? "Tahsas 29 falls on 8 January this year. Many sources say Genna is then kept on Tahsas 28 (7 January); confirm with the Ethiopian Orthodox Tewahedo Church."
        : h.key === "derg" && gy >= 2027
          ? "Listed in earlier official calendars; confirm this year's status."
          : undefined;
      out.push({ key: h.key, en: h.en, am: h.am, jdn, kind: "public", note });
    }
  }
  const bh = bahireHasab(gy - 8);
  out.push({ key: "siklet", en: FEAST_OFFSETS.siklet.en, am: FEAST_OFFSETS.siklet.am, jdn: bh.feasts.siklet, kind: "public" });
  out.push({ key: "fasika", en: FEAST_OFFSETS.fasika.en, am: FEAST_OFFSETS.fasika.am, jdn: bh.feasts.fasika, kind: "public" });
  out.push({ key: "labour", en: "International Labour Day", am: "የሠራተኞች ቀን", jdn: gregorianToJdn(gy, 5, 1), kind: "public" });
  for (const h of ISLAMIC_HOLIDAYS_TENTATIVE[gy] || []) {
    const [y, m, d] = h.date.split("-").map(Number);
    out.push({ key: h.key, en: h.en, am: h.am, jdn: gregorianToJdn(y, m, d), kind: "public", tentative: true, note: "Tentative: depends on the moon sighting and the official announcement." });
  }
  for (const key of ["nenewe", "abiyTsom", "hosanna", "erget", "paraclete"] as FeastKey[]) {
    out.push({ key, en: FEAST_OFFSETS[key].en, am: FEAST_OFFSETS[key].am, jdn: bh.feasts[key], kind: "religious" });
  }
  return out.filter((h) => h.jdn >= start && h.jdn <= end).sort((a, b) => a.jdn - b.jdn);
}
