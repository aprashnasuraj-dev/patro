import type { ApodPayload, CosmicDayPayload, TithiPayload } from "../types";
import { EpicEarthPanel } from "./EpicEarthPanel";
import { ExoplanetHighlight } from "./ExoplanetHighlight";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";
import { MarsRoverGallery } from "./MarsRoverGallery";
import { NeoWsOrbitViz } from "./NeoWsOrbitViz";
import { SpaceWeatherPanel } from "./SpaceWeatherPanel";

interface Props {
  data: CosmicDayPayload | null;
  apod: ApodPayload | null;
  tithi: TithiPayload | null;
  loading: boolean;
  error: string | null;
}

function formatNumber(value: number | null | undefined, maximumFractionDigits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function culturalNote(tithi: TithiPayload | null) {
  if (!tithi) return "Tithi meaning will appear when astronomical calculation completes.";
  if (tithi.tithi_index === 15) return "पूर्णिमा · Purnima is the full-moon Tithi, culturally associated with observances, pilgrimage and lunar festivals across Nepal.";
  if (tithi.tithi_index === 30) return "औंसी · Amavasya is the new-moon Tithi, important in many remembrance and ritual traditions in Nepal.";
  if (tithi.tithi_name === "Ekadashi") return "एकादशी · Ekadashi is traditionally observed by many devotees through fasting, reflection or dietary restraint.";
  return `${tithi.tithi_name_ne} · ${tithi.tithi_name} belongs to ${tithi.paksha}. Cultural observance varies by tradition, locality and authoritative Panchanga.`;
}

export function CosmicExperience({ data, apod, tithi, loading, error }: Props) {
  if (error && !data) {
    return (
      <section className="glass-panel cosmic-loading">
        <div>
          <p className="eyebrow">Cosmic data</p>
          <h2>NASA context is temporarily unavailable</h2>
          <p className="subheading">{error}</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="cosmic-stack" aria-label="Loading NASA cosmic data layers">
        <section className="cosmic-loading glass-panel">
          <span className="cosmic-loader" />
          <div>
            <p className="eyebrow">NASA + Patro</p>
            <h2>Reading the selected sky</h2>
            <p className="subheading">Each NASA source is cached and resolved independently behind the Supabase router.</p>
          </div>
        </section>
        <EpicEarthPanel epic={null} eonet={null} loading={loading} />
        <MarsRoverGallery mars={null} requestedDate="" loading={loading} />
        <SpaceWeatherPanel solar={null} loading={loading} />
        <ExoplanetHighlight exoplanet={null} loading={loading} />
      </section>
    );
  }

  return (
    <section className="cosmic-stack" aria-label="NASA cosmic data layers">
      <ExpandedCosmicPanel
        id="sky-this-day"
        eyebrow="NASA APOD + media library"
        title="Sky of This Day"
        icon="✦"
        badge={apod?.is_fallback ? "Fallback image" : "NASA"}
        defaultOpen
      >
        <div className="sky-layout">
          <figure className="sky-feature">
            {apod?.url && <img src={apod.url} alt="" loading="lazy" decoding="async" />}
            <figcaption>
              <h3>{apod?.title || "Astronomy Picture of the Day"}</h3>
              <p>{apod?.explanation || "NASA APOD metadata is unavailable for this date."}</p>
              <div className="source-row">
                <span>{apod?.date || data.requested_date}</span>
                {apod?.copyright && <span>{apod.copyright}</span>}
                {apod?.source_media_type === "video" && <span>Video represented by thumbnail</span>}
              </div>
            </figcaption>
          </figure>

          <div className="media-strip">
            {data.related_media.items.length ? data.related_media.items.map((item) => (
              <article className="media-tile" key={item.nasa_id || item.preview_url}>
                <img src={item.preview_url} alt="" loading="lazy" decoding="async" />
                <div><strong>{item.title}</strong><small>{item.center || "NASA media archive"}</small></div>
              </article>
            )) : <p className="empty-copy">No related NASA media was returned for this date.</p>}
          </div>
        </div>
      </ExpandedCosmicPanel>

      <ExpandedCosmicPanel
        id="moon-tithi"
        eyebrow="Astronomy Engine + Nepali tradition"
        title="Moon & Tithi"
        icon="☾"
        badge={tithi ? `${tithi.illumination_percent.toFixed(1)}% lit` : "Calculating"}
        defaultOpen
      >
        <div className="fact-grid">
          <div className="fact-card"><span>Tithi</span><strong>{tithi?.tithi_name_ne || "—"}</strong><small>{tithi?.tithi_name || ""}</small></div>
          <div className="fact-card"><span>Paksha</span><strong>{tithi?.paksha || "—"}</strong></div>
          <div className="fact-card"><span>Phase angle</span><strong>{tithi ? `${tithi.phase_angle_deg.toFixed(2)}°` : "—"}</strong></div>
          <div className="fact-card"><span>Next transition</span><strong>{tithi?.time_to_next_tithi_minutes != null ? `${Math.round(tithi.time_to_next_tithi_minutes / 60 * 10) / 10} h` : "—"}</strong></div>
        </div>
        <div className="cultural-note"><strong>नेपाल सन्दर्भ · Cultural note</strong><p>{culturalNote(tithi)}</p></div>
        <p className="method-note">Traditional interpretation is kept separate from verified astronomical calculations. Near-boundary ceremonial timing should still be checked against an authoritative Panchanga.</p>
      </ExpandedCosmicPanel>

      <EpicEarthPanel
        epic={data.earth.epic}
        eonet={data.earth.eonet}
        worldviewUrl={data.earth.gibs.worldview_url}
        loading={loading}
      />

      <MarsRoverGallery mars={data.mars} requestedDate={data.requested_date} loading={loading} />

      <ExpandedCosmicPanel
        id="cosmic-neighborhood"
        eyebrow="NASA JPL · NeoWs"
        title="Cosmic Neighborhood"
        icon="◎"
        badge={`${data.neo.count} tracked`}
        defaultOpen
      >
        <div className="neo-layout">
          <NeoWsOrbitViz items={data.neo.items} />
          <div className="neo-list">
            <div className="mini-heading">
              <strong>Closest approaches</strong>
              <span>{data.neo.hazardous_count} hazardous-flag object{data.neo.hazardous_count === 1 ? "" : "s"}</span>
            </div>
            {data.neo.items.map((neo) => (
              <article className="neo-row" key={neo.id || neo.name}>
                <div>
                  <strong>{neo.name}</strong>
                  <small>{formatNumber(neo.diameter_m)} m estimated diameter</small>
                </div>
                <div className="neo-row__numbers">
                  <b>{formatNumber(neo.miss_distance_km)} km</b>
                  <small>{formatNumber(neo.velocity_kph)} km/h</small>
                </div>
                {neo.hazardous && <span className="hazard-chip">Potentially hazardous</span>}
              </article>
            ))}
          </div>
        </div>
      </ExpandedCosmicPanel>

      <SpaceWeatherPanel solar={data.solar} loading={loading} />

      <ExoplanetHighlight exoplanet={data.exoplanet} loading={loading} />

      <ExpandedCosmicPanel
        id="technology"
        eyebrow="NASA Tech Transfer"
        title="Technology from the Space Program"
        icon="⌁"
        badge="Lower-priority layer"
      >
        <div className="technology-grid">
          {data.technology.items.length ? data.technology.items.map((item) => (
            <article key={item.id || item.title}>
              <span>{item.category || "NASA technology"}</span>
              <strong>{item.title}</strong>
              <p>{item.description || "NASA technology-transfer record."}</p>
            </article>
          )) : <p className="empty-copy">No technology-transfer records were returned right now.</p>}
        </div>
      </ExpandedCosmicPanel>
    </section>
  );
}
