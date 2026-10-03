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
  if (!tithi) return "तिथि गणना पूरा भएपछि यसको सांस्कृतिक सन्दर्भ यहाँ देखिन्छ।";
  if (tithi.tithi_index === 15) return "पूर्णिमा नेपाली परम्परामा पूजा, व्रत, तीर्थ र विभिन्न चन्द्र पर्वसँग जोडिने महत्त्वपूर्ण तिथि हो।";
  if (tithi.tithi_index === 30) return "औंसी नेपाली परम्परामा पितृस्मरण, पूजा र विभिन्न स्थानीय संस्कारसँग जोडिने तिथि हो।";
  if (tithi.tithi_name === "Ekadashi") return "एकादशीमा धेरै समुदायमा व्रत, साधना वा विशेष आहारको परम्परा पाइन्छ।";
  return `${tithi.tithi_name_ne} (${tithi.tithi_name}) ${tithi.paksha} पक्षको तिथि हो। चलन स्थान र परम्पराअनुसार फरक हुन सक्छ।`;
}

export function CosmicExperience({ data, apod, tithi, loading, error }: Props) {
  if (error && !data) {
    return (
      <section className="glass-panel cosmic-loading">
        <div>
          <p className="eyebrow">खगोलीय विवरण</p>
          <h2>यस मितिको विस्तृत आकाशीय जानकारी अहिले उपलब्ध छैन</h2>
          <p className="subheading">माथिका पात्रो र चन्द्रसम्बन्धी उपलब्ध विवरण भने हेर्न सक्नुहुन्छ।</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="cosmic-stack" aria-label="खगोलीय विवरण">
        <section className="cosmic-loading glass-panel">
          <span className="cosmic-loader" />
          <div>
            <p className="eyebrow">खगोलीय विवरण</p>
            <h2>आकाशीय जानकारी तयार हुँदैछ</h2>
            <p className="subheading">चन्द्र, पृथ्वी र अन्तरिक्षसम्बन्धी उपलब्ध विवरण चयन गरिएको मितिसँग मिलाइँदैछ।</p>
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
    <section className="cosmic-stack" aria-label="खगोलीय विवरण">
      <ExpandedCosmicPanel
        id="sky-this-day"
        eyebrow="स्रोत · NASA APOD"
        title="यस दिनको आकाश"
        icon="✦"
        badge={apod?.is_fallback ? "नजिकको उपलब्ध चित्र" : "NASA"}
        defaultOpen
      >
        <div className="sky-layout">
          <figure className="sky-feature">
            {apod?.url && <img src={apod.url} alt="" loading="lazy" decoding="async" />}
            <figcaption>
              <h3>{apod?.title || "आजको खगोलीय चित्र"}</h3>
              <p>{apod?.explanation || "यस मितिको चित्र विवरण उपलब्ध छैन।"}</p>
              <div className="source-row">
                <span>{apod?.date || data.requested_date}</span>
                {apod?.copyright && <span>{apod.copyright}</span>}
                {apod?.source_media_type === "video" && <span>भिडियोको प्रतिनिधि चित्र</span>}
              </div>
            </figcaption>
          </figure>

          <div className="media-strip">
            {data.related_media.items.length ? data.related_media.items.map((item) => (
              <article className="media-tile" key={item.nasa_id || item.preview_url}>
                <img src={item.preview_url} alt="" loading="lazy" decoding="async" />
                <div><strong>{item.title}</strong><small>{item.center || "NASA संग्रह"}</small></div>
              </article>
            )) : <p className="empty-copy">यस मितिसँग सम्बन्धित थप चित्र भेटिएन।</p>}
          </div>
        </div>
      </ExpandedCosmicPanel>

      <ExpandedCosmicPanel
        id="moon-tithi"
        eyebrow="चन्द्र गणना · नेपाली परम्परा"
        title="चन्द्र र तिथि"
        icon="☾"
        badge={tithi ? `${tithi.illumination_percent.toFixed(1)}% प्रकाश` : "गणना हुँदैछ"}
        defaultOpen
      >
        <div className="fact-grid">
          <div className="fact-card"><span>तिथि</span><strong>{tithi?.tithi_name_ne || "—"}</strong><small>{tithi?.tithi_name || ""}</small></div>
          <div className="fact-card"><span>पक्ष</span><strong>{tithi?.paksha || "—"}</strong></div>
          <div className="fact-card"><span>चन्द्र कोण</span><strong>{tithi ? `${tithi.phase_angle_deg.toFixed(2)}°` : "—"}</strong></div>
          <div className="fact-card"><span>अर्को तिथि</span><strong>{tithi?.time_to_next_tithi_minutes != null ? `${Math.round(tithi.time_to_next_tithi_minutes / 60 * 10) / 10} घण्टा` : "—"}</strong></div>
        </div>
        <div className="cultural-note"><strong>नेपाल सन्दर्भ</strong><p>{culturalNote(tithi)}</p></div>
        <p className="method-note">खगोलीय गणना र सांस्कृतिक व्याख्या अलग राखिएका छन्। संस्कारको ठ्याक्कै समयका लागि मान्य पञ्चाङ्ग वा सम्बन्धित परम्पराको आधिकारिक सन्दर्भ पनि हेर्नुहोस्।</p>
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
        eyebrow="स्रोत · NASA JPL"
        title="पृथ्वी नजिकका अन्तरिक्ष वस्तु"
        icon="◎"
        badge={`${data.neo.count} वस्तु`}
        defaultOpen
      >
        <div className="neo-layout">
          <NeoWsOrbitViz items={data.neo.items} />
          <div className="neo-list">
            <div className="mini-heading">
              <strong>नजिकका आगमन</strong>
              <span>{data.neo.hazardous_count} सम्भावित जोखिम चिन्ह भएका</span>
            </div>
            {data.neo.items.map((neo) => (
              <article className="neo-row" key={neo.id || neo.name}>
                <div>
                  <strong>{neo.name}</strong>
                  <small>अनुमानित व्यास {formatNumber(neo.diameter_m)} मिटर</small>
                </div>
                <div className="neo-row__numbers">
                  <b>{formatNumber(neo.miss_distance_km)} किमी</b>
                  <small>{formatNumber(neo.velocity_kph)} किमी/घण्टा</small>
                </div>
                {neo.hazardous && <span className="hazard-chip">सम्भावित जोखिम चिन्ह</span>}
              </article>
            ))}
          </div>
        </div>
      </ExpandedCosmicPanel>

      <SpaceWeatherPanel solar={data.solar} loading={loading} />

      <ExoplanetHighlight exoplanet={data.exoplanet} loading={loading} />

      <ExpandedCosmicPanel
        id="technology"
        eyebrow="NASA प्रविधि संग्रह"
        title="अन्तरिक्ष कार्यक्रमबाट विकसित प्रविधि"
        icon="⌁"
        badge="थप जानकारी"
      >
        <div className="technology-grid">
          {data.technology.items.length ? data.technology.items.map((item) => (
            <article key={item.id || item.title}>
              <span>{item.category || "NASA प्रविधि"}</span>
              <strong>{item.title}</strong>
              <p>{item.description || "यस प्रविधिको थप विवरण उपलब्ध छैन।"}</p>
            </article>
          )) : <p className="empty-copy">यस समय थप प्रविधि विवरण उपलब्ध छैन।</p>}
        </div>
      </ExpandedCosmicPanel>
    </section>
  );
}
