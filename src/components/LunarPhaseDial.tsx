import { useMemo } from "react";
import type { TithiPayload } from "../types";

interface Props {
  data: TithiPayload | null;
  loading: boolean;
  error: string | null;
}

function phasePath(angle: number, radius = 88, center = 100) {
  const normalized = ((angle % 360) + 360) % 360;
  const waxing = normalized <= 180;
  const cos = Math.cos((normalized * Math.PI) / 180);
  const samples = 80;
  const terminator: string[] = [];
  const limb: string[] = [];

  for (let i = 0; i <= samples; i++) {
    const y = -radius + (2 * radius * i) / samples;
    const xExtent = Math.sqrt(Math.max(0, radius * radius - y * y));
    const xTerm = waxing ? cos * xExtent : -cos * xExtent;
    terminator.push((center + xTerm).toFixed(2) + "," + (center + y).toFixed(2));
    const limbX = waxing ? xExtent : -xExtent;
    limb.unshift((center + limbX).toFixed(2) + "," + (center + y).toFixed(2));
  }

  return "M " + terminator.join(" L ") + " L " + limb.join(" L ") + " Z";
}

function formatMinutes(minutes: number | null) {
  if (minutes == null) return "Transition unavailable";
  if (minutes < 60) return minutes + " min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours + "h " + rest + "m";
}

function Metric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="astro-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function LunarPhaseDial({ data, loading, error }: Props) {
  const litPath = useMemo(
    () => (data ? phasePath(data.phase_angle_deg) : ""),
    [data]
  );

  if (loading && !data) {
    return (
      <section className="glass-panel lunar-card" aria-label="Loading lunar phase">
        <div className="skeleton skeleton--title" />
        <div className="lunar-loading-circle skeleton" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="glass-panel lunar-card">
        <p className="eyebrow">Lunar phase</p>
        <h2>Unable to calculate Tithi</h2>
        <div className="inline-error" role="alert">{error || "No astronomical data returned."}</div>
      </section>
    );
  }

  const special =
    data.tithi_index === 15
      ? "Purnima · Full Moon"
      : data.tithi_index === 30
        ? "Amavasya · New Moon"
        : null;

  return (
    <section className="glass-panel lunar-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Interactive lunar phase</p>
          <h2>{data.tithi_name_ne}</h2>
          <p className="subheading">
            {data.tithi_name} · {data.paksha}
          </p>
        </div>
        <span className="tithi-index">Tithi {data.tithi_index}/30</span>
      </div>

      <div className="lunar-visual-wrap">
        <svg
          className="lunar-svg"
          viewBox="0 0 200 200"
          role="img"
          aria-label={
            data.tithi_name +
            ", " +
            data.illumination_percent.toFixed(1) +
            "% illuminated"
          }
        >
          <defs>
            <radialGradient id="moonSurface" cx="38%" cy="34%" r="68%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="58%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </radialGradient>
            <filter id="moonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="moonClip">
              <circle cx="100" cy="100" r="88" />
            </clipPath>
          </defs>

          <circle cx="100" cy="100" r="92" className="moon-halo" />
          <circle cx="100" cy="100" r="88" fill="#020617" stroke="rgba(255,255,255,.18)" />
          <path
            d={litPath}
            fill="url(#moonSurface)"
            clipPath="url(#moonClip)"
            filter="url(#moonGlow)"
          />
          <g className="moon-craters" clipPath="url(#moonClip)" opacity=".23">
            <circle cx="132" cy="65" r="9" />
            <circle cx="74" cy="104" r="13" />
            <circle cx="121" cy="132" r="7" />
            <circle cx="105" cy="82" r="5" />
          </g>
        </svg>

        <div className="illumination-readout">
          <strong>{data.illumination_percent.toFixed(1)}%</strong>
          <span>illuminated</span>
          {special && <em>{special}</em>}
        </div>
      </div>

      <div className="progress-block">
        <div className="progress-labels">
          <span>Current Tithi progress</span>
          <strong>{data.tithi_progress_percent.toFixed(1)}%</strong>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: Math.min(100, Math.max(0, data.tithi_progress_percent)) + "%" }}
          />
        </div>
        <small>Next Tithi in approximately {formatMinutes(data.time_to_next_tithi_minutes)}</small>
      </div>

      <details className="precision-details">
        <summary>Exact astronomical values</summary>
        <div className="astro-metrics">
          <Metric label="Δθ phase angle" value={data.phase_angle_deg.toFixed(4) + "°"} />
          <Metric label="Moon longitude" value={data.moon_longitude_deg.toFixed(4) + "°"} />
          <Metric label="Sun longitude" value={data.sun_longitude_deg.toFixed(4) + "°"} />
          <Metric
            label="Next transition"
            value={
              data.next_tithi_at_utc
                ? new Intl.DateTimeFormat("en-GB", {
                    timeZone: "Asia/Kathmandu",
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short"
                  }).format(new Date(data.next_tithi_at_utc))
                : "—"
            }
          />
        </div>
        <div className="anomaly-row">
          <span className={data.calendar_anomaly.kshaya_tithi ? "anomaly-chip anomaly-chip--warn" : "anomaly-chip"}>
            Kshaya {data.calendar_anomaly.kshaya_tithi ? "detected" : "not detected"}
          </span>
          <span className={data.calendar_anomaly.adhika_tithi ? "anomaly-chip anomaly-chip--warn" : "anomaly-chip"}>
            Adhika {data.calendar_anomaly.adhika_tithi ? "detected" : "not detected"}
          </span>
        </div>
        <p className="method-note">{data.methodology.precision_note}</p>
      </details>
    </section>
  );
}
