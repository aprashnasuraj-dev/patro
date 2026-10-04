import { formatNeDate } from "../nepaliDate";
import { motion } from "framer-motion";
import type { CosmicDayPayload } from "../types";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";

type SolarData = CosmicDayPayload["solar"];

interface Props {
  solar: SolarData | null;
  loading?: boolean;
}

function formatUtc(value: string | null | undefined) {
  if (!value) return "समय उपलब्ध छैन";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatNeDate(date, { year: false, time: true, timeZone: "UTC", zoneLabel: "UTC" });
}

function levelIndex(level: SolarData["level"] | undefined) {
  if (level === "Elevated") return 4;
  if (level === "Moderate") return 3;
  if (level === "Low") return 2;
  return 1;
}

function levelLabel(level: SolarData["level"] | undefined) {
  if (level === "Elevated") return "उच्च";
  if (level === "Moderate") return "मध्यम";
  if (level === "Low") return "कम";
  return "शान्त";
}

export function SpaceWeatherPanel({ solar, loading = false }: Props) {
  const level = solar?.level ?? "Quiet";
  const activeIndex = levelIndex(level);
  const hasEvents = Boolean(
    solar?.flares.length || solar?.cmes.length || solar?.storms.length
  );

  return (
    <ExpandedCosmicPanel
      id="solar-activity"
      eyebrow="स्रोत · NASA अन्तरिक्ष मौसम"
      title="सौर गतिविधि"
      icon="☉"
      badge={loading ? "विवरण तयार हुँदैछ" : levelLabel(level)}
    >
      {loading ? (
        <div className="space-weather-loading" aria-hidden="true">
          <div className="cosmic-skeleton cosmic-skeleton--solar" />
          <div className="space-weather-columns">
            <div className="cosmic-skeleton cosmic-skeleton--event" />
            <div className="cosmic-skeleton cosmic-skeleton--event" />
            <div className="cosmic-skeleton cosmic-skeleton--event" />
          </div>
        </div>
      ) : (
        <>
          <motion.div
            className="space-weather-overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42 }}
          >
            <div className={`space-weather-sun space-weather-sun--${level.toLowerCase()}`} aria-hidden="true">
              <span />
            </div>
            <div className="space-weather-overview__copy">
              <span className="eyebrow">गतिविधि स्तर</span>
              <strong>{levelLabel(level)}</strong>
              <p>
                {solar?.window_start && solar?.window_end
                  ? `${solar.window_start} देखि ${solar.window_end} सम्मका उपलब्ध सौर घटना।`
                  : "चयन गरिएको मिति वरिपरिका उपलब्ध सौर घटना।"}
              </p>
              <div className="space-weather-scale" aria-label={`सौर गतिविधि: ${levelLabel(level)}`}>
                {["शान्त", "कम", "मध्यम", "उच्च"].map((label, index) => (
                  <span className={index + 1 <= activeIndex ? "is-active" : ""} key={label}>
                    <i />{label}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-weather-kpis">
              <div><span>सौर ज्वाला</span><strong>{solar?.counts.flares ?? 0}</strong></div>
              <div><span>प्लाज्मा उत्सर्जन</span><strong>{solar?.counts.cmes ?? 0}</strong></div>
              <div><span>चुम्बकीय आँधी</span><strong>{solar?.counts.storms ?? 0}</strong></div>
              <div>
                <span>अधिकतम Kp</span>
                <strong>{solar?.max_kp != null ? solar.max_kp.toFixed(1) : "—"}</strong>
              </div>
            </div>
          </motion.div>

          {solar?.max_flare_class ? (
            <div className="space-weather-callout">
              यस अवधिको सबैभन्दा बलियो सौर ज्वाला: <strong>{solar.max_flare_class}</strong>
            </div>
          ) : null}

          <div className="space-weather-columns">
            <section className="space-weather-group">
              <div className="space-weather-group__title"><span>✦</span><strong>सौर ज्वाला</strong></div>
              {solar?.flares.length ? solar.flares.slice(0, 4).map((flare, index) => (
                <motion.article
                  className="space-weather-event"
                  key={flare.id || flare.begin_time || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <span className="space-weather-event__type">{flare.class_type || "वर्ग उपलब्ध छैन"}</span>
                  <strong>{flare.source_location || "सौर क्षेत्र"}</strong>
                  <small>उच्चतम · {formatUtc(flare.peak_time || flare.begin_time)}</small>
                </motion.article>
              )) : <p className="space-weather-none">यस अवधिमा सौर ज्वाला सूचीबद्ध छैन।</p>}
            </section>

            <section className="space-weather-group">
              <div className="space-weather-group__title"><span>◌</span><strong>कोरोनल मास उत्सर्जन</strong></div>
              {solar?.cmes.length ? solar.cmes.slice(0, 4).map((cme, index) => (
                <motion.article
                  className="space-weather-event"
                  key={cme.id || cme.start_time || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <span className="space-weather-event__type">
                    {cme.speed_kps != null ? `${Math.round(cme.speed_kps)} किमी/सेकेन्ड` : "CME"}
                  </span>
                  <strong>{cme.source_location || "सौर उत्सर्जन"}</strong>
                  <small>{formatUtc(cme.start_time)}</small>
                </motion.article>
              )) : <p className="space-weather-none">यस अवधिमा कोरोनल मास उत्सर्जन सूचीबद्ध छैन।</p>}
            </section>

            <section className="space-weather-group">
              <div className="space-weather-group__title"><span>◎</span><strong>भूचुम्बकीय आँधी</strong></div>
              {solar?.storms.length ? solar.storms.slice(0, 4).map((storm, index) => (
                <motion.article
                  className="space-weather-event"
                  key={storm.id || storm.start_time || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <span className="space-weather-event__type">
                    {storm.max_kp != null ? `Kp ${storm.max_kp.toFixed(1)}` : "आँधी"}
                  </span>
                  <strong>भूचुम्बकीय घटना</strong>
                  <small>{formatUtc(storm.start_time)}</small>
                </motion.article>
              )) : <p className="space-weather-none">यस अवधिमा भूचुम्बकीय आँधी सूचीबद्ध छैन।</p>}
            </section>
          </div>

          {!hasEvents ? (
            <div className="space-weather-quiet">
              <span aria-hidden="true">☼</span>
              <div><strong>शान्त सौर अवधि</strong><p>चयन गरिएको मिति वरिपरि उल्लेखनीय सौर ज्वाला, उत्सर्जन वा भूचुम्बकीय आँधी सूचीबद्ध छैन।</p></div>
            </div>
          ) : null}
        </>
      )}
    </ExpandedCosmicPanel>
  );
}
