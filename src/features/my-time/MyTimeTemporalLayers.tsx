import { useEffect, useMemo, useState } from "react";
import { CircleAlert, Compass, Sparkles } from "lucide-react";
import { choghadiyaWindows, horaWindows, inauspiciousDayWindows } from "../../patro-tools/core/temporal-windows";
import { zonedInstant } from "../../place/civil";
import { localLunarEclipse, localSolarEclipse } from "../../place/eclipse";
import { l } from "../../useUiLanguage";

type Language = "ne" | "en";
type Snapshot = {
  date: string;
  timezone: string;
  weekday: number;
  location: { lat: number; lng: number };
  panchang: { sunrise_utc: string | null; sunset_utc: string | null; next_sunrise_utc: string | null };
  twilight: { civil_dawn_utc: string | null; civil_dusk_utc: string | null; nautical_dawn_utc: string | null; nautical_dusk_utc: string | null; astronomical_dawn_utc: string | null; astronomical_dusk_utc: string | null };
};
type Props = { snapshot: Snapshot; timezone: string; language: Language; now: Date };
type EclipseSummary = { solar: ReturnType<typeof localSolarEclipse>; lunar: ReturnType<typeof localLunarEclipse> };

function clock(value: string, timezone: string, language: Language) {
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
  catch { return "—"; }
}
function dateTime(value: Date, timezone: string, language: Language) {
  try { return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en", { timeZone: timezone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value); }
  catch { return value.toISOString(); }
}
function localIsoDate(value: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export default function MyTimeTemporalLayers({ snapshot, timezone, language, now }: Props) {
  const [eclipses, setEclipses] = useState<EclipseSummary | null>(null);
  const dayNight = useMemo(() => choghadiyaWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc, snapshot.panchang.next_sunrise_utc), [snapshot]);
  const kaal = useMemo(() => inauspiciousDayWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc), [snapshot]);
  const hora = useMemo(() => horaWindows(snapshot.weekday, snapshot.panchang.sunrise_utc, snapshot.panchang.sunset_utc, snapshot.panchang.next_sunrise_utc), [snapshot]);
  const currentHora = [...hora.day, ...hora.night].find(window => now.getTime() >= Date.parse(window.start_utc) && now.getTime() < Date.parse(window.end_utc));
  const selectedIsToday = localIsoDate(now, timezone) === snapshot.date;
  const nowMs = now.getTime();
  const activeKaal = selectedIsToday ? kaal.find(window => nowMs >= Date.parse(window.start_utc) && nowMs < Date.parse(window.end_utc)) : undefined;
  const nextKaal = kaal.filter(window => Date.parse(window.start_utc) > (selectedIsToday ? nowMs : Number.NEGATIVE_INFINITY)).sort((a,b)=>Date.parse(a.start_utc)-Date.parse(b.start_utc))[0];
  const currentChoghadiya = [...dayNight.day,...dayNight.night].find(window => selectedIsToday && nowMs >= Date.parse(window.start_utc) && nowMs < Date.parse(window.end_utc));
  const insight = (() => {
    if (activeKaal) return {
      tone: "caution" as const,
      title: l(language, `${activeKaal.name_ne} अहिले चलिरहेको छ`, `${activeKaal.name_en} is active now`),
      detail: l(language, `${clock(activeKaal.end_utc,timezone,language)} सम्म। यो परम्परा मान्नुहुन्छ भने नयाँ शुभकार्य सुरु गर्न अर्को समय रोज्नुहोस्; नियमित काम र योजना जारी राख्न सक्नुहुन्छ।`, `Until ${clock(activeKaal.end_utc,timezone,language)}. If you follow this tradition, schedule new auspicious starts outside this window; routine work and planning can continue.`)
    };
    if (selectedIsToday && nextKaal) return {
      tone: "calm" as const,
      title: l(language, `${nextKaal.name_ne} अर्को समय`, `Next: ${nextKaal.name_en}`),
      detail: l(language, `${clock(nextKaal.start_utc,timezone,language)}–${clock(nextKaal.end_utc,timezone,language)}। शुभकार्यको समय रोज्दा यो परम्परागत समयलाई ध्यानमा राख्न सक्नुहुन्छ।`, `${clock(nextKaal.start_utc,timezone,language)}–${clock(nextKaal.end_utc,timezone,language)}. If you observe this tradition, you may plan new auspicious starts outside this window.`)
    };
    if (selectedIsToday && currentChoghadiya?.favorable) return {
      tone: "good" as const,
      title: l(language, `अहिले ${currentChoghadiya.name_ne} चौघडिया`, `${currentChoghadiya.name_en} Choghadiya now`),
      detail: l(language,"परम्परागत रूपमा अनुकूल मानिन्छ। आफ्नो परम्परा र कामको सन्दर्भअनुसार निर्णय लिनुहोस्।","Traditionally considered favorable. Use your own tradition and the context of the task when deciding.")
    };
    if (!selectedIsToday && nextKaal) return {
      tone: "calm" as const,
      title: l(language, `${nextKaal.name_ne} · चयन गरिएको मिति`, `${nextKaal.name_en} · selected date`),
      detail: l(language, `${clock(nextKaal.start_utc,timezone,language)}–${clock(nextKaal.end_utc,timezone,language)}। यो परम्परा मान्नुहुन्छ भने त्यस अवधिबाहिर नयाँ शुभकार्य योजना गर्नुहोस्।`, `${clock(nextKaal.start_utc,timezone,language)}–${clock(nextKaal.end_utc,timezone,language)}. If you follow this tradition, plan new auspicious starts outside this period.`)
    };
    if (selectedIsToday) return {
      tone: "good" as const,
      title: l(language,"मुख्य काल खण्डहरू बितिसके","Listed inauspicious windows have passed"),
      detail: l(language,"आजका राहुकाल, यमगण्ड र गुलिक काल बितिसकेका छन्। चाहनुहुन्छ भने अब आफ्नो परम्परा अनुसार बाँकी समय हेर्नुहोस्।","Today's listed Rahu Kaal, Yamaganda and Gulika windows have passed. Check other tradition-specific timings if you use them.")
    };
    return {
      tone: "calm" as const,
      title: l(language,"समय सन्दर्भ तयार हुँदैछ","Timing context is being prepared"),
      detail: l(language,"स्थानको सूर्योदय/सूर्यास्त उपलब्ध भएपछि मात्र परम्परागत समय खण्ड देखाइन्छ।","Traditional windows appear only when local sunrise and sunset are available.")
    };
  })();

  useEffect(() => {
    let active = true;
    try {
      const place = { lat: snapshot.location.lat, lon: snapshot.location.lng, tz: timezone, height: 0 };
      const from = zonedInstant(snapshot.date, "12:00", timezone).instant;
      setEclipses({ solar: localSolarEclipse(from, place), lunar: localLunarEclipse(from, place) });
    } catch { if (active) setEclipses(null); }
    return () => { active = false; };
  }, [snapshot.date, snapshot.location.lat, snapshot.location.lng, timezone]);

  const hasSolarDay = Boolean(snapshot.panchang.sunrise_utc && snapshot.panchang.sunset_utc && snapshot.panchang.next_sunrise_utc);
  return <section className="mt-temporal-section">
    <aside className={`mt-time-insight is-${insight.tone}`} aria-live="polite">
      <div className="mt-insight-icon">{insight.tone==="caution" ? <CircleAlert size={20}/> : insight.tone==="good" ? <Sparkles size={20}/> : <Compass size={20}/>}</div>
      <div className="mt-insight-copy"><span>{l(language,selectedIsToday ? "अहिलेको छोटो समय-सङ्केत" : "चयन गरिएको मितिको समय-सङ्केत",selectedIsToday ? "YOUR QUICK TIME GUIDE" : "SELECTED DATE GUIDE")}</span><strong>{insight.title}</strong><p>{insight.detail}</p></div>
      <small>{l(language,"परम्परागत मार्गदर्शन · वैज्ञानिक ग्यारेन्टी होइन","Traditional guidance · not a scientific guarantee")}</small>
    </aside>
    <div className="mt-section-title"><div><span className="mt-section-kicker">{l(language,"सूर्योदयमा आधारित समय","SUNRISE-BASED TIMING")}</span><h2>{l(language,"दिन र रातका समय खण्ड","Day and night windows")}</h2></div><p>{l(language,"वास्तविक स्थानीय सूर्योदय, सूर्यास्त र अर्को सूर्योदयबीचको अवधि आठ/बाह्र बराबर भागमा विभाजन गरिएको छ। सौर घटना उपलब्ध नभए समय खण्ड बनाइँदैन।","Actual local sunrise, sunset and next sunrise define the day/night spans. Missing solar events never get replaced with guessed 06:00/18:00 times.")}</p></div>
    {kaal.length ? <div className="mt-kaal-grid">{kaal.map(window => <article key={window.key}><small>{l(language,window.name_ne,window.name_en)}</small><strong>{clock(window.start_utc,timezone,language)} – {clock(window.end_utc,timezone,language)}</strong><span>{l(language,"दिनको "+window.eighth+"औँ भाग","Day segment "+window.eighth+" of 8")}</span></article>)}</div> : <div className="mt-notice"><CircleAlert size={18}/><span>{l(language,"यस स्थानीय दिनमा सूर्योदय/सूर्यास्त उपलब्ध नभएकाले चौघडिया र काल खण्ड गणना गर्न सकिएन।","Sunrise or sunset is unavailable for this local day, so traditional timing windows are not calculated.")}</span></div>}
    {hasSolarDay && <div className="mt-window-panel"><div className="mt-window-heading"><h3>{l(language,"चौघडिया","Choghadiya")}</h3><div><span className="mt-good-key"/>{l(language,"परम्परागत रूपमा अनुकूल","Traditionally favorable")} <span className="mt-night-key"/>{l(language,"रात","Night")}</div></div><div className="mt-window-grid">{[...dayNight.day,...dayNight.night].map(window => <div className={"mt-window "+(window.favorable?"is-favorable":"")+(window.key.startsWith("night")?" is-night":"")} key={window.key}><strong>{l(language,window.name_ne,window.name_en)}</strong><small>{clock(window.start_utc,timezone,language)} – {clock(window.end_utc,timezone,language)}</small></div>)}</div></div>}
    <div className="mt-window-panel mt-twilight-panel"><div className="mt-window-heading"><h3>{l(language,"सन्ध्याकाल र गोधूलि","Civil, nautical & astronomical twilight")}</h3><span>{l(language,"सूर्यको उचाइ −६° / −१२° / −१८°","Solar altitude thresholds −6° / −12° / −18°")}</span></div><div className="mt-twilight-grid">{[
      ["civil_dawn_utc","civil_dusk_utc","नागरिक सन्ध्या","Civil twilight"],
      ["nautical_dawn_utc","nautical_dusk_utc","नौचालन सन्ध्या","Nautical twilight"],
      ["astronomical_dawn_utc","astronomical_dusk_utc","खगोलीय सन्ध्या","Astronomical twilight"]
    ].map(([dawnKey,duskKey,titleNe,titleEn])=>{const dawn=snapshot.twilight[dawnKey as keyof Snapshot["twilight"]],dusk=snapshot.twilight[duskKey as keyof Snapshot["twilight"]];return <article key={dawnKey}><strong>{l(language,titleNe,titleEn)}</strong><span>{l(language,"बिहान","Dawn")} · {dawn?clock(dawn,timezone,language):"—"}</span><span>{l(language,"साँझ","Dusk")} · {dusk?clock(dusk,timezone,language):"—"}</span></article>})}</div><p>{l(language,"उच्च अक्षांशमा सूर्य आवश्यक उचाइमा नपुग्दा कुनै सन्ध्या समय उपलब्ध नहुन सक्छ।","At high latitudes, a twilight phase may be unavailable when the Sun does not cross its altitude threshold.")}</p></div>
    {hasSolarDay && <div className="mt-window-panel mt-hora-panel"><div className="mt-window-heading"><h3>{l(language,"होरा","Hora")}</h3><span>{currentHora ? l(language,"अहिले: "+currentHora.name_ne,"Current Hora: "+currentHora.name_en) : l(language,"छानिएको मितिको होरा समयरेखा","Hora timeline for selected date")}</span></div><details><summary>{l(language,"सबै २४ होरा हेर्नुहोस्","View all 24 Hora periods")}</summary><div className="mt-hora-grid">{[...hora.day,...hora.night].map(window => <div key={window.key}><small>{window.name_ne}</small><strong>{clock(window.start_utc,timezone,language)} – {clock(window.end_utc,timezone,language)}</strong></div>)}</div></details></div>}
    {eclipses && <div className="mt-window-panel mt-eclipse-panel"><div className="mt-window-heading"><h3>{l(language,"आगामी ग्रहण","Upcoming eclipses")}</h3><span>{l(language,"स्थानीय दृश्यता","Local visibility")}</span></div><div className="mt-eclipse-grid"><article><small>{l(language,"सूर्यग्रहण","Solar eclipse")}</small><strong>{String(eclipses.solar.kind)}</strong><span>{l(language,"अधिकतम आवरण","Maximum coverage")}: {(eclipses.solar.coverage*100).toFixed(1)}%</span>{eclipses.solar.contacts.slice(0,3).map(contact => <small key={contact.name}>{contact.name} · {dateTime(contact.time,timezone,language)}{contact.aboveHorizon?"":" · "+l(language,"क्षितिजमुनि","below horizon")}</small>)}</article><article><small>{l(language,"चन्द्रग्रहण","Lunar eclipse")}</small><strong>{String(eclipses.lunar.kind)}</strong><span>{eclipses.lunar.visible?l(language,"स्थानीय रूपमा देखिन सक्छ","May be visible locally"):l(language,"स्थानीय क्षितिजमा नदेखिन सक्छ","May not be visible locally")}</span>{eclipses.lunar.contacts.filter(contact => contact.name==="Maximum"||contact.name.includes("start")||contact.name.includes("end")).slice(0,4).map(contact => <small key={contact.name}>{contact.name} · {dateTime(contact.time,timezone,language)}{contact.aboveHorizon?"":" · "+l(language,"क्षितिजमुनि","below horizon")}</small>)}</article></div></div>}
  </section>;
}
