import { l } from "../../useUiLanguage";
import { formatLocalTime } from "./shared";

type Window = { start: Date; end: Date };
export type DayWindowRibbonData = {
  date: string; sunrise: Date; sunset: Date;
  abhijit: Window; rahu: Window; yama: Window; gulika: Window;
};
const CATEGORIES = [
  { key: "abhijit", ne: "अभिजित मुहूर्त", en: "Abhijit Muhurta", style: "auspicious" },
  { key: "rahu", ne: "राहुकाल", en: "Rahu Kalam", style: "caution" },
  { key: "yama", ne: "यमगण्ड", en: "Yamaganda", style: "yama" },
  { key: "gulika", ne: "गुलिक काल", en: "Gulika Kalam", style: "gulika" }
] as const;
export function MuhuratDayRibbon({ day, language, showCautions }: { day: DayWindowRibbonData; language: "ne" | "en"; showCautions: boolean }) {
  const start = day.sunrise.getTime(), end = day.sunset.getTime(), length = end - start;
  if (!(length > 0)) return null;
  const percent = (time: Date) => Math.max(0, Math.min(100, (time.getTime() - start) / length * 100));
  const visible = CATEGORIES.filter(item => showCautions || item.key === "abhijit");
  return <figure className="ap-pjw-muhurat-ribbon" aria-label={l(language, "स्थानीय समयखण्डको दृश्य", "Local daylight window visualization")}>
    <figcaption><strong>{l(language, "दिनको समयरेखा", "Daylight timeline")}</strong><small>{l(language, "काठमाडौं · स्थानीय सूर्योदयबाट", "Kathmandu · from local sunrise")}</small></figcaption>
    <div className="ap-pjw-ribbon-axis"><span>{formatLocalTime(day.sunrise, language)}</span><span>{l(language, "दिनमान", "Daylight")}</span><span>{formatLocalTime(day.sunset, language)}</span></div>
    <div className="ap-pjw-ribbon-track" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i} style={{left:((i+1)*12.5)+"%"}}/>)}</div>
    <div className="ap-pjw-ribbon-lanes">
      {visible.map(item => {
        const interval = day[item.key], from = percent(interval.start), to = percent(interval.end);
        return <div className="ap-pjw-ribbon-lane" key={item.key}>
          <span>{l(language,item.ne,item.en)}</span>
          <div className="ap-pjw-ribbon-lane-track" role="img" aria-label={l(language,item.ne,item.en)+": "+formatLocalTime(interval.start,language)+" – "+formatLocalTime(interval.end,language)}>
            <div className={"ap-pjw-ribbon-span is-"+item.style} style={{left:from+"%",width:Math.max(0,to-from)+"%"}}/>
          </div>
          <small>{formatLocalTime(interval.start,language)} – {formatLocalTime(interval.end,language)}</small>
        </div>;
      })}
    </div>
    <p>{l(language, "यो चित्र स्थानीय दिनमानको अनुपात हो, सम्पूर्ण दिनको स्वतः घोषित शुभ/अशुभ निर्णय होइन।", "These intervals are scaled to local daylight; this is not a blanket auspicious/inauspicious verdict for the whole day.")}</p>
  </figure>;
}
