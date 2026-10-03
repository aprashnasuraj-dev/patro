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
  if (radius == null || !Number.isFinite(radius)) return "आकार स्पष्ट छैन";
  if (radius < 0.8) return "पृथ्वीभन्दा सानो";
  if (radius <= 1.25) return "पृथ्वी जत्रै";
  if (radius < 2) return "सुपर-अर्थ आकार";
  if (radius < 6) return "नेप्च्युन जत्रो";
  return "ग्यास विशाल ग्रह जत्रो";
}

export function ExoplanetHighlight({ exoplanet, loading = false }: Props) {
  const planet = exoplanet?.highlight ?? null;
  const distanceLy = planet?.distance_pc != null ? planet.distance_pc * 3.26156 : null;
  const sizeText = sizeDescription(planet?.radius_earth);

  return (
    <ExpandedCosmicPanel
      id="beyond-solar"
      eyebrow="स्रोत · NASA बहिर्ग्रह संग्रह"
      title="सौर्यमण्डल बाहिर"
      icon="✺"
      badge={loading
        ? "ग्रह खोजिँदैछ"
        : planet?.discovery_year
          ? `${planet.discovery_year} मा पत्ता लागेको`
          : "पुष्टि भएका ग्रह"}
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
            <p className="eyebrow">सूर्यभन्दा परको पुष्टि भएको ग्रह</p>
            <h3>{planet.name}</h3>
            <p className="exo-poem">
              {planet.host || "टाढाको तारा"} वरिपरि परिक्रमा गर्ने ग्रह
              {distanceLy != null ? `, हामीबाट करिब ${formatNumber(distanceLy, 0)} प्रकाश-वर्ष टाढा` : ""}।
              {" "}मापन गरिएको त्रिज्याअनुसार यसको आकार {sizeText} छ।
            </p>

            <div className="exo-stat-grid">
              <div><span>दूरी</span><strong>{distanceLy != null ? `${formatNumber(distanceLy, 0)} प्रकाश-वर्ष` : "—"}</strong><small>{formatNumber(planet.distance_pc, 1)} pc</small></div>
              <div><span>खोज विधि</span><strong>{planet.discovery_method || "—"}</strong><small>{planet.discovery_year || "वर्ष उपलब्ध छैन"}</small></div>
              <div><span>त्रिज्या</span><strong>{formatNumber(planet.radius_earth, 2)} R⊕</strong><small>{sizeText}</small></div>
              <div><span>परिक्रमा</span><strong>{formatNumber(planet.orbital_period_days, 2)} दिन</strong><small>{planet.host || "आफ्नो तारा"} वरिपरि</small></div>
            </div>

            {planet.mass_earth != null ? (
              <p className="exo-footnote">
                अनुमानित द्रव्यमान: पृथ्वीको {formatNumber(planet.mass_earth, 2)} गुणा। नयाँ मापनसँग अभिलेख मानहरू परिमार्जन हुन सक्छन्।
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <div className="exo-empty">
          <div className="exo-empty__orbit" aria-hidden="true"><span /></div>
          <div><strong>यस समय बहिर्ग्रहको विशेष विवरण उपलब्ध छैन</strong><p>स्रोतबाट विवरण उपलब्ध भएपछि यो भाग स्वतः भरिन्छ।</p></div>
        </div>
      )}
    </ExpandedCosmicPanel>
  );
}
