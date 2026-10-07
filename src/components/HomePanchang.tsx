import { useEffect, useState } from "react";
import { Moon, Sunrise, Sunset } from "lucide-react";
import { KARANA_NAMES, NAKSHATRAS, RASHIS, YOGAS, tithiName } from "../patro-tools/core/names";
import type { PanchangAt } from "../patro-tools/core/types";
import { l } from "../useUiLanguage";

const NAK_EN = "Ashwini,Bharani,Krittika,Rohini,Mrigashira,Ardra,Punarvasu,Pushya,Ashlesha,Magha,Purva Phalguni,Uttara Phalguni,Hasta,Chitra,Swati,Vishakha,Anuradha,Jyeshtha,Mula,Purva Ashadha,Uttara Ashadha,Shravana,Dhanishtha,Shatabhisha,Purva Bhadrapada,Uttara Bhadrapada,Revati".split(",");
const YOGA_EN = "Vishkambha,Priti,Ayushman,Saubhagya,Shobhana,Atiganda,Sukarma,Dhriti,Shula,Ganda,Vriddhi,Dhruva,Vyaghata,Harshana,Vajra,Siddhi,Vyatipata,Variyana,Parigha,Shiva,Siddha,Sadhya,Shubha,Shukla,Brahma,Indra,Vaidhriti".split(",");
const KARANA_EN = "Bava,Balava,Kaulava,Taitila,Gara,Vanija,Vishti (Bhadra),Shakuni,Chatushpada,Naga,Kimstughna".split(",");
const RASHI_EN = "Aries,Taurus,Gemini,Cancer,Leo,Virgo,Libra,Scorpio,Sagittarius,Capricorn,Aquarius,Pisces".split(",");
const TITHI_EN = "Pratipada,Dwitiya,Tritiya,Chaturthi,Panchami,Shashthi,Saptami,Ashtami,Navami,Dashami,Ekadashi,Dwadashi,Trayodashi,Chaturdashi".split(",");
type Named = { ne?: string; name_ne?: string; en?: string; name_en?: string };
export type HomePanchangData = {
  tithi?: Named & { number?: number; paksha?: string };
  nakshatra?: Named; yoga?: Named; karana?: Named;
  sunrise?: string | null; sunset?: string | null;
  tithi_transition?: { time?: string | null; next_ne?: string; next_en?: string } | null;
};
function named(value: Named | undefined, language: "ne" | "en") {
  return language === "ne" ? value?.ne || value?.name_ne : value?.en || value?.name_en;
}

export function HomePanchang({ date, panchang, language }: { date: string; panchang: HomePanchangData; language: "ne" | "en" }) {
  const [calculated, setCalculated] = useState<{ at: PanchangAt; sunrise: string; sunset: string } | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => import("../patro-tools/core/astro").then(({ panchangAt, sunriseSunset, zonedMidnight }) => {
      const times = sunriseSunset(date, { lat: 27.7172, lon: 85.324, tz: "Asia/Kathmandu", name: "Kathmandu" });
      const match = /^(\d{2}):(\d{2})$/.exec(panchang.sunrise || "");
      const anchor = match ? new Date(zonedMidnight(date, "Asia/Kathmandu").getTime() + (Number(match[1]) * 60 + Number(match[2])) * 60_000) : times.sunrise;
      const clock = (value: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit" }).format(value);
      if (active) setCalculated({ at: panchangAt(anchor), sunrise: clock(times.sunrise), sunset: clock(times.sunset) });
    }).catch(() => {});
    // Archive values render immediately. Supplemental calculations wait until idle.
    const idleWindow = window as Window & {requestIdleCallback?: (callback: () => void) => number; cancelIdleCallback?: (id: number) => void};
    let idle: number | undefined;
    const timer = window.setTimeout(() => { if (idleWindow.requestIdleCallback) idle = idleWindow.requestIdleCallback(load); else void load(); }, 2500);
    return () => { active = false; window.clearTimeout(timer); if (idle !== undefined) idleWindow.cancelIdleCallback?.(idle); };
  }, [date, panchang.sunrise]);
  const at = calculated?.at;
  const ne = language === "ne";
  const tithi = named(panchang.tithi, language) || (at ? ne ? tithiName(at.tithi) : at.tithi === 15 ? "Purnima" : at.tithi === 30 ? "Amavasya" : TITHI_EN[(at.tithi - 1) % 15] : "—");
  const paksha = panchang.tithi?.paksha || at?.paksha || "";
  const pakshaLabel = paksha ? /^k/i.test(paksha) ? l(language, "कृष्ण पक्ष", "Krishna Paksha") : l(language, "शुक्ल पक्ष", "Shukla Paksha") : "—";
  const facts = [
    [l(language, "तिथि", "Tithi"), tithi], [l(language, "पक्ष", "Paksha"), pakshaLabel],
    [l(language, "नक्षत्र", "Nakshatra"), named(panchang.nakshatra, language) || (at ? (ne ? NAKSHATRAS : NAK_EN)[at.nakshatra] : "—")],
    [l(language, "योग", "Yoga"), named(panchang.yoga, language) || (at ? (ne ? YOGAS : YOGA_EN)[at.yoga] : "—")],
    [l(language, "करण", "Karana"), named(panchang.karana, language) || (at ? (ne ? KARANA_NAMES : KARANA_EN)[at.karana] : "—")],
    [l(language, "चन्द्र राशि", "Moon sign"), at ? (ne ? RASHIS : RASHI_EN)[at.moonRashi] : "—"],
  ];
  return <div className="hp-panchang" aria-label={l(language, "आजको विस्तृत पञ्चाङ्ग", "Today's detailed Panchang")}>
    <div className="hp-panchang-title"><span><Moon size={15} aria-hidden="true"/>{l(language, "आजको पञ्चाङ्ग", "Today's Panchang")}</span><small>{l(language, "काठमाडौं", "Kathmandu")}</small></div>
    <dl className="rh-today-facts hp-panchang-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="hp-sun-times"><span><Sunrise size={19} aria-hidden="true"/><small>{l(language, "सूर्योदय", "Sunrise")}</small><b>{panchang.sunrise || calculated?.sunrise || "—"}</b></span><span><Sunset size={19} aria-hidden="true"/><small>{l(language, "सूर्यास्त", "Sunset")}</small><b>{panchang.sunset || calculated?.sunset || "—"}</b></span></div>
    {panchang.tithi_transition?.time ? <p className="hp-tithi-end">{l(language, "तिथि परिवर्तन", "Tithi changes")} <b>{panchang.tithi_transition.time}</b> · {ne ? panchang.tithi_transition.next_ne : panchang.tithi_transition.next_en}</p> : null}
    <p className="hp-panchang-source">{l(language, "नक्षत्र, योग, करण र राशि: खगोलीय गणना", "Nakshatra, Yoga, Karana & Moon sign: sunrise calculation")} <a href={`/date/${date}`}>{l(language, "पूरा विवरण →", "Full details →")}</a></p>
  </div>;
}
