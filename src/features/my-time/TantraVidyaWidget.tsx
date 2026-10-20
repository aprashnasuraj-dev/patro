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
  const { nityaDevi, activeTatwa, tatwaRemainingMinutes, tatwaElapsedMinutes, tatwaWindow, yoginiDirection, mahanishaKaal } = data;
  const progress = Math.min(100, Math.max(0, (tatwaElapsedMinutes / 24) * 100));
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
        <p>{l(language, nityaDevi.attribute === "Fulfillment of desires & creative impulse" ? "इच्छापूर्ति र सिर्जनात्मक प्रेरणा" : nityaDevi.attribute, nityaDevi.attribute)}</p>
      </div>
    </div>
    <div className="mt-tatwa-card">
      <div className="mt-tatwa-top"><span>{l(language, "सक्रिय पञ्चतत्त्व तरङ्ग", "Active Pancha Tatwa wave")}</span><strong>{tatwaRemainingMinutes}{l(language, " मिनेट बाँकी", "m remaining")}</strong></div>
      <div className="mt-tatwa-name"><i style={{ backgroundColor: activeTatwa.color }} /><strong>{activeTatwa.name}</strong><span>{activeTatwa.element}</span></div>
      <div className="mt-tatwa-track" role="progressbar" aria-label={l(language, "तत्त्व चक्रको प्रगति", "Tatwa cycle progress")} aria-valuemin={0} aria-valuemax={24} aria-valuenow={tatwaElapsedMinutes}><span style={{ width: progress + "%", backgroundColor: activeTatwa.color }} /></div>
      <p>{l(language, activeTatwa.recommended === "Grounding, stability, building, physical work" ? "स्थिरता, आधार निर्माण र शारीरिक काम" : activeTatwa.recommended, activeTatwa.recommended)}</p>
      <small>{time(tatwaWindow.start, timezone)}–{time(tatwaWindow.end, timezone)} · {l(language, "२४ मिनेटको परम्परागत चक्र", "traditional 24-minute segment")}</small>
    </div>
    <div className="mt-tantra-details">
      <div><small>{l(language, "योगिनी निवास", "Yogini Nivas")}</small><strong>{direction(yoginiDirection)}</strong><span>{l(language, "तिथि-आधारित परम्परागत दिशा", "Traditional tithi-linked direction")}</span></div>
      <div><small>{l(language, "महानिशा काल", "Mahanisha window")}</small><strong>{time(mahanishaKaal.start, timezone)}–{time(mahanishaKaal.end, timezone)}</strong><span>{mahanishaKaal.isActive ? l(language, "यो समय खण्ड सक्रिय छ", "This window is active") : l(language, "रातको मध्यबिन्दु वरिपरि ±२४ मिनेट", "±24 minutes around the night midpoint")}</span></div>
    </div>
    <p className="mt-tantra-note">{l(language, "यो परम्परागत तान्त्रिक कालगणनाको व्याख्यात्मक मोडेल हो; सम्प्रदायअनुसार विधि फरक हुन सक्छ र यसलाई वैज्ञानिक रूपमा प्रमाणित ऊर्जा मापन नमान्नुहोस्।", "This is an interpretive model of traditional Tantric timing. Lineage conventions vary; these labels are not scientifically validated measurements of subtle energy.")}</p>
  </section>;
}
