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
      eyebrow="NASA Mars rover archive"
      title="Mars on This Day"
      icon="◌"
      badge={loading ? "Searching Mars" : fallbackCount ? `${fallbackCount} archive fallback` : "Archive-aware"}
    >
      {loading ? (
        <div className="rover-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => <div className="cosmic-skeleton cosmic-skeleton--rover" key={key} />)}
        </div>
      ) : (
        <>
          <p className="archive-notice">
            {mars?.official_api_status || "Mars archive status is temporarily unavailable."}
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
                      alt={`${photo.rover} Mars rover archive observation`}
                      loading="lazy"
                      decoding="async"
                    />
                    <span>{photo.rover}</span>
                  </div>
                  <div>
                    <strong>{photo.camera || "NASA Mars archive"}</strong>
                    <small>{photo.earth_date || requestedDate}</small>
                    <span>
                      {photo.roverStatus === "media_library_fallback"
                        ? "NASA Media Library fallback"
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
                <strong>No rover imagery matched this Earth date</strong>
                <p>The archived rover endpoint and NASA Media Library fallback returned no usable image.</p>
              </div>
            </div>
          )}

          <div className="insight-strip insight-strip--enhanced">
            <strong>InSight weather archive</strong>
            <span>{mars?.insight_weather.status.replaceAll("_", " ") || "unavailable"}</span>
            {insight ? (
              <>
                <span>Sol {insight.sol}</span>
                <span>
                  {insight.average_temp_c != null
                    ? `${Math.round(insight.average_temp_c)}°C average`
                    : "temperature unavailable"}
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
