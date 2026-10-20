import type { TantraTimeResult } from "../../patro-tools/core/tantra/engine";
import { l } from "../../useUiLanguage";
import "./my-time.css";

type Props = { data: TantraTimeResult; language: "ne" | "en"; timezone: string };

function time(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
  } catch {
    return new Date(value).toISOString().slice(11, 16) + " UTC";
  }
}

export default function TantraVidyaWidget({ data, language, timezone }: Props) {
  const { nityaDevi, activeTatwa, tatwaRemainingMinutes, tatwaElapsedMinutes, tatwaWindow, yogini, mahanishaKaal } = data;
  const progress = Math.min(100, Math.max(0, (tatwaElapsedMinutes / 24) * 100));
  const attributesNe: Record<string, string> = {
    "Fulfillment of desires & creative impulse": "इच्छापूर्ति र सिर्जनात्मक प्रेरणा", "Attraction & solar radiance": "आकर्षण र सौर तेज", "Compassion & fluidity": "करुणा र सहज प्रवाह", "Protection & inner strength": "संरक्षण र आन्तरिक शक्ति", "Transformative fire energy": "रूपान्तरणकारी अग्नि ऊर्जा", "Indestructible clarity": "अविनाशी स्पष्टता", "Integration of Shiva/Shakti forces": "शिव–शक्ति तत्त्वको समन्वय", "Swift spiritual realization": "शीघ्र आध्यात्मिक अनुभूति", "Harmony in relationships & family": "सम्बन्ध र परिवारमा सामञ्जस्य", "Perpetual movement & rhythm": "निरन्तर गति र लय", "Victory over internal blockages": "आन्तरिक अवरोधमाथि विजय", "Success in Sadhana and work": "साधना र कर्ममा सफलता", "All-pervading auspiciousness": "सर्वव्यापी मङ्गल", "Purification through light": "प्रकाशद्वारा शुद्धीकरण", "Multidimensional expression & art": "बहुआयामिक अभिव्यक्ति र कला"
  };
  const recommendationsNe: Record<string, string> = {
    "Grounding, stability, building, physical work": "स्थिरता, आधार निर्माण र शारीरिक काम", "Fluidity, emotional work, social bonding, rest": "लचकता, भावनात्मक काम, सामाजिक सम्बन्ध र विश्राम", "Focus, transformation, athletic effort, sharp tasks": "एकाग्रता, रूपान्तरण, शारीरिक अभ्यास र तीक्ष्ण काम", "Intellectual work, movement, strategy, ideation": "बौद्धिक काम, गति, रणनीति र नयाँ विचार", "Meditation, inner Sadhana, solitude, silence": "ध्यान, आन्तरिक साधना, एकान्त र मौन"
  };
  const direction = (value: string) => {
    const ne: Record<string, string> = { East: "पूर्व", "South-East": "आग्नेय", South: "दक्षिण", "South-West": "नैऋत्य", West: "पश्चिम", "North-West": "वायव्य", North: "उत्तर", "North-East": "ईशान", Center: "केन्द्र", Above: "माथि", Below: "तल", "Center / Sky": "केन्द्र / आकाश" };
    return language === "ne" ? (ne[value] || value) : value;
  };
  return <section className="mt-panel mt-tantra-panel" aria-label={l(language, "तन्त्रविद्या कालचक्र", "Tantra Vidya Chronometry")}>
    <div className="mt-panel-head">
      <div><span className="mt-section-kicker">{l(language, "परम्परागत कालगणना", "TRADITIONAL CHRONOMETRY")}</span><h2>{l(language, "तन्त्रविद्या र सूक्ष्म समय", "Tantra Vidya & Subtle Time")}</h2></div>
      {mahanishaKaal.isActive && <span className="mt-tantra-active" role="status">{l(language, "महानिशा सक्रिय", "Mahanisha active")}</span>}
    </div>
    <div className="mt-tantra-devi">
      <span className="mt-tantra-om" aria-hidden="true">ॐ</span>
      <div className="mt-tantra-devi-copy">
        <div className="mt-tantra-name"><strong>{nityaDevi.name}</strong><span>{nityaDevi.sanskritName}</span></div>
        <small>{l(language, "पक्ष", "Paksha")}: {data.paksha === "Shukla" ? l(language, "शुक्ल पक्ष", "Shukla Paksha") : l(language, "कृष्ण पक्ष", "Krishna Paksha")} · {l(language, "नित्यादेवी", "Nitya Devi")} {nityaDevi.id}/15</small>
        <p className="mt-tantra-mantra">{nityaDevi.mantra}</p>
        <p>{l(language, attributesNe[nityaDevi.attribute] || nityaDevi.attribute, nityaDevi.attribute)}</p>
      </div>
    </div>
    <div className="mt-tatwa-card">
      <div className="mt-tatwa-top"><span>{l(language, "सक्रिय पञ्चतत्त्व तरङ्ग", "Active Pancha Tatwa wave")}</span><strong>{tatwaRemainingMinutes}{l(language, " मिनेट बाँकी", "m remaining")}</strong></div>
      <div className="mt-tatwa-name"><i style={{ backgroundColor: activeTatwa.color }} /><strong>{activeTatwa.name}</strong><span>{activeTatwa.element}</span></div>
      <div className="mt-tatwa-track" role="progressbar" aria-label={l(language, "तत्त्व चक्रको प्रगति", "Tatwa cycle progress")} aria-valuemin={0} aria-valuemax={24} aria-valuenow={tatwaElapsedMinutes}><span style={{ width: progress + "%", backgroundColor: activeTatwa.color }} /></div>
      <p>{l(language, recommendationsNe[activeTatwa.recommended] || activeTatwa.recommended, activeTatwa.recommended)}</p>
      <small>{time(tatwaWindow.start, timezone)}–{time(tatwaWindow.end, timezone)} · {l(language, "२४ मिनेटको परम्परागत चक्र", "traditional 24-minute segment")}</small>
    </div>
    <div className="mt-tantra-details">
      <div><small>{l(language, "योगिनी निवास", "Yogini Nivas")}</small><strong>{yogini.name} · {direction(yogini.direction)}</strong><span>{l(language, "यात्रामा परम्परागत रूपमा टारिने दिशा", "Traditionally avoided travel direction")}: {direction(yogini.blockedDirection)}</span><span>{l(language, "परम्परागत वर्ग", "Traditional classification")}: {l(language, yogini.nature === "Benign" ? "शुभ" : yogini.nature === "Mixed" ? "मिश्रित" : "उग्र", yogini.nature)}</span></div>
      <div><small>{l(language, "महानिशा काल", "Mahanisha window")}</small><strong>{time(mahanishaKaal.start, timezone)}–{time(mahanishaKaal.end, timezone)}</strong><span>{mahanishaKaal.isActive ? l(language, "यो समय खण्ड सक्रिय छ", "This window is active") : l(language, "रातको मध्यबिन्दु वरिपरि ±२४ मिनेट", "±24 minutes around the night midpoint")}</span></div>
    </div>
    <p className="mt-tantra-note">{l(language, "यो परम्परागत समयगणनाको व्याख्यात्मक मोडेल हो। नित्या नक्साङ्कन परम्पराअनुसार फरक हुन सक्छ; योगिनी दिशा एउटा सार्वजनिक परम्पराको हो। २४-मिनेट तत्त्व चक्र AafnaiPatro को सरलीकृत मोडेल हो, श्वासको मापन होइन।", "This is an interpretive model of traditional timing. Nitya mappings vary by convention; the Yogini direction table is one public tradition. The 24-minute Tatwa cycle is a simplified AafnaiPatro model, not a measured breath cycle.")}</p>
    <details className="mt-tantra-sources">
      <summary>{l(language, "खुला सन्दर्भ र परम्परागत भिन्नता", "Open references & tradition differences")}</summary>
      <ul>
        <li><a href="https://www.sanatanarahasya.com/lineages/sri-vidya/the-sacred-knowing/sv2-c4-the-court/" target="_blank" rel="noreferrer">Nitya names and Sri Vidya sequence</a></li>
        <li><a href="https://shrifreedom.org/vedic-astrology/tithi/" target="_blank" rel="noreferrer">Alternative Nitya–tithi pairings</a></li>
        <li><a href="https://swarayoga.org/indian-time" target="_blank" rel="noreferrer">Eight-Yogini Disha and tithi mapping</a></li>
        <li><a href="https://www.swarodaya.org/svara-tattva/" target="_blank" rel="noreferrer">Svarodaya tattva practice and durations</a></li>
      </ul>
      <small>{l(language, "यी खुला वेब सन्दर्भहरू तुलना गर्नका लागि हुन्; कुनै एकलाई सबै परम्पराको अन्तिम निर्णय मानिएको छैन।", "These open references are for comparison; none is treated as the final authority for every lineage.")}</small>
    </details>
  </section>;
}
