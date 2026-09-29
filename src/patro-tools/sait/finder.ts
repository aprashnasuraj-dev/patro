/**
 * Sait finder: scans a date range, applies hard rules, then personal
 * (तारा बल / चन्द्र बल) scoring for one or two people.
 */
import { addDays, angleFromSun } from '../core/astro';
import { formatLunarDate, NAKSHATRAS, RASHIS, WEEKDAYS, YOGAS } from '../core/names';
import { defaultPanchang, type PanchangProvider } from '../core/provider';
import type { DayPanchang, GeoLocation } from '../core/types';
import { VISHTI_KARANA } from '../core/names';
import { SAIT_RULES, type SaitKind, type SaitRuleSet } from './rules';

export interface Person {
  name: string;
  /** janma nakshatra 0..26 */
  nakshatra: number;
  /** janma rashi (moon sign) 0..11 */
  rashi: number;
}

export interface SaitResult {
  date: string;
  lunar: string;
  weekday: string;
  nakshatra: string;
  yoga: string;
  score: number; // 0..100
  official: boolean;
  reasons: string[];
  warnings: string[];
}

export interface FindOptions {
  kind: SaitKind;
  from: string;
  to: string;
  people?: Person[];
  loc?: GeoLocation;
  provider?: PanchangProvider;
  /** official list for this kind (yyyy-mm-dd) — always shown, ranked first */
  officialDates?: string[];
  /** override rules (e.g. after your jyotishi reviews them) */
  rules?: Partial<SaitRuleSet>;
}

const TARA_NAMES = ['जन्म', 'सम्पत्', 'विपत्', 'क्षेम', 'प्रत्यरि', 'साधक', 'वध', 'मित्र', 'अतिमित्र'];

/** तारा बल: counts from birth nakshatra; 3, 5, 7 are inauspicious. */
export function taraBala(birthNak: number, dayNak: number): { tara: number; name: string; good: boolean } {
  const count = ((dayNak - birthNak + 27) % 27) + 1;
  const tara = ((count - 1) % 9) + 1;
  return { tara, name: TARA_NAMES[tara - 1], good: ![3, 5, 7].includes(tara) };
}

/** चन्द्र बल: Moon in 1, 3, 6, 7, 10, 11 from birth rashi is good. */
export function chandraBala(birthRashi: number, dayRashi: number): { house: number; good: boolean } {
  const house = ((dayRashi - birthRashi + 12) % 12) + 1;
  return { house, good: [1, 3, 6, 7, 10, 11].includes(house) };
}

function inChaturmas(p: DayPanchang): boolean {
  const m = p.lunarMonth.amantaIndex; // 3 आषाढ, 4 श्रावण, 5 भाद्र, 6 आश्विन, 7 कार्तिक
  if (m === 4 || m === 5 || m === 6) return true;
  if (m === 3) return p.tithi >= 11; // from हरिशयनी एकादशी
  if (m === 7) return p.tithi <= 10; // until हरिबोधिनी एकादशी
  return false;
}

export function findSait(opts: FindOptions): SaitResult[] {
  const provider = opts.provider ?? defaultPanchang;
  const rules = { ...SAIT_RULES[opts.kind], ...opts.rules };
  const official = new Set(opts.officialDates ?? []);
  const out: SaitResult[] = [];

  for (let d = opts.from; d <= opts.to; d = addDays(d, 1)) {
    const p = provider.day(d, opts.loc);
    const isOfficial = official.has(d);
    const reasons: string[] = [];
    const warnings: string[] = [];
    let hardFail = false;
    const fail = (msg: string) => { hardFail = true; warnings.push(msg); };

    if (!rules.nakshatras.includes(p.nakshatra)) fail(`नक्षत्र ${NAKSHATRAS[p.nakshatra]} उपयुक्त छैन`);
    else reasons.push(`शुभ नक्षत्र: ${NAKSHATRAS[p.nakshatra]}`);
    if (!rules.weekdays.includes(p.weekday)) fail(`${WEEKDAYS[p.weekday]} उपयुक्त छैन`);
    if (rules.avoidTithis.includes(p.tithi)) fail('रिक्ता तिथि / औंसी');
    if (rules.avoidYogas.includes(p.yoga)) fail(`अशुभ योग: ${YOGAS[p.yoga]}`);
    if (rules.avoidVishti && p.karana === VISHTI_KARANA) fail('भद्रा (विष्टि करण)');
    if (rules.avoidChaturmas && inChaturmas(p)) fail('चातुर्मास');
    if (rules.avoidKharmas && (p.sunRashi === 8 || p.sunRashi === 11)) fail('खरमास (सूर्य धनु/मीन)');
    if (rules.avoidAdhik && p.lunarMonth.adhik) fail('अधिक मास');
    if (rules.months && !rules.months.includes(p.lunarMonth.amantaIndex)) fail('यो संस्कारको मौसम होइन');
    if (rules.avoidCombust) {
      if (angleFromSun('Venus', p.sunrise) < 10) fail('शुक्र अस्त');
      if (angleFromSun('Jupiter', p.sunrise) < 11) fail('गुरु अस्त');
    }

    let score = 60;
    for (const person of opts.people ?? []) {
      const t = taraBala(person.nakshatra, p.nakshatra);
      const c = chandraBala(person.rashi, p.moonRashi);
      if (t.good) { score += 10; reasons.push(`${person.name}: तारा ${t.name} ✓`); }
      else { score -= 20; warnings.push(`${person.name}: तारा ${t.name} (अशुभ)`); }
      if (c.good) { score += 10; reasons.push(`${person.name}: चन्द्र ${c.house} औं घरमा ✓`); }
      else { score -= 15; warnings.push(`${person.name}: चन्द्र ${c.house} औं घरमा, ${RASHIS[p.moonRashi]}`); }
    }

    if (hardFail && !isOfficial) continue;
    if (isOfficial) { score += 30; reasons.unshift('नेपाल पञ्चाङ्ग निर्णायक समितिको आधिकारिक साइत'); }

    out.push({
      date: d,
      lunar: formatLunarDate(p.monthIndex, p.paksha, p.tithi, p.lunarMonth.adhik),
      weekday: WEEKDAYS[p.weekday],
      nakshatra: NAKSHATRAS[p.nakshatra],
      yoga: YOGAS[p.yoga],
      score: Math.max(0, Math.min(100, score)),
      official: isOfficial,
      reasons,
      warnings,
    });
  }
  return out.sort((a, b) => Number(b.official) - Number(a.official) || b.score - a.score || a.date.localeCompare(b.date));
}

/** Share text for Viber/WhatsApp or the PDF card. */
export function saitShareText(kind: SaitKind, results: SaitResult[], top = 5): string {
  const lines = [`🪔 ${SAIT_RULES[kind].label}का शुभ साइतहरू`];
  for (const r of results.slice(0, top)) {
    lines.push(`• ${r.date} (${r.weekday}) — ${r.lunar}, ${r.nakshatra}${r.official ? ' ✅ आधिकारिक' : ''}`);
  }
  lines.push('अन्तिम निर्णय आफ्नो पुरोहित/ज्योतिषीसँग गर्नुहोस्।');
  return lines.join('\n');
}
