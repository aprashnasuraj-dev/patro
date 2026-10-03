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
    ? "चित्र खोजिँदैछ"
    : fallbackUsed && imageDate
      ? `नजिकको मिति · ${imageDate}`
      : hasImage
        ? "यस मितिको चित्र"
        : "चित्र उपलब्ध छैन";

  return (
    <ExpandedCosmicPanel
      id="earth-space"
      eyebrow="स्रोत · NASA पृथ्वी अवलोकन"
      title="अन्तरिक्षबाट पृथ्वी"
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
                      ? `नजिकको उपलब्ध मिति ${imageDate} मा अन्तरिक्षबाट देखिएको पृथ्वी`
                      : "अन्तरिक्षबाट देखिएको पृथ्वी"}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="epic-image-glow" aria-hidden="true" />
                  {fallbackUsed && imageDate && (
                    <span className="epic-nearest-pill">नजिकको उपलब्ध मिति: {imageDate}</span>
                  )}
                </div>
                <figcaption>
                  <strong>{image.caption || "पृथ्वीको पूर्ण चित्र"}</strong>
                  <span>
                    {fallbackUsed
                      ? `चयन गरिएको मितिको सट्टा नजिकको उपलब्ध अवलोकन ${imageDate} देखाइएको छ।`
                      : `${imageDate || epic?.requested_date || "चयन गरिएको मिति"} को पृथ्वी अवलोकन।`}
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
                  <p className="eyebrow">पृथ्वी अवलोकन</p>
                  <h3>यस मिति वरिपरि पूर्ण पृथ्वीको चित्र उपलब्ध छैन</h3>
                  <p>
                    उपलब्ध नजिकका अवलोकनमा उपयुक्त पूर्ण पृथ्वी चित्र भेटिएन।
                    {latest ? ` हाल उपलब्ध पछिल्लो अवलोकन मिति ${latest} हो।` : ""}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="earth-link-row">
              {worldviewUrl ? (
                <a className="cosmic-link-button" href={worldviewUrl} target="_blank" rel="noreferrer">
                  NASA Worldview मा यो मिति हेर्नुहोस् ↗
                </a>
              ) : null}
              {latest ? (
                <a
                  className="cosmic-link-button cosmic-link-button--muted"
                  href={`https://epic.gsfc.nasa.gov/?date=${latest}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  पछिल्लो पृथ्वी चित्र हेर्नुहोस् ↗
                </a>
              ) : null}
            </div>
          </div>

          <div className="event-list">
            <div className="mini-heading">
              <strong>प्राकृतिक घटना</strong>
              <span>{eonet?.count ?? 0} घटना</span>
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
                  <small>{event.categories.join(" · ") || "प्राकृतिक घटना"}</small>
                </div>
                <span>{event.closed ? "समाप्त" : "जारी"}</span>
              </motion.article>
            )) : (
              <div className="cosmic-empty-mini">
                <span aria-hidden="true">◎</span>
                <p>यस मितिका लागि सूचीबद्ध प्राकृतिक घटना भेटिएन।</p>
              </div>
            )}
          </div>
        </div>
      )}
    </ExpandedCosmicPanel>
  );
}
