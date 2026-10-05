import { useMemo, useState } from "react";
import { Body, HelioDistance, Illumination, MoonPhase, Observer, SearchLunarEclipse, SearchMoonPhase, SearchRiseSet, Seasons } from "astronomy-engine";
import { formatDate, neDigits, neNumber } from "../nepaliDate";

type Lang = "ne" | "en";
type Fact = { kicker: string; title: string; detail: string; moon?: { lit: number; waxing: boolean } };

const KATHMANDU = new Observer(27.7172, 85.324, 1400);
const DAY = 86_400_000;

function days(from: Date, to: Date) { return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY)); }

/** Facts from the astronomical calendar, computed for "now" in Kathmandu with astronomy-engine. */
function buildFacts(now: Date, language: Lang): Fact[] {
  const en = language === "en";
  const n = (v: number) => (en ? String(v) : neDigits(v));
  const date = (d: Date) => formatDate(d, language, { weekday: "short" });
  const facts: Fact[] = [];

  try {
    const phase = MoonPhase(now); // 0 new · 90 first quarter · 180 full · 270 last quarter
    const lit = Math.round(Illumination(Body.Moon, now).phase_fraction * 100);
    const waxing = phase < 180;
    facts.push({
      kicker: en ? "Tonight's Moon" : "आजको चन्द्रमा", moon: { lit, waxing },
      title: en ? `${lit}% illuminated, ${waxing ? "waxing" : "waning"}` : `${n(lit)}% उज्यालो · ${waxing ? "शुक्ल पक्ष (बढ्दो)" : "कृष्ण पक्ष (घट्दो)"}`,
      detail: en ? `The Moon is ${Math.round(phase)}° along its orbit from new moon.` : `नयाँ चन्द्रमाबाट चन्द्रमा आफ्नो कक्षमा ${n(Math.round(phase))}° अघि बढेको छ।`,
    });
  } catch { /* skip */ }

  try {
    const full = SearchMoonPhase(180, now, 40);
    if (full) facts.push({
      kicker: en ? "Next full moon" : "अर्को पूर्ण चन्द्रमा",
      title: date(full.date),
      detail: en ? `In ${days(now, full.date)} days. (Astronomical full moon; the panchang's Purnima can fall a day apart.)` : `${n(days(now, full.date))} दिनपछि। (खगोलीय पूर्ण चन्द्रमा — पात्रोको पूर्णिमा तिथि एक दिन फरक पर्न सक्छ।)`,
    });
    const fresh = SearchMoonPhase(0, now, 40);
    if (fresh) facts.push({
      kicker: en ? "Next new moon" : "अर्को नयाँ चन्द्रमा",
      title: date(fresh.date),
      detail: en ? `In ${days(now, fresh.date)} days — darkest skies of the month for stargazing.` : `${n(days(now, fresh.date))} दिनपछि — तारा हेर्न महिनाकै सबैभन्दा अँध्यारो आकाश।`,
    });
  } catch { /* skip */ }

  try {
    const eclipse = SearchLunarEclipse(now);
    const kind = String(eclipse.kind);
    const kindNe: Record<string, string> = { total: "पूर्ण", partial: "आंशिक", penumbral: "उपछाया" };
    facts.push({
      kicker: en ? "Next lunar eclipse" : "अर्को चन्द्रग्रहण",
      title: `${date(eclipse.peak.date)} · ${en ? kind : kindNe[kind] || kind}`,
      detail: en ? `Peak in ${days(now, eclipse.peak.date)} days. Visibility depends on where the Moon is above the horizon at that moment.` : `${n(days(now, eclipse.peak.date))} दिनपछि चरम अवस्था। त्यस बेला चन्द्रमा क्षितिजमाथि भएका ठाउँबाट मात्र देखिन्छ।`,
    });
  } catch { /* skip */ }

  try {
    const start = new Date(now.getTime() - ((now.getUTCHours() * 60 + now.getUTCMinutes() + 345) % 1440) * 60_000); // Kathmandu midnight
    const rise = SearchRiseSet(Body.Sun, KATHMANDU, +1, start, 1), set = SearchRiseSet(Body.Sun, KATHMANDU, -1, start, 1);
    if (rise && set) {
      const minutes = Math.round((set.date.getTime() - rise.date.getTime()) / 60_000);
      const h = Math.floor(minutes / 60), m = minutes % 60;
      facts.push({
        kicker: en ? "Daylight in Kathmandu" : "काठमाडौंको दिन",
        title: en ? `${h} h ${m} min of daylight today` : `आज ${n(h)} घण्टा ${n(m)} मिनेट उज्यालो`,
        detail: en ? "Sunrise to sunset at the Sun's upper limb, at 1,400 m." : "सूर्योदयदेखि सूर्यास्तसम्म, १,४०० मिटर उचाइमा गणना गरिएको।",
      });
    }
  } catch { /* skip */ }

  try {
    const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric" }).format(now));
    const names: [keyof ReturnType<typeof Seasons>, string, string][] = [
      ["mar_equinox", "March equinox", "वसन्त विषुव"], ["jun_solstice", "June solstice", "ग्रीष्म अयनान्त (सबैभन्दा लामो दिन)"],
      ["sep_equinox", "September equinox", "शरद विषुव"], ["dec_solstice", "December solstice", "शीत अयनान्त (सबैभन्दा छोटो दिन)"],
    ];
    const upcoming = [Seasons(year), Seasons(year + 1)].flatMap((s) => names.map(([key, enName, neName]) => ({ when: (s[key] as any).date as Date, enName, neName })))
      .filter((s) => s.when > now).sort((a, b) => a.when.getTime() - b.when.getTime())[0];
    if (upcoming) facts.push({
      kicker: en ? "Next turning point of the year" : "वर्षको अर्को मोड",
      title: en ? upcoming.enName : upcoming.neName,
      detail: `${date(upcoming.when)} · ${en ? `in ${days(now, upcoming.when)} days` : `${n(days(now, upcoming.when))} दिनपछि`}`,
    });
  } catch { /* skip */ }

  try {
    const km = HelioDistance(Body.Earth, now) * 149_597_870.7;
    facts.push({
      kicker: en ? "Earth and Sun" : "पृथ्वी र सूर्य",
      title: en ? `${(km / 1e6).toFixed(1)} million km apart today` : `आज ${neNumber(Math.round(km / 1e5) / 100, 2)} करोड किमी टाढा`,
      detail: en ? "Closest in early January, farthest in early July — seasons come from Earth's tilt, not distance." : "जनवरीको सुरुमा सबैभन्दा नजिक, जुलाईको सुरुमा सबैभन्दा टाढा — ऋतु दूरीले होइन, पृथ्वीको झुकावले हुन्छ।",
    });
  } catch { /* skip */ }

  return facts;
}

function MoonGlyph({ lit, waxing }: { lit: number; waxing: boolean }) {
  // Terminator ellipse: rx shrinks to 0 at quarter, grows toward new/full.
  const f = lit / 100, rx = Math.abs(1 - 2 * f) * 20, litSide = waxing ? 1 : 0;
  const bulge = f > 0.5 ? 1 - litSide : litSide;
  return <svg className="sx-moon" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="20" fill="#1d2a24" />
    <path d={`M24 4 A20 20 0 0 ${litSide} 24 44 A${rx} 20 0 0 ${bulge} 24 4`} fill="#f4e7c3" />
    <circle cx="24" cy="24" r="20" fill="none" stroke="#f4e7c355" />
  </svg>;
}

export default function HomeSkyFact({ language }: { language: Lang }) {
  const now = useMemo(() => new Date(), []);
  const facts = useMemo(() => buildFacts(now, language), [now, language]);
  const dayIndex = Math.floor((now.getTime() + 345 * 60_000) / DAY);
  const [offset, setOffset] = useState(0);
  if (!facts.length) return null;
  const fact = facts[(dayIndex + offset) % facts.length];
  const l = (ne: string, en: string) => (language === "en" ? en : ne);
  return <section className="rh-card sx-card" aria-label={l("आकाशमा आज", "In the sky")}>
    <header className="rh-card-head"><div><span className="rh-kicker">{l("आकाशमा आज", "In the sky")}</span><h2>{fact.kicker}</h2></div>
      {fact.moon ? <MoonGlyph {...fact.moon} /> : <span className="sx-sun" aria-hidden="true">☉</span>}</header>
    <p className="sx-title" aria-live="polite">{fact.title}</p>
    <p className="sx-detail">{fact.detail}</p>
    <footer className="hx-foot">
      <button type="button" className="sx-next" onClick={() => setOffset((o) => o + 1)}>{l("अर्को तथ्य", "Another fact")} ›</button>
      <a href="/tools/astro">{l("खगोलीय पात्रो", "Astronomy")} →</a>
    </footer>
  </section>;
}
