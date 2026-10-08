/**
 * Hindu / Nepali festival dates and timing windows for any city (US-first).
 *
 * Rules are data (FESTIVAL_DEFS) so a pandit/scholar can review them in one place.
 * Month numbers are PURNIMANTA (0 = Chaitra), the convention used in Nepal and North India,
 * matching src/patro-tools/festivals/festivals.ts. Where Nepal's official date (MoHA / Panchang
 * Nirnayak Samiti) exists, Nepal pages keep using it; these computed dates are for places
 * outside Nepal, where families commonly follow the local sunrise.
 */
import * as A from "astronomy-engine";
import { addDays, localDate, lunarMonthAt, nextTithiStart, panchangAt, sunriseSunset, zonedMidnight } from "../../src/patro-tools/core/astro";
import { occurrences, type Observance, type TithiRule } from "../../src/patro-tools/tithi-events/engine";
import type { GeoLocation } from "../../src/patro-tools/core/types";
import type { GrowthCity } from "./cities";

const HOUR = 3_600_000;

export type TimingKind =
  | "pradosh-overlap"   // window = pradosh (sunset + 3/15 of night) ∩ tithi — Lakshmi Puja, Dhanteras
  | "aparahna-overlap"  // window = aparahna (4th fifth of day) ∩ tithi — Dussehra, Bhai Dooj, Raksha Bandhan
  | "madhyahna-overlap" // window = madhyahna (3rd fifth of day) ∩ tithi — Ganesh Chaturthi, Ram Navami
  | "nishitha-overlap"  // window = nishitha (night midpoint ± 1/30 night) ∩ tithi — Janmashtami, Shivaratri
  | "moonrise"          // the moonrise time that evening — Karwa Chauth, Sankashti
  | "sunset-sunrise"    // sunset that day + sunrise next day — Chhath arghya
  | "sunrise";          // sunrise that day — most vratas

export interface FestivalDef {
  slug: string;              // URL slug (without year)
  name: string;              // English display name
  alt?: string[];            // other names people search
  ne?: string;               // Nepali / Devanagari
  rule: TithiRule & { moonrise?: boolean };
  timing: TimingKind;
  timingLabel: string;
  about: string;             // 1–2 sentence plain-English description (original text)
  related?: string[];
  /** day offset of the "public" celebration relative to the tithi day (Holi colours = +1) */
  publicOffset?: number;
  publicLabel?: string;
  /**
   * true = dates and windows were checked against an independent reference (Drik Panchang, New York 2026)
   * and match to the day and within ~2 minutes. Unverified festivals are rendered with noindex and a
   * "provisional" note until someone verifies them (see VALIDATION.md).
   */
  verified?: boolean;
  /** compute Bhadra (Vishti karana) end for Purnima festivals */
  bhadra?: boolean;
}

export const FESTIVAL_DEFS: FestivalDef[] = [
  { slug: "dhanteras", verified: true, name: "Dhanteras", alt: ["Dhanatrayodashi", "Dhantrayodashi"], ne: "धनतेरस", rule: { month: 7, paksha: "krishna", tithi: 13, observance: "pradosh" }, timing: "pradosh-overlap", timingLabel: "Dhanteras puja (pradosh) window", about: "The first day of the Diwali festival week, when families buy gold, silver or new utensils and light a lamp for Yama in the evening.", related: ["diwali", "narak-chaturdashi"] },
  { slug: "narak-chaturdashi", verified: true, name: "Narak Chaturdashi (Choti Diwali)", alt: ["Choti Diwali", "Kali Chaudas", "Roop Chaudas"], rule: { month: 7, paksha: "krishna", tithi: 14, observance: "udaya" }, timing: "sunrise", timingLabel: "Abhyanga snan before sunrise", about: "The day before Lakshmi Puja; a ritual oil bath before sunrise and lamps in the evening.", related: ["diwali"] },
  { slug: "diwali", verified: true, name: "Diwali (Lakshmi Puja)", alt: ["Deepavali", "Lakshmi Puja", "Laxmi Puja", "Tihar Laxmi Puja"], ne: "लक्ष्मी पूजा", rule: { month: 7, paksha: "krishna", tithi: 15, observance: "pradosh", prefer: "last" }, timing: "pradosh-overlap", timingLabel: "Lakshmi Puja muhurat (pradosh while Amavasya lasts)", about: "The main night of Diwali (Tihar in Nepal): homes are lit with lamps and the goddess Lakshmi is worshipped in the evening while the new-moon day (Amavasya) is in force.", related: ["dhanteras", "narak-chaturdashi", "govardhan-puja", "bhai-dooj"] },
  { slug: "govardhan-puja", verified: true, name: "Govardhan Puja / Annakut", alt: ["Annakut", "Gai Tihar & Goru Tihar day (Nepal)"], rule: { month: 7, paksha: "shukla", tithi: 1, observance: "udaya" }, timing: "sunrise", timingLabel: "Morning puja after sunrise", about: "The day after Lakshmi Puja: offerings of food (Annakut) for Krishna; in Nepal this is Goru Puja and Mha Puja (Newar new year).", related: ["diwali", "bhai-dooj"] },
  { slug: "bhai-dooj", verified: true, name: "Bhai Dooj / Bhai Tika", alt: ["Bhai Tika", "Bhau Beej", "Bhai Phota", "Yama Dwitiya"], ne: "भाइटीका", rule: { month: 7, paksha: "shukla", tithi: 2, observance: "aparahna" }, timing: "aparahna-overlap", timingLabel: "Afternoon (aparahna) tika window", about: "Sisters put tika on their brothers and pray for their long life. Nepal's Bhai Tika uses an official auspicious time announced in Nepal time.", related: ["diwali"] },
  { slug: "chhath-puja", name: "Chhath Puja", alt: ["Chhath", "Surya Shashti", "Dala Chhath"], ne: "छठ", rule: { month: 7, paksha: "shukla", tithi: 6, observance: "udaya" }, timing: "sunset-sunrise", timingLabel: "Sandhya arghya (sunset) and Usha arghya (next sunrise)", about: "Devotees offer arghya to the setting sun on Shashthi and to the rising sun the next morning, standing in water.", related: ["diwali"] },
  { slug: "karwa-chauth", verified: true, name: "Karwa Chauth", alt: ["Karva Chauth", "Karak Chaturthi"], rule: { month: 7, paksha: "krishna", tithi: 4, observance: "pradosh", moonrise: true }, timing: "moonrise", timingLabel: "Moonrise (fast is broken after sighting the moon)", about: "Married women fast from sunrise and break the fast after seeing the moon; the moonrise time is the key moment.", related: ["diwali"] },
  { slug: "navratri", name: "Navratri begins (Ghatasthapana)", alt: ["Sharad Navratri", "Ghatasthapana", "Dashain begins"], ne: "घटस्थापना", rule: { month: 6, paksha: "shukla", tithi: 1, observance: "udaya" }, timing: "sunrise", timingLabel: "Ghatasthapana in the morning after sunrise", about: "The first of nine nights of the goddess; in Nepal it begins Dashain with the sowing of jamara.", related: ["dussehra"] },
  { slug: "dussehra", name: "Dussehra / Vijaya Dashami", alt: ["Dasara", "Vijayadashami", "Dashain Tika"], ne: "विजया दशमी", rule: { month: 6, paksha: "shukla", tithi: 10, observance: "aparahna", prefer: "last" }, timing: "aparahna-overlap", timingLabel: "Aparahna (afternoon) window", about: "The tenth day: victory of good over evil. In Nepal it is Dashain Tika, given at an official auspicious time in Nepal time.", related: ["navratri", "sharad-purnima"] },
  { slug: "sharad-purnima", name: "Sharad Purnima / Kojagiri", alt: ["Kojagrat Purnima", "Kojagari Lakshmi Puja"], ne: "कोजाग्रत पूर्णिमा", rule: { month: 6, paksha: "shukla", tithi: 15, observance: "pradosh" }, timing: "moonrise", timingLabel: "Moonrise (kheer is kept under the moonlight)", about: "The brightest full moon of autumn; Lakshmi is believed to ask 'who is awake?' (ko jagarti) — families stay up at night.", related: ["dussehra", "diwali"] },
  { slug: "holika-dahan", bhadra: true, name: "Holika Dahan (Holi)", alt: ["Holi", "Choti Holi", "Fagu Purnima"], ne: "होली", rule: { month: 11, paksha: "shukla", tithi: 15, observance: "pradosh" }, timing: "pradosh-overlap", timingLabel: "Holika Dahan (bonfire) window after sunset", about: "The Holi bonfire is lit after sunset on the full-moon evening; colours are played the next day.", publicOffset: 1, publicLabel: "Holi colours (Rangwali Holi)" },
  { slug: "maha-shivaratri", name: "Maha Shivaratri", alt: ["Shivratri", "Mahashivratri"], ne: "महाशिवरात्रि", rule: { month: 11, paksha: "krishna", tithi: 14, observance: "nishitha" }, timing: "nishitha-overlap", timingLabel: "Nishita kaal puja window (around midnight)", about: "The great night of Shiva, observed with fasting and night-long worship; the midnight (nishita) window is the most important." },
  { slug: "ram-navami", name: "Ram Navami", alt: ["Rama Navami"], ne: "राम नवमी", rule: { month: 0, paksha: "shukla", tithi: 9, observance: "madhyahna" }, timing: "madhyahna-overlap", timingLabel: "Madhyahna (midday) puja window", about: "Birthday of Lord Rama, celebrated at midday." },
  { slug: "raksha-bandhan", verified: true, bhadra: true, name: "Raksha Bandhan / Janai Purnima", alt: ["Rakhi", "Janai Purnima", "Rakshya Bandhan"], ne: "जनै पूर्णिमा", rule: { month: 4, paksha: "shukla", tithi: 15, observance: "aparahna" }, timing: "aparahna-overlap", timingLabel: "Afternoon (aparahna) rakhi window", about: "Sisters tie rakhi on their brothers' wrists; in Nepal, Janai Purnima is when the sacred thread (janai) is changed. Many families also avoid the Bhadra period." },
  { slug: "janmashtami", name: "Krishna Janmashtami", alt: ["Janmashtami", "Gokulashtami"], ne: "कृष्ण जन्माष्टमी", rule: { month: 5, paksha: "krishna", tithi: 8, observance: "nishitha" }, timing: "nishitha-overlap", timingLabel: "Nishita puja window (Krishna's birth at midnight)", about: "Birth of Lord Krishna, celebrated at midnight with fasting until the nishita puja." },
  { slug: "ganesh-chaturthi", name: "Ganesh Chaturthi", alt: ["Vinayaka Chaturthi"], rule: { month: 5, paksha: "shukla", tithi: 4, observance: "madhyahna" }, timing: "madhyahna-overlap", timingLabel: "Madhyahna Ganesh puja window", about: "Ganesha's festival; the main puja is done at midday." },
  { slug: "teej", name: "Hartalika Teej", alt: ["Haritalika Teej", "Teej"], ne: "हरितालिका तीज", rule: { month: 5, paksha: "shukla", tithi: 3, observance: "udaya" }, timing: "sunrise", timingLabel: "Fast from sunrise", about: "Women fast (often without water) for marital happiness; one of the biggest festivals for Nepali women." },
];

export const FESTIVAL_BY_SLUG = new Map(FESTIVAL_DEFS.map((f) => [f.slug, f]));

export const asLoc = (c: GrowthCity): GeoLocation => ({ lat: c.lat, lon: c.lon, tz: c.tz, height: c.height, name: c.name });

export interface FestivalTiming {
  date: string;            // local civil date (yyyy-mm-dd)
  tithiStart: Date;
  tithiEnd: Date;
  fallback: boolean;
  window?: { start: Date; end: Date } | null;
  moonrise?: Date | null;
  sunrise?: Date;
  sunset?: Date;
  nextSunrise?: Date;
  publicDate?: string;
  /** end of Bhadra (Vishti karana = first half of Purnima) when def.bhadra */
  bhadraEnd?: Date;
}

function dayParts(date: string, loc: GeoLocation) {
  const { sunrise, sunset } = sunriseSunset(date, loc);
  const next = sunriseSunset(addDays(date, 1), loc).sunrise;
  return { sunrise, sunset, nextSunrise: next, day: sunset.getTime() - sunrise.getTime(), night: next.getTime() - sunset.getTime() };
}

function intersect(a0: number, a1: number, b0: number, b1: number) {
  const s = Math.max(a0, b0), e = Math.min(a1, b1);
  return e > s ? { start: new Date(s), end: new Date(e) } : null;
}

export function moonriseOn(date: string, loc: GeoLocation): Date | null {
  const obs = new A.Observer(loc.lat, loc.lon, loc.height ?? 0);
  const start = zonedMidnight(date, loc.tz);
  const r = A.SearchRiseSet(A.Body.Moon, obs, +1, start, 1.05);
  return r && r.date.getTime() < start.getTime() + 26 * HOUR ? r.date : null;
}

/** Karwa-Chauth-style rule: the day whose evening moonrise falls inside the tithi (fallback: tithi at sunrise). */
function moonriseRuleOccurrences(rule: TithiRule, from: string, to: string, loc: GeoLocation) {
  const base = occurrences({ ...rule, observance: "udaya" }, addDays(from, -3), addDays(to, 3), loc);
  return base.map((o) => {
    const candidates = [addDays(o.date, -1), o.date, addDays(o.date, 1)];
    const hit = candidates.find((d) => {
      const mr = moonriseOn(d, loc);
      return mr && mr >= o.tithiStart && mr < o.tithiEnd;
    });
    return { ...o, date: hit ?? o.date, fallback: !hit };
  }).filter((o) => o.date >= from && o.date <= to);
}

/**
 * @param near optional yyyy-mm-dd already found for another city: the search is narrowed to ±3 days,
 *             which cuts CPU ~20× when a page lists many cities (the lunar day is global, only the local
 *             civil date can shift by a day).
 */
export function festivalTimings(def: FestivalDef, year: number, city: GrowthCity, near?: string): FestivalTiming[] {
  const loc = asLoc(city);
  const lo = `${year}-01-01`, hi = `${year}-12-31`;
  const from = near && addDays(near, -3) > lo ? addDays(near, -3) : lo;
  const to = near && addDays(near, 3) < hi ? addDays(near, 3) : hi;
  const occ = def.rule.moonrise ? moonriseRuleOccurrences(def.rule, from, to, loc) : occurrences(def.rule, from, to, loc);
  return occ.map((o) => {
    const p = dayParts(o.date, loc);
    const t0 = o.tithiStart.getTime(), t1 = o.tithiEnd.getTime();
    const r = p.sunrise.getTime(), s = p.sunset.getTime();
    let window: FestivalTiming["window"];
    switch (def.timing) {
      case "pradosh-overlap": window = intersect(s, s + (p.night * 3) / 15, t0, t1); break;
      case "aparahna-overlap": window = intersect(r + (p.day * 3) / 5, r + (p.day * 4) / 5, t0, t1); break;
      case "madhyahna-overlap": window = intersect(r + (p.day * 2) / 5, r + (p.day * 3) / 5, t0, t1); break;
      case "nishitha-overlap": { const mid = s + p.night / 2; window = intersect(mid - p.night / 30, mid + p.night / 30, t0, t1); break; }
      default: window = undefined;
    }
    return {
      date: o.date, tithiStart: o.tithiStart, tithiEnd: o.tithiEnd, fallback: o.fallback, window,
      moonrise: def.timing === "moonrise" ? moonriseOn(o.date, loc) : undefined,
      sunrise: p.sunrise, sunset: p.sunset, nextSunrise: p.nextSunrise,
      publicDate: def.publicOffset ? addDays(o.date, def.publicOffset) : undefined,
      bhadraEnd: def.bhadra ? new Date(t0 + (t1 - t0) / 2) : undefined,
    };
  });
}

// ------------------------------------------------------------------------------------------- Ekadashi
/** Ekadashi names by AMANTA month index (0 = Chaitra) and paksha. Adhik months: Padmini (S) / Parama (K). */
const EKADASHI_NAMES: Record<number, [string, string]> = {
  0: ["Kamada", "Varuthini"], 1: ["Mohini", "Apara"], 2: ["Nirjala", "Yogini"], 3: ["Devshayani", "Kamika"],
  4: ["Shravana Putrada", "Aja"], 5: ["Parsva (Parivartini)", "Indira"], 6: ["Papankusha", "Rama"], 7: ["Devutthana (Prabodhini)", "Utpanna"],
  8: ["Mokshada", "Saphala"], 9: ["Pausha Putrada", "Shattila"], 10: ["Jaya", "Vijaya"], 11: ["Amalaki", "Papmochani"],
};

export interface EkadashiDay {
  name: string;
  paksha: "shukla" | "krishna";
  amantaMonth: number;
  adhik: boolean;
  date: string;          // fasting day (Smarta: Ekadashi at local sunrise)
  tithiStart: Date;
  tithiEnd: Date;
  kshaya: boolean;       // Ekadashi did not touch any sunrise → previous-day rule used
  vaishnavaDate?: string; // set when Smarta and Vaishnava dates differ
  parana: { start: Date; end: Date; dwadashiEnd: Date; note?: string };
}

export function ekadashisOfYear(year: number, city: GrowthCity): EkadashiDay[] {
  const loc = asLoc(city);
  const out: EkadashiDay[] = [];
  for (const target of [11, 26]) {
    let cursor = new Date(Date.UTC(year - 1, 11, 1));
    const stop = Date.UTC(year + 1, 0, 15);
    while (cursor.getTime() < stop) {
      const start = nextTithiStart(target, cursor);
      const end = nextTithiStart(target + 1, start);
      const dwEnd = nextTithiStart(target + 2, end);
      cursor = new Date(end.getTime() + HOUR);
      const d0 = localDate(new Date(start.getTime() - 24 * HOUR), loc.tz);
      let date: string | null = null;
      for (let i = 0; i < 4 && !date; i++) {
        const d = addDays(d0, i);
        const sr = sunriseSunset(d, loc).sunrise.getTime();
        if (sr >= start.getTime() && sr < end.getTime()) date = d;
      }
      const kshaya = !date;
      if (!date) date = localDate(start, loc.tz);
      const sunriseOf = (d: string) => sunriseSunset(d, loc).sunrise.getTime();
      // Vriddhi (Ekadashi touches two sunrises, "Unmilini"): householders fast on the second day.
      if (!kshaya && sunriseOf(addDays(date, 1)) < end.getTime()) date = addDays(date, 1);
      // Trisparsha / Mahadwadashi: Dwadashi ends before the next sunrise, so parana inside Dwadashi is
      // impossible the usual way; householders (Smarta) fast one day earlier, Vaishnava/ISKCON the later day.
      // Both rules verified against Drik Panchang, New York 2026 (Jan 14, Sep 6, Dec 19).
      let vaishnavaDate: string | undefined;
      if (!kshaya && dwEnd.getTime() <= sunriseOf(addDays(date, 1))) { vaishnavaDate = date; date = addDays(date, -1); }
      if (!date.startsWith(String(year))) continue;
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      const lm = lunarMonthAt(mid);
      const paksha = panchangAt(mid).paksha;
      const names = EKADASHI_NAMES[lm.amantaIndex];
      const name = lm.adhik ? (paksha === "shukla" ? "Padmini" : "Parama") : names[paksha === "shukla" ? 0 : 1];
      // Parana (breaking the fast) on the next day: after sunrise, after Hari Vasara (first quarter of
      // Dwadashi), preferably within pratahkal (first fifth of the day) and before Dwadashi ends.
      const { sunrise, sunset } = sunriseSunset(addDays(date, 1), loc);
      const hariVasaraEnd = end.getTime() + (dwEnd.getTime() - end.getTime()) / 4;
      const pratahEnd = sunrise.getTime() + (sunset.getTime() - sunrise.getTime()) / 5;
      let pStart = Math.max(sunrise.getTime(), hariVasaraEnd);
      let pEnd: number;
      let note: string | undefined;
      if (dwEnd.getTime() <= pStart) {
        pStart = sunrise.getTime(); pEnd = pratahEnd;
        note = "Dwadashi ends before the usual parana time; break the fast after sunrise.";
      } else if (pStart < pratahEnd) {
        pEnd = Math.min(pratahEnd, dwEnd.getTime());
      } else {
        // Morning (pratahkal) is lost to Hari Vasara: avoid madhyahna (midday) and break the fast in
        // aparahna, the 4th fifth of the day. Matches Drik Panchang NY 2026 (Oct 22: 1:45–3:55 PM).
        const fifth = (sunset.getTime() - sunrise.getTime()) / 5;
        pStart = Math.max(pStart, sunrise.getTime() + 3 * fifth);
        pEnd = Math.min(sunrise.getTime() + 4 * fifth, dwEnd.getTime());
        if (pEnd <= pStart) pEnd = Math.min(dwEnd.getTime(), pStart + fifth);
        note = "Hari Vasara lasts through the morning, so the fast is broken in the afternoon (after midday).";
      }
      if (vaishnavaDate) note = `Ekadashi spans two days: householders (Smarta) fast on this day; Vaishnava/ISKCON followers usually fast on ${vaishnavaDate}.${note ? " " + note : ""}`;
      out.push({ name: `${name} Ekadashi`, paksha, amantaMonth: lm.amantaIndex, adhik: lm.adhik, date, vaishnavaDate, tithiStart: start, tithiEnd: end, kshaya, parana: { start: new Date(pStart), end: new Date(pEnd), dwadashiEnd: dwEnd, note } });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
