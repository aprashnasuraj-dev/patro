import type { ApodPayload, CosmicDayPayload, TithiPayload } from "../types";
import { ExpandedCosmicPanel } from "./ExpandedCosmicPanel";
import { NeoWsOrbitViz } from "./NeoWsOrbitViz";

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
  if (loading && !data) {
    return (
      <section className="cosmic-loading glass-panel">
        <span className="cosmic-loader" />
        <div>
          <p className="eyebrow">NASA + Patro</p>
          <h2>Reading the selected sky</h2>
          <p className="subheading">APOD, Earth, Mars, NEO and space-weather feeds are loading independently.</p>
        </div>
      </section>
    );
  }

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

  if (!data) return null;

  const epic = data.earth.epic.items[0];
  const roverPhotos = data.mars.rovers.flatMap((rover) =>
    rover.photos.map((photo) => ({ ...photo, roverStatus: rover.status }))
  ).slice(0, 8);

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

      <ExpandedCosmicPanel
        id="earth-space"
        eyebrow="EPIC · EONET · Earthdata GIBS"
        title="Earth from Space"
        icon="◉"
        badge={data.earth.epic.status === "ok" ? "EPIC available" : "EPIC archive gap"}
        defaultOpen
      >
        <div className="earth-layout">
          <div className="earth-visual">
            {epic ? (
              <>
                <img src={epic.image_url} alt="Earth observed by DSCOVR EPIC" loading="lazy" decoding="async" />
                <p>{epic.caption}</p>
              </>
            ) : (
              <div className="archive-empty">EPIC has no full-disc image for this selected date.</div>
            )}
            <a className="cosmic-link-button" href={data.earth.gibs.worldview_url} target="_blank" rel="noreferrer">
              Open this date in NASA Worldview / GIBS ↗
            </a>
          </div>

          <div className="event-list">
            <div className="mini-heading"><strong>Natural events</strong><span>{data.earth.eonet.count} on/around this date</span></div>
            {data.earth.eonet.events.length ? data.earth.eonet.events.map((event) => (
              <article className="event-row" key={event.id}>
                <div><strong>{event.title}</strong><small>{event.categories.join(" · ") || "Natural event"}</small></div>
                <span>{event.closed ? "Closed" : "Open"}</span>
              </article>
            )) : <p className="empty-copy">No EONET events were returned for this day.</p>}
          </div>
        </div>
      </ExpandedCosmicPanel>

      <ExpandedCosmicPanel
        id="mars-day"
        eyebrow="Mars rover archive"
        title="Mars on This Day"
        icon="◌"
        badge="Archive-aware"
      >
        <p className="archive-notice">{data.mars.official_api_status}</p>
        <div className="rover-grid">
          {roverPhotos.length ? roverPhotos.map((photo, index) => (
            <article className="rover-card" key={`${photo.id}-${index}`}>
              <img src={photo.img_src} alt="" loading="lazy" decoding="async" />
              <div>
                <strong>{photo.rover}</strong>
                <small>{photo.earth_date || data.requested_date} · {photo.camera || "NASA archive"}</small>
                <span>{photo.roverStatus === "media_library_fallback" ? "Media Library fallback" : `Sol ${photo.sol ?? "—"}`}</span>
              </div>
            </article>
          )) : <p className="empty-copy">No rover imagery was available for this date.</p>}
        </div>

        <div className="insight-strip">
          <strong>InSight weather archive</strong>
          <span>{data.mars.insight_weather.status.replaceAll("_", " ")}</span>
          {data.mars.insight_weather.sols[0] && (
            <span>
              Sol {data.mars.insight_weather.sols[0].sol} ·
              {data.mars.insight_weather.sols[0].average_temp_c != null ? ` ${Math.round(data.mars.insight_weather.sols[0].average_temp_c)}°C average` : " temperature unavailable"}
            </span>
          )}
        </div>
      </ExpandedCosmicPanel>

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

      <ExpandedCosmicPanel
        id="solar-activity"
        eyebrow="NASA CCMC · DONKI"
        title="Solar Activity"
        icon="☉"
        badge={data.solar.level}
      >
        <div className="solar-meter">
          <div className={`solar-meter__orb solar-meter__orb--${data.solar.level.toLowerCase()}`} />
          <div>
            <strong>{data.solar.level}</strong>
            <span>{data.solar.counts.flares} flares · {data.solar.counts.cmes} CMEs · {data.solar.counts.storms} geomagnetic storms</span>
            {data.solar.max_flare_class && <small>Strongest reported flare: {data.solar.max_flare_class}</small>}
          </div>
        </div>
        <div className="space-weather-grid">
          {data.solar.flares.map((flare) => <article key={flare.id || flare.begin_time}><span>Flare</span><strong>{flare.class_type || "Unclassified"}</strong><small>{flare.peak_time || flare.begin_time}</small></article>)}
          {data.solar.cmes.map((cme) => <article key={cme.id || cme.start_time}><span>CME</span><strong>{cme.source_location || "Solar eruption"}</strong><small>{cme.start_time}</small></article>)}
          {data.solar.storms.map((storm) => <article key={storm.id || storm.start_time}><span>Geomagnetic storm</span><strong>{storm.id || "GST"}</strong><small>{storm.start_time}</small></article>)}
        </div>
      </ExpandedCosmicPanel>

      <ExpandedCosmicPanel
        id="beyond-solar"
        eyebrow="NASA Exoplanet Archive"
        title="Beyond Our Solar System"
        icon="✺"
        badge={data.exoplanet.highlight?.discovery_year ? `Discovered ${data.exoplanet.highlight.discovery_year}` : "Archive"}
      >
        {data.exoplanet.highlight ? (
          <div className="exo-card">
            <div className="exo-orb" aria-hidden="true"><span /></div>
            <div>
              <p className="eyebrow">Date-linked deterministic highlight</p>
              <h3>{data.exoplanet.highlight.name}</h3>
              <p>Host star: {data.exoplanet.highlight.host || "—"} · Method: {data.exoplanet.highlight.discovery_method || "—"}</p>
              <div className="fact-grid fact-grid--compact">
                <div className="fact-card"><span>Radius</span><strong>{formatNumber(data.exoplanet.highlight.radius_earth, 2)} R⊕</strong></div>
                <div className="fact-card"><span>Mass</span><strong>{formatNumber(data.exoplanet.highlight.mass_earth, 2)} M⊕</strong></div>
                <div className="fact-card"><span>Orbit</span><strong>{formatNumber(data.exoplanet.highlight.orbital_period_days, 2)} d</strong></div>
                <div className="fact-card"><span>Distance</span><strong>{formatNumber(data.exoplanet.highlight.distance_pc, 1)} pc</strong></div>
              </div>
            </div>
          </div>
        ) : <p className="empty-copy">The Exoplanet Archive did not return a highlight.</p>}
      </ExpandedCosmicPanel>

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
