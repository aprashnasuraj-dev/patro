import { useEffect, useMemo, useState } from "react";
import { KARANA_NAMES, NAKSHATRAS, RASHIS, YOGAS, LUNAR_MONTHS, LUNAR_MONTHS_ROMAN, tithiName, toNepaliDigits } from "../../patro-tools/core/names";
import { panchangAt, sunSidereal } from "../../patro-tools/core/astro";
import { l } from "../../useUiLanguage";
import { getFeatureById } from "../catalog";
import { fromCalculatedDay, type PanchangDayContractV1 } from "../contract";
import { resolveNepalPanchangDay } from "../archive-adapter";
import { findNakshatraRuleWindows, type NakshatraRuleWindow } from "../reviewed-candidate-rules";
import { KATHMANDU } from "../../patro-tools/core/types";
import { addIsoDays, calculateLocalDay, formatDuration, formatLocalDateTime, formatLocalTime, formatPanchangClock, nextFieldTransition, previousFieldTransition, localSunriseTithiPattern, type PanchangClockMode, KARANA_EN, NAKSHATRA_EN, RASHI_EN, TITHI_EN, YOGA_EN, type LocalWindow, validIsoDate, todayInNepal } from "./shared";
import { DaylightArc } from "./DaylightArc";
import { FeatureGlyph } from "../FeatureGlyph";
import "./workspace.css";

type Props = { language: "ne" | "en"; selectedFeatureId?: string | null };
type BoundaryRow = { labelNe: string; labelEn: string; value: string; start: Date | null; end: Date | null };

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
  const [ruleWindowDays, setRuleWindowDays] = useState(30);
  const [ruleWindows, setRuleWindows] = useState<NakshatraRuleWindow[]>([]);
  const [ruleWindowState, setRuleWindowState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [resolved, setResolved] = useState<{ date: string; value: PanchangDayContractV1; archive: "loaded" | "unavailable" } | null>(null);
  const [archiveErrorDate, setArchiveErrorDate] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setResolved(null);
    setArchiveErrorDate(null);
    resolveNepalPanchangDay(date, controller.signal)
      .then(result => { if (!controller.signal.aborted) setResolved({ date, value: result.value, archive: result.archive }); })
      .catch(() => { if (!controller.signal.aborted) setArchiveErrorDate(date); });
    return () => controller.abort();
  }, [date]);
  useEffect(() => {
    if (selectedFeatureId !== "F021" && selectedFeatureId !== "F022") {
      setRuleWindows([]);
      setRuleWindowState("idle");
      return;
    }
    let active = true;
    setRuleWindows([]);
    setRuleWindowState("loading");
    const rule = selectedFeatureId === "F021" ? "panchak" : "gandaMoola";
    findNakshatraRuleWindows(date, ruleWindowDays, rule, () => !active)
      .then(result => {
        if (!active || !result) return;
        setRuleWindows(result);
        setRuleWindowState("ready");
      })
      .catch(() => { if (active) setRuleWindowState("error"); });
    return () => { active = false; };
  }, [date, ruleWindowDays, selectedFeatureId]);

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
  const archiveUnavailable = (resolved?.date === date && resolved.archive === "unavailable") || archiveErrorDate === date;
  const archivePending = resolved?.date !== date && archiveErrorDate !== date;
  // Keep existing archive sunrise/sunset distinct from the local astronomical fallback.
  const archivedSunrise = archiveLoaded && contract?.sun.sunrise?.source === "archive" && contract.sun.sunrise.instantUtc
    ? new Date(contract.sun.sunrise.instantUtc) : null;
  const archivedSunset = archiveLoaded && contract?.sun.sunset?.source === "archive" && contract.sun.sunset.instantUtc
    ? new Date(contract.sun.sunset.instantUtc) : null;
  const displaySunrise = archivedSunrise ?? p?.sunrise ?? null;
  const displaySunset = archivedSunset ?? p?.sunset ?? null;
  const solarArchiveDiffers = Boolean(p && (
    (archivedSunrise && Math.abs(archivedSunrise.getTime() - p.sunrise.getTime()) > 120_000) ||
    (archivedSunset && Math.abs(archivedSunset.getTime() - p.sunset.getTime()) > 120_000)
  ));
  const at = p ? panchangAt(p.sunrise) : null;
  const windows = computed?.windows;
  const nakEnd = p ? nextFieldTransition(p.sunrise, "nakshatra") : null;
  const yogaEnd = p ? nextFieldTransition(p.sunrise, "yoga") : null;
  const karanaEnd = p ? nextFieldTransition(p.sunrise, "karana") : null;
  const nextIngress = useMemo(() => {
    if (!p || selectedFeatureId !== "F025") return null;
    try { return solarIngressAfter(p.sunrise); } catch { return null; }
  }, [p, selectedFeatureId]);

  // Never attach a fallback instant to an archive label if the two elements disagree.
  const normalized = (value: string | null | undefined) => (value ?? "").normalize("NFKC").replace(/[\\s.()–_-]+/g, "").toLocaleLowerCase();
  const conflicts = {
    tithi: archiveLoaded && typeof contract?.elements.tithi.index === "number" && p !== undefined && contract.elements.tithi.index !== p.tithi,
    nakshatra: archiveLoaded && !!contract?.elements.nakshatra.nameNe && !!p && normalized(contract.elements.nakshatra.nameNe) !== normalized(NAKSHATRAS[p.nakshatra]),
    yoga: archiveLoaded && !!contract?.elements.yoga.nameNe && !!p && normalized(contract.elements.yoga.nameNe) !== normalized(YOGAS[p.yoga]),
    karana: archiveLoaded && !!contract?.elements.karana.nameNe && !!p && normalized(contract.elements.karana.nameNe) !== normalized(KARANA_NAMES[p.karana])
  };
  const rows: BoundaryRow[] = p && at ? [
    { labelNe: "तिथि", labelEn: "Tithi", value: l(language, contract?.elements.tithi.nameNe ?? tithiName(contract?.elements.tithi.index ?? p.tithi), contract?.elements.tithi.nameEn ?? TITHI_EN[(contract?.elements.tithi.index ?? p.tithi) - 1]), start: contract?.elements.tithi.starts?.instantUtc ? new Date(contract.elements.tithi.starts.instantUtc) : conflicts.tithi ? null : previousFieldTransition(p.sunrise, "tithi"), end: contract?.elements.tithi.ends?.instantUtc ? new Date(contract.elements.tithi.ends.instantUtc) : conflicts.tithi ? null : p.tithiEnds },
    { labelNe: "नक्षत्र", labelEn: "Nakshatra", value: l(language, contract?.elements.nakshatra.nameNe ?? NAKSHATRAS[contract?.elements.nakshatra.index ?? p.nakshatra], contract?.elements.nakshatra.nameEn ?? NAKSHATRA_EN[contract?.elements.nakshatra.index ?? p.nakshatra]), start: contract?.elements.nakshatra.starts?.instantUtc ? new Date(contract.elements.nakshatra.starts.instantUtc) : conflicts.nakshatra ? null : previousFieldTransition(p.sunrise, "nakshatra"), end: contract?.elements.nakshatra.ends?.instantUtc ? new Date(contract.elements.nakshatra.ends.instantUtc) : conflicts.nakshatra ? null : nakEnd },
    { labelNe: "योग", labelEn: "Yoga", value: l(language, contract?.elements.yoga.nameNe ?? YOGAS[contract?.elements.yoga.index ?? p.yoga], contract?.elements.yoga.nameEn ?? YOGA_EN[contract?.elements.yoga.index ?? p.yoga]), start: contract?.elements.yoga.starts?.instantUtc ? new Date(contract.elements.yoga.starts.instantUtc) : conflicts.yoga ? null : previousFieldTransition(p.sunrise, "yoga"), end: contract?.elements.yoga.ends?.instantUtc ? new Date(contract.elements.yoga.ends.instantUtc) : conflicts.yoga ? null : yogaEnd },
    { labelNe: "करण", labelEn: "Karana", value: l(language, contract?.elements.karana.nameNe ?? KARANA_NAMES[contract?.elements.karana.index ?? p.karana], contract?.elements.karana.nameEn ?? KARANA_EN[contract?.elements.karana.index ?? p.karana]), start: contract?.elements.karana.starts?.instantUtc ? new Date(contract.elements.karana.starts.instantUtc) : conflicts.karana ? null : previousFieldTransition(p.sunrise, "karana"), end: contract?.elements.karana.ends?.instantUtc ? new Date(contract.elements.karana.ends.instantUtc) : conflicts.karana ? null : karanaEnd }
  ] : [];

  const tithiPattern = useMemo(() => {
    if (selectedFeatureId !== "F010" || !validIsoDate(date)) return null;
    try { return localSunriseTithiPattern(date); } catch { return null; }
  }, [date, selectedFeatureId]);
  const panchak = !!p && (p.nakshatra > 22 || (p.nakshatra === 22 && p.nakshatraPada >= 3));
  const gandaMoola = !!p && [0, 8, 9, 17, 18, 26].includes(p.nakshatra);
  const vishti = !!p && (contract?.elements.karana.index ?? p.karana) === 6;
  const displayedPaksha = (contract?.elements.tithi.index ?? p?.tithi ?? 1) <= 15 ? "shukla" : "krishna";

  return <div className="ap-pjw-root">
    <div className="ap-pjw-datebar">
      <label>
        <span className="ap-pjw-icon-label"><FeatureGlyph featureId="F001" symbol="calendar" size="inline" />{l(language, "मिति छान्नुहोस्", "Choose date")}</span>
        <input type="date" value={date} max="2100-12-31" min="1900-01-01" onChange={(event) => { setDate(event.target.value); }} />
      </label>
      <button type="button" className="ap-pjw-secondary" onClick={() => { setDate(todayInNepal()); }}>{l(language, "आज", "Today")}</button>
      <button type="button" className="ap-pjw-secondary" onClick={() => { setDate(addIsoDays(date, -1)); }} aria-label={l(language, "अघिल्लो दिन", "Previous day")}>‹</button>
      <button type="button" className="ap-pjw-secondary" onClick={() => { setDate(addIsoDays(date, 1)); }} aria-label={l(language, "अर्को दिन", "Next day")}>›</button>
    </div>
    {!computed || !p || !at || !windows ? <div className="ap-pjw-empty">{l(language, "यो मितिका लागि स्थानीय सूर्योदय उपलब्ध छैन। फरक मिति वा स्थान छान्नुहोस्।", "Local sunrise is unavailable for this date. Choose another date or location.")}</div> : <>
      <p className="ap-pjw-method" role="status" aria-live="polite">{archiveLoaded
         ? l(language, "प्रकाशित पात्रोका समय उपलब्ध भएमा देखाइन्छन्; अन्य समय चयन गरिएको मिति र स्थानअनुसार निकालिएका हुन्।", "Published calendar times are shown when available; other times are calculated for your selected date and location.")
         : archiveUnavailable
           ? l(language, "प्रकाशित पात्रो उपलब्ध हुन सकेन। यी समय मिति र स्थानअनुसार निकालिएका हुन्; पर्व वा व्रतका लागि स्थानीय पात्रो पनि हेर्नुहोस्।", "The published calendar could not be loaded. These times are calculated for your date and location; check a local calendar for festival or fasting decisions.")
           : archivePending
             ? l(language, "प्रकाशित पात्रोका विवरण लोड हुँदैछन्…", "Loading published calendar details…" )
             : l(language, "समयहरू चयन गरिएको मिति र स्थानअनुसार देखाइएका छन्। पर्व वा व्रतको निर्णय गर्दा स्थानीय प्रकाशित पात्रो पनि हेर्नुहोस्।", "Times are shown for your selected date and location. Check your local published calendar for festival or fasting decisions.")}</p>
      {solarArchiveDiffers && <p className="ap-pjw-note" role="status">{l(language, "प्रकाशित पात्रो र स्थानीय गणनामा सूर्योदय वा सूर्यास्तको समय दुई मिनेटभन्दा बढी फरक छ। दिनका अन्य समयखण्ड स्थानीय सूर्योदय र सूर्यास्तका आधारमा निकालिएका छन्।", "The published calendar and local calculation differ by more than two minutes for sunrise or sunset. Other daytime intervals use the local sunrise and sunset.")}</p>}
      <div className="ap-pjw-date-heading">
        <div><span>{l(language, "नेपालको स्थानीय मिति", "Nepal local date")}</span><h3>{localDateLabel(date, language)}</h3></div>
        <div className="ap-pjw-meta"><strong>{contract?.calendars.bs ? l(language, "वि.सं. " + toNepaliDigits(contract.calendars.bs.year + "/" + contract.calendars.bs.month + "/" + contract.calendars.bs.day), "BS " + contract.calendars.bs.year + "/" + contract.calendars.bs.month + "/" + contract.calendars.bs.day) : l(language, "वि.सं. मिति लोड हुँदैछ", "Loading BS date")}</strong><small>{contract?.calendars.nepalSambat ? l(language, contract.calendars.nepalSambat, contract.calendars.nepalSambatEn ?? contract.calendars.nepalSambat) : l(language, "नेपाल संवत् मिति उपलब्ध छैन", "Nepal Sambat date unavailable")}</small></div>
      </div>
      <div className="ap-pjw-stats">
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F002" symbol="moon" size="inline" />{l(language, "तिथि / पक्ष", "Tithi / Paksha")}</span><strong>{(rows[0]?.value ?? l(language, tithiName(p.tithi), TITHI_EN[p.tithi - 1]))}</strong><small>{displayedPaksha === "shukla" ? l(language, "शुक्ल पक्ष", "Shukla Paksha") : l(language, "कृष्ण पक्ष", "Krishna Paksha")}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F004" symbol="nakshatra" size="inline" />{l(language, "नक्षत्र / पाद", "Nakshatra / Pada")}</span><strong>{(rows[1]?.value ?? l(language, NAKSHATRAS[p.nakshatra], NAKSHATRA_EN[p.nakshatra]))}</strong><small>{l(language, "पाद", "Pada")} {contract?.elements.nakshatra.pada ?? p.nakshatraPada}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F005" symbol="yoga" size="inline" />{l(language, "योग", "Yoga")}</span><strong>{(rows[2]?.value ?? l(language, YOGAS[p.yoga], YOGA_EN[p.yoga]))}</strong><small>{l(language, "स्थानीय सूर्योदयमा", "At local sunrise")}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F006" symbol="karana" size="inline" />{l(language, "करण", "Karana")}</span><strong>{(rows[3]?.value ?? l(language, KARANA_NAMES[p.karana], KARANA_EN[p.karana]))}</strong><small>{vishti ? l(language, "विष्टि / भद्रा", "Vishti / Bhadra") : l(language, "आधा तिथि", "Half-Tithi segment")}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F034" symbol="moon" size="inline" />{l(language, "चन्द्र राशि", "Moon Rashi")}</span><strong>{l(language, RASHIS[p.moonRashi], RASHI_EN[p.moonRashi])}</strong><small>{l(language, "निरयण राशि", "Sidereal sign")}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F037" symbol="sun" size="inline" />{l(language, "सूर्य राशि", "Sun Rashi")}</span><strong>{l(language, RASHIS[p.sunRashi], RASHI_EN[p.sunRashi])}</strong><small>{l(language, "निरयण राशि", "Sidereal sign")}</small></article>
      </div>

      {Object.values(conflicts).some(Boolean) && <p className="ap-pjw-note" role="status">{l(language, "पञ्चाङ्गका विवरणमा फरक भेटिएकाले त्यस तत्वको परिवर्तन समय देखाइएको छैन। सम्बन्धित दिनको प्रकाशित पात्रो हेर्नुहोस्।", "Calendar details differ for this item, so its transition time is not shown. Check the published calendar for that date.")}</p>}
      {(selectedFeatureId === "F021" || selectedFeatureId === "F022") && <section className="ap-pjw-card">
        <div className="ap-pjw-subhead">
          <h3>{selectedFeatureId === "F021" ? l(language, "पञ्चकको अवधि", "Panchak period") : l(language, "गण्डमूल अवधि", "Ganda Moola period")}</h3>
          <small>{l(language, "सम्भावित अवधि", "Possible intervals")}</small>
        </div>
        <div className="ap-pjw-datebar">
          <label><span>{l(language, "खोज अवधि", "Search range")}</span>
            <select className="ap-pjw-select" value={ruleWindowDays} onChange={event => setRuleWindowDays(Number(event.target.value))}>
              {[7,14,30,60,90].map(value => <option value={value} key={value}>{l(language, value + " दिन", value + " days")}</option>)}
            </select>
          </label>
          <span className="ap-pjw-section-note">{l(language, "सुरु मिति: " + date, "Starting date: " + date)}</span>
        </div>
        <p className="ap-pjw-section-note">{selectedFeatureId === "F021"
          ? l(language, "धनिष्ठाको तेस्रो पाददेखि रेवती नक्षत्रको अन्त्यसम्मको सम्भावित पञ्चक अवधि यहाँ देखाइएको छ। पर्व वा संस्कारसम्बन्धी निर्णयअघि स्थानीय प्रकाशित पञ्चाङ्ग पनि हेर्नुहोस्।", "This shows the possible Panchak interval from Dhanishtha Pada 3 through the end of Revati. Check a published local Panchang before making an observance decision.")
          : l(language, "अश्विनी, आश्लेषा, मघा, ज्येष्ठा, मूल र रेवती नक्षत्रका सम्भावित गण्डमूल अवधि यहाँ देखाइएका छन्। यो जानकारी मात्र हो; जन्मसम्बन्धी निर्णय गर्दा जन्म समय र आफ्नो परम्परालाई पनि विचार गर्नुहोस्।", "This shows possible Ganda Moola intervals for Ashwini, Ashlesha, Magha, Jyeshtha, Mula and Revati. Treat this as guidance only and consider birth time and your tradition for natal interpretations.")}</p>
        {ruleWindowState === "loading" ? <p className="ap-pjw-section-note" role="status">{l(language, "नक्षत्रका सीमा गणना हुँदैछन्…", "Calculating Nakshatra boundaries…")}</p>
          : ruleWindowState === "error" ? <p className="ap-pjw-error" role="alert">{l(language, "अन्तराल गणना भएन। मिति वा अवधि परिवर्तन गरी पुनः प्रयास गर्नुहोस्।", "The interval search failed. Change the date or range and try again.")}</p>
          : ruleWindowState === "ready" && ruleWindows.length === 0 ? <div className="ap-pjw-empty">{l(language, "यस अवधिमा मिल्ने समय भेटिएन।", "No matching period was found in this date range.")}</div>
          : ruleWindowState === "ready" ? <div className="ap-pjw-event-table-wrap"><table className="ap-pjw-event-table">
            <thead><tr><th scope="col">{l(language, "नक्षत्र प्रवेश", "Entry Nakshatra")}</th><th scope="col">{l(language, "नक्षत्र अन्त्य", "Last Nakshatra")}</th><th scope="col">{l(language, "सुरु (NPT)", "Starts (NPT)")}</th><th scope="col">{l(language, "समाप्ति (NPT)", "Ends (NPT)")}</th></tr></thead>
            <tbody>{ruleWindows.map((item,index)=><tr key={item.start.toISOString()+index}>
              <td><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F004" symbol="nakshatra" size="inline"/>{l(language, NAKSHATRAS[item.entryNakshatra-1] ?? "—", NAKSHATRA_EN[item.entryNakshatra-1] ?? "—")}</span></td>
              <td><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F004" symbol="nakshatra" size="inline"/>{l(language, NAKSHATRAS[item.lastNakshatra-1] ?? "—", NAKSHATRA_EN[item.lastNakshatra-1] ?? "—")}</span></td>
              <td>{new Intl.DateTimeFormat(language === "ne" ? "ne-NP-u-nu-deva" : "en-GB", {timeZone:"Asia/Kathmandu",dateStyle:"medium",timeStyle:"short",hourCycle:"h23"}).format(item.start)}</td>
              <td>{new Intl.DateTimeFormat(language === "ne" ? "ne-NP-u-nu-deva" : "en-GB", {timeZone:"Asia/Kathmandu",dateStyle:"medium",timeStyle:"short",hourCycle:"h23"}).format(item.end)}</td>
            </tr>)}</tbody>
          </table></div> : null}
        <p className="ap-pjw-method">{selectedFeatureId === "F021"
          ? l(language, "यी समयहरू नक्षत्रको परम्परागत सीमाका आधारमा निकालिएका सम्भावित अवधि हुन्। अन्तिम धार्मिक निर्णयका लागि आफ्नो स्थानीय प्रकाशित पञ्चाङ्ग हेर्नुहोस्।", "These times are possible intervals based on traditional Nakshatra boundaries. Consult a published local Panchang for final observance decisions.")
          : l(language, "यी समयहरू सम्बन्धित नक्षत्रका परम्परागत अवधिमा आधारित सम्भावित अवधि हुन्। जन्मसम्बन्धी निर्णयका लागि जन्म समय र आफ्नो परम्परालाई पनि विचार गर्नुहोस्।", "These are possible intervals based on the traditional periods of the listed Nakshatras. Consider birth time and your tradition for natal interpretations.")}</p>
      </section>}
      {selectedFeatureId === "F010" && tithiPattern && <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "सूर्योदय र तिथिको निरन्तरता", "Tithi across successive sunrises")}</h3><small>{l(language, "तिथिको क्रम", "Tithi sequence")}</small></div>
        <div className="ap-pjw-stats">
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F013" symbol="sunrise" size="inline"/>{l(language, "अघिल्लो सूर्योदय", "Previous sunrise")}</span><strong>{l(language, tithiName(tithiPattern.previous), TITHI_EN[tithiPattern.previous - 1])}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F013" symbol="sunrise" size="inline"/>{l(language, "यस सूर्योदय", "Today's sunrise")}</span><strong>{l(language, tithiName(tithiPattern.current), TITHI_EN[tithiPattern.current - 1])}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F013" symbol="sunrise" size="inline"/>{l(language, "अर्को सूर्योदय", "Next sunrise")}</span><strong>{l(language, tithiName(tithiPattern.next), TITHI_EN[tithiPattern.next - 1])}</strong></article>
        </div>
        <p className="ap-pjw-method">{tithiPattern.entering.status === "vriddhi" ? l(language, "अघिल्लो र आजको सूर्योदयमा एउटै तिथि: वृद्धि तिथिको सम्भावित सङ्केत।", "The same Tithi occurs at yesterday's and today's sunrise: a possible Vriddhi Tithi indication.") : tithiPattern.entering.status === "kshaya" ? l(language, "दुई सूर्योदयबीच एउटा तिथि छुटेको गणनात्मक सङ्केत।", "The calculated sunrise sequence indicates one Tithi skipped between the two sunrises.") : l(language, "यस सूर्योदयमा तिथि सामान्य क्रमले अगाडि बढेको छ।", "The Tithi advances normally at this sunrise.")} {l(language, "व्रत वा पर्व निर्णयका लागि प्रचलित अनुष्ठान-समय र प्रकाशित पात्रो अलग जाँच्नुपर्छ।", "Festival and fasting decisions still require the applicable observance window and published Panchang.")}</p>
      </section>}
      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3 className="ap-pjw-icon-label"><FeatureGlyph featureId="F008" symbol="lunar-calendar" size="inline"/>{l(language, "चन्द्र महिनाको प्रणाली", "Lunar month convention")}</h3><small>{l(language, "नेपालमा प्रचलित पूर्णिमान्त नामकरण", "Purnimanta naming used in Nepal")}</small></div>
        <div className="ap-pjw-stats">
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F008" symbol="lunar-calendar" size="inline"/>{l(language, "अमान्त महिना", "Amanta month")}</span><strong>{l(language, LUNAR_MONTHS[p.lunarMonth.amantaIndex], LUNAR_MONTHS_ROMAN[p.lunarMonth.amantaIndex])}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F008" symbol="lunar-calendar" size="inline"/>{l(language, "पूर्णिमान्त महिना", "Purnimanta month")}</span><strong>{l(language, LUNAR_MONTHS[p.monthIndex], LUNAR_MONTHS_ROMAN[p.monthIndex])}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F009" symbol="calendar-cycle" size="inline"/>{l(language, "महिनाको विशेष अवस्था", "Special month state")}</span><strong>{p.lunarMonth.adhik ? l(language, "अधिक मास", "Adhika Masa") : p.lunarMonth.kshaya ? l(language, "क्षय मास", "Kshaya Masa") : l(language, "सामान्य चन्द्र महिना", "Ordinary lunar month")}</strong></article>
        </div>
        <p className="ap-pjw-section-note">{l(language, "महिनाको नाम र विशेष अवस्था बुझ्न यो विवरण उपयोगी छ। पर्व वा व्रतको अन्तिम मिति स्थानीय प्रकाशित पात्रोअनुसार जाँच्नुहोस्।", "These details help explain lunar month names and special states. Check a published local calendar for final festival or fasting dates.")}</p>
      </section>
      <DaylightArc day={p} language={language}/>
      <div className="ap-pjw-solar">
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F013" symbol="sunrise" size="inline" />{l(language, "सूर्योदय", "Sunrise")}</span><strong>{formatLocalTime(displaySunrise, language)}</strong><small>{archivedSunrise ? l(language, "प्रकाशित पात्रो", "Published calendar") : l(language, "स्थानअनुसारको समय", "Local time")}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F013" symbol="sunset" size="inline" />{l(language, "सूर्यास्त", "Sunset")}</span><strong>{formatLocalTime(displaySunset, language)}</strong><small>{archivedSunset ? l(language, "प्रकाशित पात्रो", "Published calendar") : l(language, "स्थानअनुसारको समय", "Local time")}</small></article>
        <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F013" symbol="sun" size="inline" />{l(language, "दिनमान", "Daylight")}</span><strong>{displaySunrise && displaySunset ? formatDuration(displaySunrise, displaySunset, language) : "—"}</strong><small>{archivedSunrise && archivedSunset ? l(language, "सूर्योदय–सूर्यास्तको समयबाट", "From sunrise and sunset times") : l(language, "सूर्योदय–सूर्यास्तको समयबाट", "From sunrise and sunset times")}</small></article>
      </div>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "पञ्चाङ्ग परिवर्तन", "Panchang transitions")}</h3><small>{l(language, "समय नेपाल समय (NPT)", "Times in Nepal time (NPT)")}</small></div>
        <div className="ap-pjw-filter-row ap-pjw-clock-modes" role="group" aria-label={l(language, "समय देखाउने तरिका", "Clock display mode")}>
          {(["12h", "24h", "24plus"] as const).map(mode => <button key={mode} type="button" className={clockMode === mode ? "ap-pjw-primary" : "ap-pjw-secondary"} aria-pressed={clockMode === mode} onClick={() => setClockMode(mode)}>{mode === "24plus" ? l(language, "२४+ घण्टा", "24+ hours") : mode === "12h" ? l(language, "१२ घण्टा", "12 hours") : l(language, "२४ घण्टा", "24 hours")}</button>)}
        </div>
        <p className="ap-pjw-section-note">{l(language, "२४+ विकल्पले अर्को नागरिक मितिको समयलाई २४:०० पछि निरन्तर देखाउँछ; मूल क्षण परिवर्तन हुँदैन।", "The 24+ option continues past 24:00 on the next civil date; the underlying instant is unchanged.")}</p>
        <div className="ap-pjw-boundaries">{rows.map((row) => <div key={row.labelEn}><span className="ap-pjw-icon-label"><FeatureGlyph featureId={row.labelEn === "Tithi" ? "F002" : row.labelEn === "Nakshatra" ? "F004" : row.labelEn === "Yoga" ? "F005" : "F006"} symbol={row.labelEn === "Tithi" ? "moon" : row.labelEn === "Nakshatra" ? "nakshatra" : row.labelEn === "Yoga" ? "yoga" : "karana"} size="inline" />{l(language, row.labelNe, row.labelEn)}</span><strong>{row.value}</strong><small>{l(language, "सुरु", "Starts")}: {row.start ? formatPanchangClock(row.start, date, clockMode, language) : "—"} · {l(language, "समाप्ति", "Ends")}: {row.end ? formatPanchangClock(row.end, date, clockMode, language) : "—"}</small><small>{row.end ? formatLocalDateTime(row.end, language) : "—"} {l(language, "नेपाल समय", "Nepal time")}</small></div>)}</div>
      </section>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "दिनका परम्परागत समयखण्ड", "Traditional day windows")}</h3><small>{l(language, "स्थानीय सूर्योदय र सूर्यास्तबाट गणना", "Calculated from local sunrise and sunset")}</small></div>
        <div className="ap-pjw-window-grid">
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F015" symbol="day-segment" size="inline" />{l(language, "राहुकाल", "Rahu Kalam")}</span><strong>{timeWindow(windows.rahu, language)}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F016" symbol="day-cycle" size="inline" />{l(language, "यमगण्ड", "Yamaganda")}</span><strong>{timeWindow(windows.yamaganda, language)}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F017" symbol="clock" size="inline" />{l(language, "गुलिक काल", "Gulika Kalam")}</span><strong>{timeWindow(windows.gulika, language)}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F018" symbol="sun-star" size="inline" />{l(language, "अभिजित मुहूर्त", "Abhijit Muhurta")}</span><strong>{timeWindow(windows.abhijit, language)}</strong></article>
          <article><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F019" symbol="dawn" size="inline" />{l(language, "ब्रह्म मुहूर्त", "Brahma Muhurta")}</span><strong>{timeWindow(windows.brahma, language)}</strong></article>
        </div>
      </section>

      <section className="ap-pjw-card">
        <div className="ap-pjw-subhead"><h3>{l(language, "विशेष परम्परागत सङ्केत", "Traditional indicators")}</h3><small>{l(language, "व्याख्या परम्पराअनुसार फरक हुन सक्छ", "Interpretations can vary by tradition")}</small></div>
        <div className="ap-pjw-indicator-grid">
          <article className={panchak ? "is-flagged" : ""}><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F021" symbol="nakshatra" size="inline"/>{l(language, "पञ्चक", "Panchak")}</span><strong>{panchak ? l(language, "चलिरहेको हुन सक्छ", "May be active") : l(language, "यस सूर्योदयमा देखिएन", "Not indicated at this sunrise")}</strong><small>{l(language, "नक्षत्र र पादबाट प्राथमिक सङ्केत", "Preliminary indication from Nakshatra and Pada")}</small></article>
          <article className={gandaMoola ? "is-flagged" : ""}><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F022" symbol="gandamoola" size="inline"/>{l(language, "गण्डमूल", "Ganda Moola")}</span><strong>{gandaMoola ? l(language, "गण्डमूल नक्षत्र", "Ganda Moola Nakshatra") : l(language, "यस सूर्योदयमा देखिएन", "Not indicated at this sunrise")}</strong><small>{l(language, "परम्परागत नक्षत्र वर्गीकरण", "Traditional Nakshatra classification")}</small></article>
          <article className={vishti ? "is-flagged" : ""}><span className="ap-pjw-icon-label"><FeatureGlyph featureId="F023" symbol="karana" size="inline"/>{l(language, "विष्टि / भद्रा", "Vishti / Bhadra")}</span><strong>{vishti ? l(language, "विष्टि करण", "Vishti Karana") : l(language, "यस सूर्योदयमा छैन", "Not present at this sunrise")}</strong><small>{l(language, "करण गणनामा आधारित", "Based on calculated Karana")}</small></article>
        </div>
      </section>

      {selectedFeatureId === "F025" && <section className="ap-pjw-feature-focus"><h3>{l(language, "आगामी सूर्य राशि प्रवेश", "Next solar sign ingress")}</h3><strong>{nextIngress ? formatLocalDateTime(nextIngress, language) : l(language, "यस समयसीमामा परिवर्तन फेला परेन।", "No ingress found in the search window.")}</strong><p>{l(language, "समय सूर्यको निरयण दीर्घांशको राशि सीमा खोजेर निकालिएको हो।", "Calculated by searching the sign boundary of the Sun's sidereal longitude.")}</p></section>}
      {focus && focus.disposition === "source-review" && <p className="ap-pjw-note">{l(language, "पर्व वा संस्कारको अन्तिम मिति र समयका लागि स्थानीय प्रकाशित पञ्चाङ्ग पनि हेर्नुहोस्।", "Check a published local Panchang for final festival or observance dates and times.")}</p>}
      <p className="ap-pjw-method">{languageNote} {contract && l(language, "यी विवरण पञ्चाङ्ग बुझ्न सहयोगी हुन्। पर्व वा व्रतको अन्तिम निर्णयका लागि स्थानीय प्रकाशित पात्रो हेर्नुहोस्।", "These details are a guide to the Panchang. Check a published local calendar before making a final festival or fasting decision.")}</p>
      <div className="ap-pjw-footer-links">
        <a href={"/date/" + date}>{l(language, "यस दिनको पूरा विवरण", "Full day details")} ↗</a>
        <a href="/tools/tithi-reminder">{l(language, "तिथि रिमाइन्डर", "Tithi reminder")} ↗</a>
        <a href="/tools/sait">{l(language, "साइत हेर्नुहोस्", "Explore Sait")} ↗</a>
      </div>
    </>}
  </div>;
}
