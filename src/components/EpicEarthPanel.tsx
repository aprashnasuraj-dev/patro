import { motion } from "framer-motion";
import type { CosmicDayPayload } from "../types";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";

type EpicData = CosmicDayPayload["earth"]["epic"];
type EonetData = CosmicDayPayload["earth"]["eonet"];

interface Props {
  epic: EpicData | null;
  eonet: EonetData | null;
  worldviewUrl?: string;
  loading?: boolean;
}

function shortDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : null;
}

export function EpicEarthPanel({ epic, eonet, worldviewUrl, loading = false }: Props) {
  const image = epic?.items?.[0] ?? null;
  const imageDate = epic?.image_date || shortDate(image?.date);
  const fallbackUsed = Boolean(epic?.fallback_used && image);
  const hasImage = Boolean(image?.image_url);
  const latest = epic?.latest_available_date || null;

  const badge = loading
    ? "Reading EPIC"
    : fallbackUsed && imageDate
      ? `Nearest · ${imageDate}`
      : hasImage
        ? "Exact EPIC frame"
        : "Archive gap";

  return (
    <ExpandedCosmicPanel
      id="earth-space"
      eyebrow="DSCOVR EPIC · EONET · Earthdata GIBS"
      title="Earth from Space"
      icon="◉"
      badge={badge}
      defaultOpen
    >
      {loading ? (
        <div className="earth-layout">
          <div className="cosmic-skeleton cosmic-skeleton--earth" aria-hidden="true" />
          <div className="cosmic-skeleton-list" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>
      ) : (
        <div className="earth-layout">
          <div className="earth-visual">
            {hasImage && image ? (
              <motion.figure
                className="epic-figure"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <div className="epic-image-wrap">
                  <img
                    src={image.image_url}
                    alt={fallbackUsed
                      ? `Earth observed by DSCOVR EPIC on nearest available date ${imageDate}`
                      : "Earth observed by DSCOVR EPIC"}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="epic-image-glow" aria-hidden="true" />
                  {fallbackUsed && imageDate && (
                    <span className="epic-nearest-pill">Nearest available: {imageDate}</span>
                  )}
                </div>
                <figcaption>
                  <strong>{image.caption || "Earth from DSCOVR EPIC"}</strong>
                  <span>
                    {fallbackUsed
                      ? `No exact full-disc frame for ${epic?.requested_date}. Showing the closest EPIC observation within ±3 days.`
                      : `Full-disc EPIC observation for ${imageDate || epic?.requested_date || "the selected date"}.`}
                  </span>
                </figcaption>
              </motion.figure>
            ) : (
              <motion.div
                className="epic-empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className="epic-empty__planet" aria-hidden="true">
                  <span className="epic-empty__orbit" />
                  <span className="epic-empty__moon" />
                </div>
                <div>
                  <p className="eyebrow">EPIC archive gap</p>
                  <h3>No full-disc frame within ±3 days</h3>
                  <p>
                    The selected date has no nearby DSCOVR EPIC observation inside the strict fallback window.
                    {latest ? ` The latest date currently reported by the EPIC archive is ${latest}.` : ""}
                  </p>
                  {epic?.searched_dates?.length ? (
                    <small>Searched: {epic.searched_dates.join(" · ")}</small>
                  ) : null}
                </div>
              </motion.div>
            )}

            <div className="earth-link-row">
              {worldviewUrl ? (
                <a className="cosmic-link-button" href={worldviewUrl} target="_blank" rel="noreferrer">
                  Open this date in NASA Worldview / GIBS ↗
                </a>
              ) : null}
              {latest ? (
                <a
                  className="cosmic-link-button cosmic-link-button--muted"
                  href={`https://epic.gsfc.nasa.gov/?date=${latest}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View latest EPIC archive ↗
                </a>
              ) : null}
            </div>
          </div>

          <div className="event-list">
            <div className="mini-heading">
              <strong>Natural events</strong>
              <span>{eonet?.count ?? 0} on/around this date</span>
            </div>
            {eonet?.events?.length ? eonet.events.map((event, index) => (
              <motion.article
                className="event-row"
                key={event.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.045, 0.22) }}
              >
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.categories.join(" · ") || "Natural event"}</small>
                </div>
                <span>{event.closed ? "Closed" : "Open"}</span>
              </motion.article>
            )) : (
              <div className="cosmic-empty-mini">
                <span aria-hidden="true">◎</span>
                <p>No EONET events were returned for this day.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </ExpandedCosmicPanel>
  );
}
