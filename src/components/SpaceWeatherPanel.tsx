import { motion } from "framer-motion";
import type { CosmicDayPayload } from "../types";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";

type SolarData = CosmicDayPayload["solar"];

interface Props {
  solar: SolarData | null;
  loading?: boolean;
}

function formatUtc(value: string | null | undefined) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(date);
}

function levelIndex(level: SolarData["level"] | undefined) {
  if (level === "Elevated") return 4;
  if (level === "Moderate") return 3;
  if (level === "Low") return 2;
  return 1;
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
      eyebrow="NASA CCMC · DONKI"
      title="Space Weather"
      icon="☉"
      badge={loading ? "Reading the Sun" : level}
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
              <span className="eyebrow">Activity level</span>
              <strong>{level}</strong>
              <p>
                {solar?.window_start && solar?.window_end
                  ? `DONKI events from ${solar.window_start} through ${solar.window_end}.`
                  : "DONKI event window around the selected date."}
              </p>
              <div className="space-weather-scale" aria-label={`Solar activity level: ${level}`}>
                {["Quiet", "Low", "Moderate", "Elevated"].map((label, index) => (
                  <span className={index + 1 <= activeIndex ? "is-active" : ""} key={label}>
                    <i />{label}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-weather-kpis">
              <div><span>Flares</span><strong>{solar?.counts.flares ?? 0}</strong></div>
              <div><span>CMEs</span><strong>{solar?.counts.cmes ?? 0}</strong></div>
              <div><span>Storms</span><strong>{solar?.counts.storms ?? 0}</strong></div>
              <div>
                <span>Peak Kp</span>
                <strong>{solar?.max_kp != null ? solar.max_kp.toFixed(1) : "—"}</strong>
              </div>
            </div>
          </motion.div>

          {solar?.max_flare_class ? (
            <div className="space-weather-callout">
              Strongest reported flare in this window: <strong>{solar.max_flare_class}</strong>
            </div>
          ) : null}

          <div className="space-weather-columns">
            <section className="space-weather-group">
              <div className="space-weather-group__title"><span>✦</span><strong>Solar flares</strong></div>
              {solar?.flares.length ? solar.flares.slice(0, 4).map((flare, index) => (
                <motion.article
                  className="space-weather-event"
                  key={flare.id || flare.begin_time || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <span className="space-weather-event__type">{flare.class_type || "Unclassified"}</span>
                  <strong>{flare.source_location || "Solar region unavailable"}</strong>
                  <small>Peak · {formatUtc(flare.peak_time || flare.begin_time)}</small>
                </motion.article>
              )) : <p className="space-weather-none">No flares reported in this window.</p>}
            </section>

            <section className="space-weather-group">
              <div className="space-weather-group__title"><span>◌</span><strong>Coronal mass ejections</strong></div>
              {solar?.cmes.length ? solar.cmes.slice(0, 4).map((cme, index) => (
                <motion.article
                  className="space-weather-event"
                  key={cme.id || cme.start_time || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <span className="space-weather-event__type">
                    {cme.speed_kps != null ? `${Math.round(cme.speed_kps)} km/s` : "CME"}
                  </span>
                  <strong>{cme.source_location || "Solar eruption"}</strong>
                  <small>{formatUtc(cme.start_time)}</small>
                </motion.article>
              )) : <p className="space-weather-none">No CMEs reported in this window.</p>}
            </section>

            <section className="space-weather-group">
              <div className="space-weather-group__title"><span>◎</span><strong>Geomagnetic storms</strong></div>
              {solar?.storms.length ? solar.storms.slice(0, 4).map((storm, index) => (
                <motion.article
                  className="space-weather-event"
                  key={storm.id || storm.start_time || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <span className="space-weather-event__type">
                    {storm.max_kp != null ? `Kp ${storm.max_kp.toFixed(1)}` : "GST"}
                  </span>
                  <strong>{storm.id || "Geomagnetic storm"}</strong>
                  <small>{formatUtc(storm.start_time)}</small>
                </motion.article>
              )) : <p className="space-weather-none">No geomagnetic storms reported in this window.</p>}
            </section>
          </div>

          {!hasEvents ? (
            <div className="space-weather-quiet">
              <span aria-hidden="true">☼</span>
              <div><strong>A quiet window</strong><p>DONKI returned no flare, CME or geomagnetic-storm records for this selected-date window.</p></div>
            </div>
          ) : null}
        </>
      )}
    </ExpandedCosmicPanel>
  );
}
