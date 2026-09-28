import { motion } from "framer-motion";
import type { CosmicDayPayload } from "../types";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";

type ExoplanetData = CosmicDayPayload["exoplanet"];

interface Props {
  exoplanet: ExoplanetData | null;
  loading?: boolean;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function sizeDescription(radius: number | null | undefined) {
  if (radius == null || !Number.isFinite(radius)) return "size not yet constrained";
  if (radius < 0.8) return "smaller than Earth";
  if (radius <= 1.25) return "roughly Earth-sized";
  if (radius < 2) return "a super-Earth";
  if (radius < 6) return "Neptune-scale";
  return "gas-giant scale";
}

export function ExoplanetHighlight({ exoplanet, loading = false }: Props) {
  const planet = exoplanet?.highlight ?? null;
  const distanceLy = planet?.distance_pc != null ? planet.distance_pc * 3.26156 : null;
  const sizeText = sizeDescription(planet?.radius_earth);

  return (
    <ExpandedCosmicPanel
      id="beyond-solar"
      eyebrow="NASA Exoplanet Archive"
      title="Beyond Our Solar System"
      icon="✺"
      badge={loading
        ? "Searching other worlds"
        : planet?.discovery_year
          ? `Discovered ${planet.discovery_year}`
          : "Confirmed worlds"}
    >
      {loading ? (
        <div className="exo-card exo-card--enhanced" aria-hidden="true">
          <div className="cosmic-skeleton cosmic-skeleton--exo" />
          <div className="exo-copy-skeleton">
            <span /><span /><span /><span />
          </div>
        </div>
      ) : planet ? (
        <motion.div
          className="exo-card exo-card--enhanced"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="exo-orb exo-orb--enhanced" aria-hidden="true">
            <motion.span
              animate={{ y: [0, 8, 0], rotate: [0, 2, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <i className="exo-star exo-star--one" />
            <i className="exo-star exo-star--two" />
            <i className="exo-star exo-star--three" />
          </div>

          <div className="exo-copy">
            <p className="eyebrow">A confirmed world beyond the Sun</p>
            <h3>{planet.name}</h3>
            <p className="exo-poem">
              A world orbiting {planet.host || "a distant star"}
              {distanceLy != null ? `, about ${formatNumber(distanceLy, 0)} light-years from us` : ""}.
              {" "}Its measured radius makes it {sizeText}.
            </p>

            <div className="exo-stat-grid">
              <div><span>Distance</span><strong>{distanceLy != null ? `${formatNumber(distanceLy, 0)} ly` : "—"}</strong><small>{formatNumber(planet.distance_pc, 1)} pc</small></div>
              <div><span>Discovery</span><strong>{planet.discovery_method || "—"}</strong><small>{planet.discovery_year || "Year unavailable"}</small></div>
              <div><span>Radius</span><strong>{formatNumber(planet.radius_earth, 2)} R⊕</strong><small>{sizeText}</small></div>
              <div><span>Orbit</span><strong>{formatNumber(planet.orbital_period_days, 2)} d</strong><small>around {planet.host || "host star"}</small></div>
            </div>

            {planet.mass_earth != null ? (
              <p className="exo-footnote">
                Estimated mass: {formatNumber(planet.mass_earth, 2)} Earth masses. Archive values can be revised as measurements improve.
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <div className="exo-empty">
          <div className="exo-empty__orbit" aria-hidden="true"><span /></div>
          <div><strong>No exoplanet highlight returned</strong><p>The NASA Exoplanet Archive query is temporarily unavailable. This section will repopulate from the server cache when the archive responds.</p></div>
        </div>
      )}
    </ExpandedCosmicPanel>
  );
}
