import { useMemo, useState } from "react";
import { l } from "../../useUiLanguage";
import type { MyTimeSnapshot } from "../../patro-tools/core/my-time-snapshot";
import { intersectWindows, type TimedWindow } from "./temporal-overlap";
import {
  buildMultidimensionalLayers,
  findActiveSegment,
  formatDuration,
  formatLocalClock,
  formatLocalDate,
  instantForLocalMinute,
  localMinuteForDate,
  percentForMinute,
  polarPoint,
  svgArcPath,
  type ExplorerLayer,
  type ExplorerSegment,
} from "./multidimensional-time-model";

type Props = {
  language: "ne" | "en";
  timezone: string;
  snapshot: MyTimeSnapshot;
  selectedInstant: Date;
  onSelect: (instant: Date) => void;
};

const COLORS: Record<ExplorerLayer["id"], string> = {
  daylight: "#D8A53B",
  choghadiya: "#31836A",
  hora: "#7868C8",
  caution: "#C65D60",
  twilight: "#3185B8",
};

function localDateKey(value: Date, timezone: string): string {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(value).map((part) => [part.type, part.value]),
    );
    return String(parts.year) + "-" + String(parts.month) + "-" + String(parts.day);
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

function colorFor(layer: ExplorerLayer, segment: ExplorerSegment): string {
  if (layer.id === "daylight") return segment.titleEn.toLowerCase().includes("night") ? "#34445A" : COLORS.daylight;
  if (layer.id === "choghadiya") return segment.favorable ? "#26856D" : "#64748B";
  return COLORS[layer.id];
}

function labelFor(layer: ExplorerLayer, segment: ExplorerSegment, language: "ne" | "en") {
  return language === "ne" ? segment.titleNe : segment.titleEn;
}

export default function PersonalCombinedExplorer({ language, timezone, snapshot, selectedInstant, onSelect }: Props) {
  const [view, setView] = useState<"cycle" | "overlaps">("cycle");
  const model = useMemo(() => buildMultidimensionalLayers(snapshot, timezone), [snapshot, timezone]);
  const displayInstant = useMemo(() => {
    const candidate = Number.isFinite(selectedInstant?.getTime?.()) ? selectedInstant : new Date(model.civilStartUtc);
    if (localDateKey(candidate, model.timezone) === model.date) return candidate;
    return instantForLocalMinute(model.date, localMinuteForDate(candidate, model.timezone), model.timezone);
  }, [selectedInstant, model.civilStartUtc, model.date, model.timezone]);
  const minute = Math.max(0, Math.min(1439, Math.floor(localMinuteForDate(displayInstant, model.timezone))));
  const isLiveDate = localDateKey(new Date(), model.timezone) === model.date;
  const timedLayers = model.layers.filter((layer) => layer.id !== "twilight");
  const activeSegments = timedLayers.flatMap((layer) => {
    const segment = findActiveSegment(layer.segments, displayInstant);
    return segment ? [{ layer, segment }] : [];
  });
  const twilight = model.layers.find((layer) => layer.id === "twilight");
  const markers = model.layers.flatMap((layer) => layer.markers.map((marker) => ({ layer, marker })));
  const nextMarker = markers.filter((item) => Date.parse(item.marker.instantUtc) > displayInstant.getTime())
    .sort((a, b) => Date.parse(a.marker.instantUtc) - Date.parse(b.marker.instantUtc))[0];
  const commonOverlap = activeSegments.length > 1
    ? activeSegments.slice(1).reduce<TimedWindow | null>(
      (current, item) => current ? intersectWindows(current, item.segment) : null,
      { start: activeSegments[0].segment.startUtc, end: activeSegments[0].segment.endUtc },
    )
    : null;
  const chooseMinute = (value: number) => onSelect(instantForLocalMinute(model.date, value, model.timezone));
  const chooseSegment = (segment: ExplorerSegment) => chooseMinute((segment.startMinute + segment.endMinute) / 2);
  const radii = [119, 101, 83, 65];

  return (
    <section className="mt-panel" aria-label={l(language, "समयको बहुआयामिक नक्सा", "Your Living Map of Time")} style={{ padding: "clamp(16px,3vw,30px)", marginBlock: 20, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="mt-section-kicker">{l(language, "२४ घण्टाको चक्र · समयका तहहरू", "24-HOUR CYCLE · LAYERED TIME")}</span>
          <h2 style={{ marginBlock: "8px 4px" }}>{l(language, "समयको जीवन्त नक्सा", "Your Living Map of Time")}</h2>
          <p style={{ margin: 0, maxWidth: 720 }}>{l(language, "सौर प्रकाश, चौघडिया, होरा, सावधानीका समय र सन्ध्याकाललाई एउटै स्थानीय घडीमा अन्वेषण गर्नुहोस्।", "Explore daylight, Choghadiya, Hora, traditional caution windows and twilight aligned on one local 24-hour clock.")}</p>
        </div>
        <div role="group" aria-label={l(language, "समयको दृश्य", "Time view")} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={view === "cycle" ? "mt-primary" : "mt-secondary"} aria-pressed={view === "cycle"} onClick={() => setView("cycle")}>{l(language, "२४ घण्टाको चक्र", "24-hour cycle")}</button>
          <button type="button" className={view === "overlaps" ? "mt-primary" : "mt-secondary"} aria-pressed={view === "overlaps"} onClick={() => setView("overlaps")}>{l(language, "समयको ओभरल्याप", "Layer overlaps")}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,310px),1fr))", gap: 22, alignItems: "center", marginBlock: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>
          <svg viewBox="0 0 300 300" role="img" aria-label={l(language, "रङ्गीन वृत्तहरूले समयका तह देखाउने २४ घण्टाको घडी", "24-hour clock with colored rings for timing layers")} style={{ width: "min(100%,360px)", height: "auto", overflow: "visible" }}>
            <circle cx="150" cy="150" r="132" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.12" />
            {radii.map((radius, index) => <circle key={radius} cx="150" cy="150" r={radius} fill="none" stroke="currentColor" strokeWidth="9" opacity="0.09" />)}
            {timedLayers.map((layer, index) => layer.segments.map((segment) => (
              <path key={segment.id} d={svgArcPath(150, 150, radii[index], segment.startMinute, segment.endMinute)} fill="none" stroke={colorFor(layer, segment)} strokeWidth="9" strokeLinecap="round">
                <title>{labelFor(layer, segment, language) + " · " + formatLocalClock(segment.startUtc, model.timezone, language) + "–" + formatLocalClock(segment.endUtc, model.timezone, language)}</title>
              </path>
            )))}
            {markers.map(({ marker }) => {
              const start = polarPoint(150, 150, 125, marker.minute);
              const end = polarPoint(150, 150, 139, marker.minute);
              return <g key={marker.id}><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={COLORS[marker.kind === "twilight" ? "twilight" : "daylight"]} strokeWidth="2.5" strokeLinecap="round" /><title>{(language === "ne" ? marker.titleNe : marker.titleEn) + " · " + formatLocalClock(marker.instantUtc, model.timezone, language)}</title></g>;
            })}
            {[0, 360, 720, 1080].map((value) => {
              const point = polarPoint(150, 150, 148, value);
              return <text key={value} x={point.x} y={point.y} fontSize="9" textAnchor="middle" dominantBaseline="middle" fill="currentColor" opacity="0.8">{String(value / 60).padStart(2, "0")}</text>;
            })}
            {(() => {
              const start = polarPoint(150, 150, 48, minute);
              const end = polarPoint(150, 150, 139, minute);
              return <g><line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#2563EB" strokeWidth="1.5" strokeDasharray="3 3" /><circle cx={end.x} cy={end.y} r="5" fill="#2563EB" stroke="white" strokeWidth="2" /></g>;
            })()}
            <circle cx="150" cy="150" r="43" fill="var(--surface,#ffffff)" stroke="currentColor" strokeOpacity="0.12" />
            <text x="150" y="143" textAnchor="middle" fontSize="19" fontWeight="700" fill="currentColor">{formatLocalClock(displayInstant, model.timezone, language)}</text>
            <text x="150" y="162" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.7">{l(language, "चयन गरिएको समय", "SELECTED TIME")}</text>
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <span className="mt-section-kicker">{l(language, "चयन गरिएको स्थानीय क्षण", "SELECTED LOCAL MOMENT")}</span>
          <h3 style={{ marginBlock: "6px" }}>{formatLocalDate(displayInstant, model.timezone, language)}</h3>
          <div style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 750, letterSpacing: "-0.035em", lineHeight: 1.15 }}>{formatLocalClock(displayInstant, model.timezone, language, true)}</div>
          <p>{l(language, "घडीको सूचक र सबै तहहरू यही चयनसँग मिल्छन्। समयरेखाको कुनै खण्ड छानेर त्यसको बीचको क्षणमा जानुहोस्।", "The clock marker and all layers share this selection. Select any timeline segment to jump to its midpoint.")}</p>
          <label htmlFor="mytime-cycle-minute" style={{ display: "block", fontWeight: 650, marginBottom: 6 }}>{l(language, "२४ घण्टाभित्र समय सार्नुहोस्", "Scrub through the 24-hour cycle")}</label>
          <input id="mytime-cycle-minute" type="range" min={0} max={1439} step={1} value={minute} onChange={(event) => chooseMinute(Number(event.target.value))} style={{ width: "100%", accentColor: "#2563EB" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75 }}><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
          <button type="button" className="mt-secondary" style={{ marginTop: 12 }} onClick={() => isLiveDate ? onSelect(new Date()) : chooseMinute(localMinuteForDate(new Date(), model.timezone))}>{isLiveDate ? l(language, "अहिलेको समयमा फर्कनुहोस्", "Return to live time") : l(language, "आजको घडी-समयको स्थानमा जानुहोस्", "Use the current clock-time position on this date")}</button>
          {nextMarker && <p role="status"><strong>{l(language, "अर्को सौर/सन्ध्या सङ्केत: ", "Next solar/twilight marker: ")}</strong>{(language === "ne" ? nextMarker.marker.titleNe : nextMarker.marker.titleEn) + " · " + formatLocalClock(nextMarker.marker.instantUtc, model.timezone, language)}</p>}
        </div>
      </div>

      {model.warnings.map((warning) => <p key={warning.id} role="status">{language === "ne" ? warning.ne : warning.en}</p>)}

      <div style={{ marginBlock: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ marginBlock: "0 8px" }}>{l(language, "एकीकृत २४ घण्टे समयरेखा", "Unified 24-hour timeline")}</h3>
          <span style={{ fontSize: 12, opacity: 0.75 }}>{l(language, "स्थानीय घडीको समय · छान्न मिल्ने खण्डहरू", "Local wall-clock time · selectable segments")}</span>
        </div>
        {model.layers.map((layer) => (
          <div key={layer.id} style={{ display: "grid", gridTemplateColumns: "minmax(90px,140px) minmax(0,1fr)", gap: 12, alignItems: "start", paddingBlock: 10, borderTop: "1px solid var(--border-color,rgba(100,116,139,0.22))" }}>
            <div><strong style={{ display: "block", fontSize: 14 }}>{language === "ne" ? layer.titleNe : layer.titleEn}</strong><span style={{ display: "block", fontSize: 11, opacity: 0.7, lineHeight: 1.35, marginTop: 3 }}>{language === "ne" ? layer.descriptionNe : layer.descriptionEn}</span></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ position: "relative", height: 29, background: "rgba(100,116,139,0.10)", borderRadius: 7, overflow: "hidden" }}>
                {layer.segments.map((segment) => {
                  const width = Math.max(0.2, percentForMinute(segment.endMinute) - percentForMinute(segment.startMinute));
                  return <button key={segment.id} type="button"
                    title={labelFor(layer, segment, language) + " · " + formatLocalClock(segment.startUtc, model.timezone, language) + "–" + formatLocalClock(segment.endUtc, model.timezone, language) + " · " + (language === "ne" ? segment.explanationNe : segment.explanationEn)}
                    aria-label={labelFor(layer, segment, language) + ", " + formatLocalClock(segment.startUtc, model.timezone, language) + "–" + formatLocalClock(segment.endUtc, model.timezone, language)}
                    onClick={() => chooseSegment(segment)}
                    style={{ position: "absolute", left: percentForMinute(segment.startMinute) + "%", width: width + "%", top: 0, bottom: 0, minWidth: 2, padding: 0, border: "1px solid rgba(255,255,255,0.65)", borderRadius: 3, background: colorFor(layer, segment), color: "white", overflow: "hidden", cursor: "pointer", zIndex: 1 }}>
                    {width >= 9 && <span style={{ display: "block", paddingInline: 4, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", fontSize: 10, lineHeight: "26px" }}>{labelFor(layer, segment, language)}</span>}
                  </button>;
                })}
                {layer.markers.map((marker) => <button key={marker.id} type="button" title={(language === "ne" ? marker.titleNe : marker.titleEn) + " · " + formatLocalClock(marker.instantUtc, model.timezone, language)} aria-label={(language === "ne" ? marker.titleNe : marker.titleEn) + ", " + formatLocalClock(marker.instantUtc, model.timezone, language)} onClick={() => onSelect(new Date(marker.instantUtc))} style={{ position: "absolute", left: "calc(" + percentForMinute(marker.minute) + "% - 3px)", top: 3, width: 7, height: 23, padding: 0, border: "1px solid white", borderRadius: 4, background: COLORS[marker.kind === "twilight" ? "twilight" : "daylight"], zIndex: 3, cursor: "pointer" }} />)}
                <div aria-hidden="true" style={{ position: "absolute", left: "calc(" + percentForMinute(minute) + "% - 1px)", top: 0, bottom: 0, width: 2, background: "#2563EB", boxShadow: "0 0 0 1px rgba(255,255,255,0.8)", zIndex: 5, pointerEvents: "none" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.7, paddingTop: 4 }}><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
            </div>
          </div>
        ))}
      </div>

      {view === "cycle" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))", gap: 10, marginTop: 18 }}>
          {timedLayers.map((layer) => {
            const active = findActiveSegment(layer.segments, displayInstant);
            return <article key={layer.id} style={{ border: "1px solid var(--border-color,rgba(100,116,139,0.28))", borderRadius: 12, padding: 13, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 99, flex: "0 0 auto", background: COLORS[layer.id] }} /><strong>{language === "ne" ? layer.titleNe : layer.titleEn}</strong></div>
              {active ? <>
                <h4 style={{ margin: "4px 0 5px" }}>{labelFor(layer, active, language)}</h4>
                <p style={{ margin: "0 0 5px", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{formatLocalClock(active.startUtc, model.timezone, language)}–{formatLocalClock(active.endUtc, model.timezone, language)} · {formatDuration(active.startUtc, active.endUtc)}</p>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.82 }}>{language === "ne" ? active.explanationNe : active.explanationEn}</p>
                {layer.id === "choghadiya" && active.favorable !== undefined && <p style={{ margin: "7px 0 0", fontSize: 12, fontWeight: 650, color: active.favorable ? "#26856D" : "var(--muted-foreground,#64748b)" }}>{active.favorable ? l(language, "परम्परागत रूपमा अनुकूल", "Traditionally favorable") : l(language, "अनुकूलको रूपमा चिनाइएको छैन", "Not marked traditionally favorable")}</p>}
              </> : <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{l(language, "यस क्षणमा यो तहको कुनै अवधि भेटिएन।", "No interval in this layer covers the selected instant.")}</p>}
            </article>;
          })}
          <article style={{ border: "1px solid var(--border-color,rgba(100,116,139,0.28))", borderRadius: 12, padding: 13, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 99, flex: "0 0 auto", background: COLORS.twilight }} /><strong>{l(language, "सौर/सन्ध्या सङ्केत", "Solar & twilight markers")}</strong></div>
            {nextMarker ? <><h4 style={{ margin: "4px 0 5px" }}>{language === "ne" ? nextMarker.marker.titleNe : nextMarker.marker.titleEn}</h4><p style={{ margin: 0, fontSize: 13 }}>{formatLocalClock(nextMarker.marker.instantUtc, model.timezone, language)}</p><p style={{ margin: "5px 0 0", fontSize: 13, opacity: 0.8 }}>{language === "ne" ? nextMarker.marker.explanationNe : nextMarker.marker.explanationEn}</p></> : <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{l(language, "यस मितिका सङ्केत बितिसकेका छन् वा उपलब्ध छैनन्।", "Today's listed markers have passed or are unavailable.")}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 9 }}>{(twilight?.markers || []).map((marker) => <button key={marker.id} type="button" className="mt-secondary" onClick={() => onSelect(new Date(marker.instantUtc))} title={language === "ne" ? marker.explanationNe : marker.explanationEn} style={{ fontSize: 12 }}>{(language === "ne" ? marker.titleNe : marker.titleEn) + " · " + formatLocalClock(marker.instantUtc, model.timezone, language)}</button>)}</div>
          </article>
        </div>
      ) : (
        <section aria-label={l(language, "समय तहहरूको ओभरल्याप", "Timing-layer overlaps at the selected instant")} style={{ marginTop: 18, border: "1px solid var(--border-color,rgba(100,116,139,0.28))", borderRadius: 14, padding: "clamp(14px,2.5vw,22px)" }}>
          <span className="mt-section-kicker">{l(language, "एकै क्षणमा सक्रिय तहहरू", "LAYERS ACTIVE AT THE SAME INSTANT")}</span>
          <h3>{l(language, "यो क्षण कुन-कुन समयमा पर्छ?", "Which timing windows contain this moment?")}</h3>
          {activeSegments.length ? <>
            <p>{l(language, "तलका समय खण्डहरू एउटै चयन गरिएको क्षणमा सक्रिय छन्। तिनको साझा अवधि वास्तविक सुरु/अन्त्य सीमाबाट गणना गरिएको छ।", "These intervals are active at the same selected instant. Their common span is calculated from their actual start and end boundaries.")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 10 }}>
              {activeSegments.map(({ layer, segment }) => <article key={layer.id} style={{ border: "1px solid var(--border-color,rgba(100,116,139,0.28))", borderRadius: 10, padding: 12 }}><strong>{language === "ne" ? layer.titleNe : layer.titleEn}</strong><h4 style={{ margin: "6px 0" }}>{labelFor(layer, segment, language)}</h4><p style={{ margin: 0, fontSize: 13 }}>{formatLocalClock(segment.startUtc, model.timezone, language)}–{formatLocalClock(segment.endUtc, model.timezone, language)}</p></article>)}
            </div>
            {commonOverlap && <p role="status" style={{ marginBottom: 0, marginTop: 14 }}><strong>{l(language, "सबै सक्रिय तहको साझा अन्तराल: ", "Common interval across active layers: ")}</strong>{formatLocalClock(commonOverlap.start, model.timezone, language)}–{formatLocalClock(commonOverlap.end, model.timezone, language)} · {formatDuration(commonOverlap.start, commonOverlap.end)}</p>}
            {!commonOverlap && activeSegments.length > 1 && <p role="status">{l(language, "साझा अन्तराल निकाल्न सकिएन।", "A single common interval could not be established.")}</p>}
          </> : <p>{l(language, "यस क्षणमा समय खण्ड उपलब्ध छैनन्।", "No timing interval covers the selected instant.")}</p>}
          {!!twilight?.markers.length && <div style={{ marginTop: 16 }}><h4>{l(language, "सौर र सन्ध्या सङ्केत", "Solar and twilight markers")}</h4><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 8 }}>{twilight!.markers.map((marker) => <button key={marker.id} type="button" className="mt-secondary" onClick={() => onSelect(new Date(marker.instantUtc))} style={{ textAlign: "left", padding: 10 }}><strong>{language === "ne" ? marker.titleNe : marker.titleEn}</strong><span style={{ display: "block", fontSize: 12, marginTop: 4 }}>{formatLocalClock(marker.instantUtc, model.timezone, language)}</span></button>)}</div></div>}
        </section>
      )}

      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: "pointer", fontWeight: 650 }}>{l(language, "गणना र पढ्ने तरिका", "Calculation & how to read this map")}</summary>
        <ul>
          <li>{l(language, "समय खण्डहरू स्थानीय सूर्योदय, सूर्यास्त र अर्को सूर्योदयमा आधारित हुन्छन्; सौर विवरण नभए अनुमानित ६:००/१८:०० राखिँदैन।", "Intervals use local sunrise, sunset and next sunrise; missing solar events are not replaced with guessed 06:00/18:00 times.")}</li>
          <li>{l(language, "ओभरल्याप UTC का वास्तविक क्षणहरूबाट गणना हुन्छ। अन्तराल [सुरु, अन्त्य) हो, त्यसैले एउटा खण्ड सकिएकै क्षण अर्को सुरु भए साझा अवधि हुँदैन।", "Overlaps use actual UTC instants and half-open [start, end) intervals; touching endpoints have no shared duration.")}</li>
          <li>{l(language, "चौघडियाको अनुकूल सङ्केत परम्परागत वर्गीकरण हो, परिणामको सम्भाव्यता वा वैज्ञानिक ग्यारेन्टी होइन।", "Choghadiya's favorable marker is a traditional classification, not an outcome probability or scientific guarantee.")}</li>
          <li>{l(language, "समयरेखाले स्थानीय भित्ते-घडीका मिनेट देखाउँछ; समयक्षेत्र परिवर्तन हुने दिनमा नागरिक दिन २४ वास्तविक घण्टाभन्दा फरक हुन सक्छ।", "The tracks use local wall-clock minutes; on time-zone transition days, the civil day may differ from 24 elapsed hours.")}</li>
          <li>{l(language, "सन्ध्याकालका सङ्केत सूर्यको केन्द्र −६°, −१२° र −१८° उचाइमा पुग्दा देखाइन्छन्। स्थान र मौसमअनुसार केही सङ्केत उपलब्ध नहुन सक्छन्।", "Twilight markers represent solar-center altitudes of −6°, −12° and −18°; some may be unavailable depending on place and season.")}</li>
        </ul>
      </details>
    </section>
  );
}
