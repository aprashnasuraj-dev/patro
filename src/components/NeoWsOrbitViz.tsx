import type { CosmicNeo } from "../types";

interface Props {
  items: CosmicNeo[];
}

export function NeoWsOrbitViz({ items }: Props) {
  const visible = items.slice(0, 8);
  return (
    <div className="neo-viz" role="img" aria-label={`Orbit visualization for ${visible.length} near-Earth objects`}>
      <svg viewBox="0 0 520 320" className="neo-viz__svg">
        <defs>
          <radialGradient id="earthGlow" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="38%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </radialGradient>
          <filter id="neoGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {[58, 92, 128].map((r) => (
          <ellipse
            key={r}
            cx="260"
            cy="160"
            rx={r * 1.45}
            ry={r * 0.62}
            className="neo-viz__orbit"
          />
        ))}

        <circle cx="260" cy="160" r="31" fill="url(#earthGlow)" className="neo-viz__earth" />
        <text x="260" y="211" textAnchor="middle" className="neo-viz__label">Earth</text>

        {visible.map((neo, index) => {
          const ring = 58 + (index % 3) * 35;
          const angle = ((index * 137.5 + 22) * Math.PI) / 180;
          const x = 260 + Math.cos(angle) * ring * 1.45;
          const y = 160 + Math.sin(angle) * ring * 0.62;
          const size = Math.max(4, Math.min(11, 4 + Math.log10(Math.max(1, neo.diameter_m)) * 1.6));
          return (
            <g key={neo.id || `${neo.name}-${index}`} className="neo-viz__object">
              <circle
                cx={x}
                cy={y}
                r={size}
                className={neo.hazardous ? "neo-viz__dot neo-viz__dot--hazard" : "neo-viz__dot"}
                filter="url(#neoGlow)"
              />
              <title>
                {neo.name} · {Math.round(neo.diameter_m)} m · {Math.round(neo.miss_distance_km).toLocaleString()} km miss distance
              </title>
            </g>
          );
        })}
      </svg>
      <div className="neo-viz__legend">
        <span><i className="neo-legend-dot" />Tracked NEO</span>
        <span><i className="neo-legend-dot neo-legend-dot--hazard" />Potentially hazardous flag</span>
      </div>
    </div>
  );
}
