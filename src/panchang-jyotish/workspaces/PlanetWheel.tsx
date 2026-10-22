import type { SiderealPlanetPosition } from "../../jyotish/jyotishEngine";
import { l } from "../../useUiLanguage";
import { FeatureGlyph } from "../FeatureGlyph";

const NE = ["मेष","वृष","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];
const EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const PLANET_ICON:Record<string,"sun"|"moon"|"saturn"|"node-axis"|"planet">={sun:"sun",moon:"moon",mars:"planet",mercury:"planet",jupiter:"planet",venus:"planet",saturn:"saturn",rahu:"node-axis",ketu:"node-axis"};
const PLANET = {sun:["सूर्य","Sun","☉"],moon:["चन्द्र","Moon","☽"],mars:["मङ्गल","Mars","♂"],mercury:["बुध","Mercury","☿"],jupiter:["बृहस्पति","Jupiter","♃"],venus:["शुक्र","Venus","♀"],saturn:["शनि","Saturn","♄"],rahu:["राहु","Rahu","☊"],ketu:["केतु","Ketu","☋"]} as const;
type Props = { positions: SiderealPlanetPosition[]; language: "ne" | "en"; };
const point = (angle: number, radius: number) => {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 180 + Math.cos(radians) * radius, y: 180 + Math.sin(radians) * radius };
};

/** Current snapshot visualization; not a chart of houses or a location-specific ascendant. */
export function PlanetWheel({positions,language}:Props) {
  return <figure className="ap-pjw-planet-figure" aria-label={l(language,"निरयण ग्रहस्थितिको चक्र","Sidereal planetary position wheel")}>
    <div className="ap-pjw-wheel-stage">
      <svg viewBox="0 0 360 360" role="img" aria-labelledby="ap-pjw-wheel-title ap-pjw-wheel-desc">
        <title id="ap-pjw-wheel-title">{l(language,"राशी र ग्रहस्थितिको चक्र","Zodiac and planetary wheel")}</title>
        <desc id="ap-pjw-wheel-desc">{l(language,"१२ राशिका बराबर ३० अंश खण्ड र नौ ग्रहका निरयण दीर्घांशको दृश्य। विवरण तलको तालिकामा पनि छ।","Twelve equal 30-degree sign sectors and nine sidereal planetary longitudes. Values are also available in the adjacent data table.")}</desc>
        <circle cx="180" cy="180" r="158" fill="none" stroke="currentColor" strokeOpacity=".24" strokeWidth="1.5"/>
        <circle cx="180" cy="180" r="119" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="1"/>
        <circle cx="180" cy="180" r="87" fill="none" stroke="currentColor" strokeOpacity=".1" strokeDasharray="3 5"/>
        {Array.from({length:12},(_,index)=>{
          const segment = index*30,p=point(segment,158),inner=point(segment,119),label=point(segment+15,140);
          return <g key={index}><line x1={inner.x} y1={inner.y} x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity=".20"/>
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="12" fontWeight="700">{index+1}</text>
          </g>;
        })}
        {positions.map((item,index)=>{
          const p=point(item.longitude,103-(index%3)*6);
          const meta=PLANET[item.key as keyof typeof PLANET];
          return <g key={item.key}>
            <line x1="180" y1="180" x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity=".12" strokeWidth="1"/>
            <circle cx={p.x} cy={p.y} r="10" fill="#247344" stroke="currentColor" strokeOpacity=".2" strokeWidth="1.8"/>
            <text x={p.x} y={p.y} fill="#ffffff" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="800">{meta?.[2] ?? "•"}</text>
          </g>;
        })}
        <circle cx="180" cy="180" r="42" fill="currentColor" fillOpacity=".045" stroke="currentColor" strokeOpacity=".12"/>
        <text x="180" y="177" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="800">{l(language,"निरयण","SIDEREAL")}</text>
        <text x="180" y="193" dominantBaseline="middle" textAnchor="middle" fill="currentColor" opacity=".7" fontSize="9">{l(language,"१२ राशि","12 SIGNS")}</text>
      </svg>
    </div>
    <figcaption><div className="ap-pjw-wheel-key">{positions.map(item=>{const meta=PLANET[item.key as keyof typeof PLANET];return <span key={item.key}><b><FeatureGlyph featureId="F046" symbol={PLANET_ICON[item.key]??"planet"} size="inline"/></b>{meta ? meta[language==="ne"?0:1] : item.name}<small>{(item.longitude%30).toFixed(1)}°</small></span>})}</div>
    <div className="ap-pjw-wheel-signs">{(language==="ne"?NE:EN).map((name,index)=><span key={name}><b>{index+1}</b> {name}</span>)}</div><p>{l(language,"यो ग्रहीय दीर्घांशको दृष्टान्त हो, जन्मपत्रोका भाव वा लग्नको नक्सा होइन। स्रोत पद्धति तलको तालिकामा प्रयोग भएको पद्धतिसँग एउटै छ।","This depicts sidereal longitudes, not houses or the ascendant in a birth chart. It uses the same position method as the table below.")}</p></figcaption>
  </figure>;
}
