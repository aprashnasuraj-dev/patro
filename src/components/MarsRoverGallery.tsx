import { motion } from "framer-motion";
import type { CosmicDayPayload } from "../types";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";

type MarsData = CosmicDayPayload["mars"];

interface Props {
  mars: MarsData | null;
  requestedDate: string;
  loading?: boolean;
}

export function MarsRoverGallery({ mars, requestedDate, loading = false }: Props) {
  const photos = mars?.rovers.flatMap((rover) =>
    rover.photos.map((photo) => ({ ...photo, roverStatus: rover.status }))
  ).slice(0, 8) ?? [];

  const fallbackCount = mars?.rovers.filter((rover) => rover.status === "media_library_fallback").length ?? 0;
  const insight = mars?.insight_weather.sols?.[0] ?? null;

  return (
    <ExpandedCosmicPanel
      id="mars-day"
      eyebrow="स्रोत · NASA मंगल संग्रह"
      title="यस दिनको मंगल"
      icon="◌"
      badge={loading ? "चित्र खोजिँदैछ" : fallbackCount ? "नजिकका उपलब्ध चित्र" : "मंगल संग्रह"}
    >
      {loading ? (
        <div className="rover-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => <div className="cosmic-skeleton cosmic-skeleton--rover" key={key} />)}
        </div>
      ) : (
        <>
          <p className="archive-notice">
            {mars?.official_api_status ? "उपलब्ध मंगल अभियानका चित्र र अभिलेख चयन गरिएको मितिसँग मिलाएर देखाइएका छन्।" : "मंगल चित्रको विस्तृत स्थिति अहिले उपलब्ध छैन।"}
          </p>

          {photos.length ? (
            <div className="rover-grid">
              {photos.map((photo, index) => (
                <motion.article
                  className="rover-card rover-card--enhanced"
                  key={`${photo.id}-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: Math.min(index * 0.04, 0.24) }}
                  whileHover={{ y: -4 }}
                >
                  <div className="rover-card__image">
                    <img
                      src={photo.img_src}
                      alt={`${photo.rover} मंगल अभियानको चित्र`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span>{photo.rover}</span>
                  </div>
                  <div>
                    <strong>{photo.camera || "मंगल अभियान"}</strong>
                    <small>{photo.earth_date || requestedDate}</small>
                    <span>
                      {photo.roverStatus === "media_library_fallback"
                        ? "नजिकको उपलब्ध चित्र"
                        : `Sol ${photo.sol ?? "—"}`}
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="mars-empty">
              <div className="mars-empty__disc" aria-hidden="true" />
              <div>
                <strong>यस मितिसँग मिल्ने मंगल अभियानको चित्र भेटिएन</strong>
                <p>उपलब्ध मंगल अभिलेखमा प्रयोगयोग्य चित्र नभएकाले यस भागमा चित्र देखाइएको छैन।</p>
              </div>
            </div>
          )}

          <div className="insight-strip insight-strip--enhanced">
            <strong>InSight मौसम अभिलेख</strong>
            <span>{insight ? "उपलब्ध" : "यस मितिका लागि उपलब्ध छैन"}</span>
            {insight ? (
              <>
                <span>Sol {insight.sol}</span>
                <span>
                  {insight.average_temp_c != null
                    ? `औसत ${Math.round(insight.average_temp_c)}°C`
                    : "तापक्रम उपलब्ध छैन"}
                </span>
                {insight.pressure_pa != null ? <span>{Math.round(insight.pressure_pa)} Pa</span> : null}
              </>
            ) : null}
          </div>
        </>
      )}
    </ExpandedCosmicPanel>
  );
}
