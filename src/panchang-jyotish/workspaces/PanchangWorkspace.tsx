import { useEffect, useMemo, useState } from "react";
import { KARANA_NAMES, NAKSHATRAS, RASHIS, YOGAS, LUNAR_MONTHS, LUNAR_MONTHS_ROMAN, tithiName, toNepaliDigits } from "../../patro-tools/core/names";
import { panchangAt, sunSidereal } from "../../patro-tools/core/astro";
import { l } from "../../useUiLanguage";
import { getFeatureById } from "../catalog";
import { fromCalculatedDay, type PanchangDayContractV1 } from "../contract";
import { resolveNepalPanchangDay } from "../archive-adapter";
import { KATHMANDU } from "../../patro-tools/core/types";
import { addIsoDays, calculateLocalDay, formatDuration, formatLocalDateTime, formatLocalTime, formatPanchangClock, nextFieldTransition, type PanchangClockMode, NAKSHATRA_EN, RASHI_EN, TITHI_EN, YOGA_EN, type LocalWindow, validIsoDate, todayInNepal } from "./shared";
import "./workspace.css";

type Props = { language: "ne" | "en"; selectedFeatureId?: string | null };
type BoundaryRow = { labelNe: string; labelEn: string; value: string; end: Date | null };

function localDateLabel(date: string, language: "ne" | "en") {
  const value = new Date(date + "T12:00:00Z");
  return new Intl.DateTimeFormat(language === "ne" ? "ne-NP-u-nu-deva" : "en-GB", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "long", day: "numeric", weekday: "long"
  }).format(value);
}

function timeWindow(window: LocalWindow, language: "ne" | "en") {
  return formatLocalTime(window.start, language) + " – " + formatLocalTime(window.end, language);
}

function solarIngressAfter(from: Date): Date | null {
  const sign = Math.floor(sunSidereal(from) / 30);
  let left = from.getTime();
  const step = 3 * 60 * 60_000;
  const limit = left + 40 * 86_400_000;
  for (let right = left + step; right <= limit; right += step) {
    if (Math.floor(sunSidereal(new Date(right)) / 30) !== sign) {
      let lo = left, hi = right;
      for (let i = 0; i < 36 && hi - lo > 1000; i++) {
        const mid = Math.floor((lo + hi) / 2);
        if (Math.floor(sunSidereal(new Date(mid)) / 30) === sign) lo = mid;
        else hi = mid;
      }
      return new Date(hi);
    }
    left = right;
  }
  return null;
}

export function PanchangWorkspace({ language, selectedFeatureId }: Props) {
  const [date, setDate] = useState(() => {
    const queryDate = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") : null;
    return queryDate && validIsoDate(queryDate) ? queryDate : todayInNepal();
  });
  const [clockMode, setClockMode] = useState<PanchangClockMode>("24h");
  const [resolved, setResolved] = useState<{ date: string; value: PanchangDayContractV1; archive: "loaded" | "unavailable" } | null>(null);
  useEffect(() => { const controller = new AbortController(); setResolved(null); resolveNepalPanchangDay(date, controller.signal).then(result => { if (!controller.signal.aborted) setResolved({ date, value: result.value, archive: result.archive }); }).catch(() => {}); return () => controller.abort(); }, [date]);
  const computed = useMemo(() => {
    try { return calculateLocalDay(date); }
    catch { return null; }
  }, [date]);
  const focus = selectedFeatureId ? getFeatureById(selectedFeatureId) : null;
  const languageNote = l(language,
    "समय काठमाडौंको स्थानीय सूर्योदय र सूर्योस्तका आधारमा गणना हुन्छ। परम्परागत पर्व वा प्रकाशित सरकारी मितिलाई साधारण तिथि सूत्रले प्रतिस्थापन गर्दैन।",
    "Times use Kathmandu local sunrise and sunset. A simple astronomical formula does not override a traditional observance rule or published official date."
  );

  const p = computed?.day;
  const contract = resolved?.date === date ? resolved.value : (p ? fromCalculatedDay(p, KATHMANDU) : null);
  const archiveLoaded = resolved?.date === date && resolved.archive === "loaded";
  const at = p ? panchangAt(p.sunrise) : null;
  const windows = computed?.windows;
  const nakEnd = p ? nextFieldTransition(p.sunrise, "nakshatra") : null;
  const yogaEnd = p ? nextFieldTransition(p.sunrise, "yoga") : null;
  const karanaEnd = p ? nextFieldTransition(p.sunrise, "karana") : null;
  const nextIngress = useMemo(() => {
    if (!p || selectedFeatureId !== "F025") return null;
    try { return solarIngressAfter(p.sunrise); } catch { return null; }
  }, [p, selectedFeatureId]);

  const rows: BoundaryRow[] = p && at ? [
    { labelNe: "तिथि", labelEn: "Tithi", value: l(language, contract?.elements.tithi.nameNe ?? tithiName(contract?.elements.tithi.index ?? p.tithi), contract?.elements.tithi.nameEn ?? TITHI_EN[(contract?.elements.tithi.index ?? p.tithi) - 1]), end: contract?.elements.tithi.ends?.instantUtc ? new Date(contract.elements.tithi.ends.instantUtc) : p.tithiEnds },
    { labelNe: "नक्षत्र", labelEn: "Nakshatra", value: l(language, contract?.elements.nakshatra.nameNe ?? NAKSHATRAS[contract?.elements.nakshatra.index ?? p.nakshatra], contract?.elements.nakshatra.nameEn ?? NAKSHATRA_EN[contract?.elements.nakshatra.index ?? p.nakshatra]), end: nakEnd },
    { labelNe: "योग", labelEn: "Yoga", value: l(language, contract?.elements.yoga.nameNe ?? YOGAS[contract?.elements.yoga.index ?? p.yoga], contract?.elements.yoga.nameEn ?? YOGA_EN[contract?.elements.yoga.index ?? p.yoga]), end: yogaEnd },
    { labelNe: "करण", labelEn: "Karana", value: l(language, contract?.elements.karana.nameNe ?? KARANA_NAMES[contract?.elements.karana.index ?? p.karana], contract?.elements.karana.nameEn ?? KARANA_EN[contract?.elements.karana.index ?? p.karana]), end: karanaEnd }
  ] : [];

  const panchak = !!p && (p.nakshatra > 22 || (p.nakshatra === 22 && p.nakshatraPada >= 3));
  const gandaMoola = !!p && [0, 8, 9, 17, 18, 26].includes(p.nakshatra);
  const vishti = !!p && p.karana === 6;

  return <div className="ap-pjw-root">
    <div className="ap-pjw-datebar">
      <label>
        <span>{l(language, "मिति छान्नुहोस्", "Choose date")}</span>
        <input type="date" value={date} max="2100-12-31" min="1900-01-01" onChange={(event) => { setDate(event.target.value); }} />
      </label>
      <button type="button" className="ap-pjw-secondary" onClick={() => { setDate(todayInNepal()); setError(""); }}>{l(language, "आज", "Today")}</button>
      <button type="button" className="ap-pjw-secondary" onClick={() => { setDate(addIsoDays(date, -1)); setError(""); }} aria-label={l(language, "अघिल्लो दिन", "Previous day")}>‹</button>
      <button type="button" className="ap-pjw-secondary" onClick={() => { setDate(addIsoDays(date, 1)); setError(""); }} aria-label={l(language, "अर्को दिन", "Next day")}>›</button>
    </div>
    {!computed || !p || !at || !windows ? <div className="ap-pjw-empty">{l(language, "यो मितिका लागि स्थानीय सूर्योदय उपलब्ध छैन। फरक मिति वा स्थान छान्नुहोस्।", "Local sunrise is unavailable for this date. Choose another date or location.")}</div> : <>
      <p className="ap-pjw-method" role="status">{archiveLoaded ? l(language, "मौजुदा पात्रो अभिलेख उपलब्ध छ। अभिलेखमा नभएका समयहरू अलग गणनात्मक अनुमान हुन्।", "Existing calendar archive loaded. Times not supplied by the archive remain separately calculated estimates.") : l(language, "यो दृश्य स्थानीय गणनाबाट बनेको हो; अभिलेख लोड नभएसम्म प्रकाशित मिति वा समयको आधिकारिक पुष्टि मान्नु हुँदैन।", "This view is calculated locally. Do not treat dates or times as officially verified while the archive is unavailable or loading.")}</p>
      <div className="ap-pjw-date-heading">
        <div><span>{l(language, "नेपालको स्थानीय मिति", "Nepal local date")}</span><h3>{localDateLabel(date, language)}</h3></div>
        <div className="ap-pjw-meta"><strong>{contract?.calendars.bs ? l(language, "वि.सं. " + toNepaliDigits(contract.calendars.bs.year + "/" + contract.calendars.bs.month + "/" + contract.calendars.bs.day), "BS " + contract.calendars.bs.year + "/" + contract.calendars.bs.month + "/" + contract.calendars.bs.day) : l(language, "वि.सं. अभिलेख खुल्दैछ", "BS archive loading")}</strong><small>{contract?.calendars.nepalSambat ?? l(language, "नेपाल संवत्: अभिलेखमा उपलब्ध भएमा", "Nepal Sambat: when available in archive")}</small></div>
      </div>
      <div className="ap-pjw-stats">
        <article><span>{l(language, "तिथि / पक्ष", "Tithi / Paksha")}</span><strong>{l(language, tithiName(p.tithi), TITHI_EN[p.tithi - 1])}</strong><small>{p.paksha === "shukla" ? l(language, "शुक्ल पक्ष", "Shukla Paksha") : l(language, "कृष्ण पक्ष", "Krishna Paksha")}</small></article>
        <article><span>{l(language, "नक्षत्र / पाद", "Nakshatra / Pada")}</span><strong>{l(language, NAKSHATRAS[p.nakshatra], NAKSHATRA_EN[p.nakshatra])}</strong><small>{l(language, "पाद", "Pada")} {p.nakshatraPada}</small></article>
        <article><span>{l(language, "योग", "Yoga")}</span><strong>{l(language, YOGAS[p.yoga], YOGA_EN[p.yoga])}</strong><small>{l(language, "स्थानीय सूर्योदयमा", "At local sunrise")}</small></article>
        <article><span>{l(language, "करण", "Karana")}</span><strong>{l(language, KARANA_NAMES[p.karana], KARANA_EN[p.karana])}</strong><small>{vishti ? l(language, "विष्टि / भद्रा", "Vishti / Bhadra") : l(language, "आधा तिथि", "Half-Tithi segment")}</small></article>
        <article><span>{l(language, "चन्द्र राशि", "Moon Rashi")}</span><strong>{l(language, RASHIS[p.moonRashi], RASHI_EN[p.moonRashi])}</strong><small>{l(language, "निरयण राशि", "Sidereal sign")}</small></article>
        <article><span>{l(language, "सूर्य राशि", "Sun Rashi")}</span><strong>{l(language, RASHIS[p.sunRashi], RASHI_EN[p.sunRashi])}</strong><small>{l(language, "निरयण राशि", "Sidereal sign")}</small></article>
      </div>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "चन्द्र महिनाको प्रणाली", "Lunar month convention")}</h3><small>{l(language, "नेपालमा प्रचलित पूर्णिमान्त नामकरण", "Purnimanta naming used in Nepal")}</small></div>
        <div className="ap-pjw-stats">
          <article><span>{l(language, "अमान्त महिना", "Amanta month")}</span><strong>{l(language, LUNAR_MONTHS[p.lunarMonth.amantaIndex], LUNAR_MONTHS_ROMAN[p.lunarMonth.amantaIndex])}</strong></article>
          <article><span>{l(language, "पूर्णिमान्त महिना", "Purnimanta month")}</span><strong>{l(language, LUNAR_MONTHS[p.monthIndex], LUNAR_MONTHS_ROMAN[p.monthIndex])}</strong></article>
          <article><span>{l(language, "महिनाको विशेष अवस्था", "Special month state")}</span><strong>{p.lunarMonth.adhik ? l(language, "अधिक मास", "Adhika Masa") : p.lunarMonth.kshaya ? l(language, "क्षय मास", "Kshaya Masa") : l(language, "सामान्य चन्द्र महिना", "Ordinary lunar month")}</strong></article>
        </div>
        <p className="ap-pjw-section-note">{l(language, "यी गणनात्मक महिना-नाम तथा विशेष अवस्था स्थानीय प्रकाशित पात्रोको समीक्षा बिना आधिकारिक पर्व-मिति होइनन्।", "These calculated lunar-month names and special states are not official festival dates without review against the local published calendar.")}</p>
      </section>
      <div className="ap-pjw-solar">
        <article><span>☀ {l(language, "सूर्योदय", "Sunrise")}</span><strong>{formatLocalTime(p.sunrise, language)}</strong></article>
        <article><span>☀ {l(language, "सूर्यास्त", "Sunset")}</span><strong>{formatLocalTime(p.sunset, language)}</strong></article>
        <article><span>◷ {l(language, "दिनमान", "Daylight")}</span><strong>{formatDuration(p.sunrise, p.sunset, language)}</strong></article>
      </div>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "पञ्चाङ्ग परिवर्तन", "Panchang transitions")}</h3><small>{l(language, "समय नेपाल समय (NPT)", "Times in Nepal time (NPT)")}</small></div>
        <div className="ap-pjw-filter-row ap-pjw-clock-modes" role="group" aria-label={l(language, "समय देखाउने तरिका", "Clock display mode")}>
          {(["12h", "24h", "24plus"] as const).map(mode => <button key={mode} type="button" className={clockMode === mode ? "ap-pjw-primary" : "ap-pjw-secondary"} aria-pressed={clockMode === mode} onClick={() => setClockMode(mode)}>{mode === "24plus" ? l(language, "२४+ घण्टा", "24+ hours") : mode === "12h" ? l(language, "१२ घण्टा", "12 hours") : l(language, "२४ घण्टा", "24 hours")}</button>)}
        </div>
        <p className="ap-pjw-section-note">{l(language, "२४+ विकल्पले अर्को नागरिक मितिको समयलाई २४:०० पछि निरन्तर देखाउँछ; मूल क्षण परिवर्तन हुँदैन।", "The 24+ option continues past 24:00 on the next civil date; the underlying instant is unchanged.")}</p>
        <div className="ap-pjw-boundaries">{rows.map((row) => <div key={row.labelEn}><span>{l(language, row.labelNe, row.labelEn)}</span><strong>{row.value}</strong><small>{l(language, "समाप्ति", "Ends")}: {row.end ? clockMode === "24plus" ? formatPanchangClock(row.end, date, clockMode, language) : (formatPanchangClock(row.end, date, clockMode, language) + " · " + formatLocalDateTime(row.end, language)) : "—"}</small></div>)}</div>
      </section>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "दिनका परम्परागत समयखण्ड", "Traditional day windows")}</h3><small>{l(language, "स्थानीय सूर्योदय र सूर्यास्तबाट गणना", "Calculated from local sunrise and sunset")}</small></div>
        <div className="ap-pjw-window-grid">
          <article><span>{l(language, "राहुकाल", "Rahu Kalam")}</span><strong>{timeWindow(windows.rahu, language)}</strong></article>
          <article><span>{l(language, "यमगण्ड", "Yamaganda")}</span><strong>{timeWindow(windows.yamaganda, language)}</strong></article>
          <article><span>{l(language, "गुलिक काल", "Gulika Kalam")}</span><strong>{timeWindow(windows.gulika, language)}</strong></article>
          <article><span>{l(language, "अभिजित मुहूर्त", "Abhijit Muhurta")}</span><strong>{timeWindow(windows.abhijit, language)}</strong></article>
          <article><span>{l(language, "ब्रह्म मुहूर्त", "Brahma Muhurta")}</span><strong>{timeWindow(windows.brahma, language)}</strong></article>
        </div>
      </section>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "विशेष परम्परागत सङ्केत", "Traditional indicators")}</h3><small>{l(language, "व्याख्या परम्पराअनुसार फरक हुन सक्छ", "Interpretations can vary by tradition")}</small></div>
        <div className="ap-pjw-indicator-grid">
          <article className={panchak ? "is-flagged" : ""}><span>{l(language, "पञ्चक", "Panchak")}</span><strong>{panchak ? l(language, "चलिरहेको हुन सक्छ", "May be active") : l(language, "यस सूर्योदयमा देखिएन", "Not indicated at this sunrise")}</strong><small>{l(language, "नक्षत्र र पादबाट प्राथमिक सङ्केत", "Preliminary indication from Nakshatra and Pada")}</small></article>
          <article className={gandaMoola ? "is-flagged" : ""}><span>{l(language, "गण्डमूल", "Ganda Moola")}</span><strong>{gandaMoola ? l(language, "गण्डमूल नक्षत्र", "Ganda Moola Nakshatra") : l(language, "यस सूर्योदयमा देखिएन", "Not indicated at this sunrise")}</strong><small>{l(language, "परम्परागत नक्षत्र वर्गीकरण", "Traditional Nakshatra classification")}</small></article>
          <article className={vishti ? "is-flagged" : ""}><span>{l(language, "विष्टि / भद्रा", "Vishti / Bhadra")}</span><strong>{vishti ? l(language, "विष्टि करण", "Vishti Karana") : l(language, "यस सूर्योदयमा छैन", "Not present at this sunrise")}</strong><small>{l(language, "करण गणनामा आधारित", "Based on calculated Karana")}</small></article>
        </div>
      </section>

      {selectedFeatureId === "F025" && <section className="ap-pjw-feature-focus"><h3>{l(language, "आगामी सूर्य राशि प्रवेश", "Next solar sign ingress")}</h3><strong>{nextIngress ? formatLocalDateTime(nextIngress, language) : l(language, "यस समयसीमामा परिवर्तन फेला परेन।", "No ingress found in the search window.")}</strong><p>{l(language, "समय सूर्यको निरयण दीर्घांशको राशि सीमा खोजेर निकालिएको हो।", "Calculated by searching the sign boundary of the Sun's sidereal longitude.")}</p></section>}
      {focus && focus.disposition === "reviewed" && <p className="ap-pjw-note">{l(language, "यो परम्पराको ठ्याक्कै मिति वा अनुष्ठान समय स्थानीय पञ्चाङ्ग र प्रकाशित स्रोतसँग पुष्टि गरेर मात्र निश्चित गर्नुपर्छ। यहाँ देखिएका खगोलीय तथ्यलाई आधिकारिक पर्व निर्णय नमान्नुहोस्।", "The exact date or observance time for this tradition should be confirmed against a local Panchang and published source. Astronomical facts shown here are not an official festival determination.")}</p>}
      <p className="ap-pjw-method">{languageNote} {contract && l(language, "यो ब्राउजरमा चल्ने गणनात्मक दृश्य हो; अभिलेख वा आधिकारिक प्रकाशित पर्वको विकल्प होइन।", "This is a browser-calculated view, not a replacement for verified archive facts or officially published observance dates.")}</p>
      <div className="ap-pjw-footer-links">
        <a href={"/date/" + date}>{l(language, "यस दिनको पूरा विवरण", "Full day details")} ↗</a>
        <a href="/tools/tithi-reminder">{l(language, "तिथि रिमाइन्डर", "Tithi reminder")} ↗</a>
        <a href="/tools/sait">{l(language, "साइत हेर्नुहोस्", "Explore Sait")} ↗</a>
      </div>
    </>}
  </div>;
}
