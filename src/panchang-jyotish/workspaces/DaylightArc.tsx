import type { DayPanchang } from "../../patro-tools/core/types";
import { formatLocalTime, todayInNepal } from "./shared";
import { l } from "../../useUiLanguage";

type Props = { day: DayPanchang; language: "ne" | "en" };
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/**
 * A semantic, local-only solar dial. The arc represents the measured daylight duration;
 * the dot indicates current daylight progress only when the selected day is today in Nepal.
 */
export function DaylightArc({ day, language }: Props) {
  const duration = day.sunset.getTime() - day.sunrise.getTime();
  if (!(duration > 0)) return null;
  const isToday = day.date === todayInNepal();
  const progress = isToday ? clamp((Date.now() - day.sunrise.getTime()) / duration) : null;
  const point = progress === null ? null : {
    x: 160 - 117 * Math.cos(Math.PI * progress),
    y: 154 - 117 * Math.sin(Math.PI * progress)
  };
  const value = progress === null ? null : Math.round(progress * 100);
  return <figure className="ap-pjw-daylight" aria-label={l(language, "स्थानीय सूर्यको दिनमान", "Local solar daylight")}>
    <div className="ap-pjw-daylight-art">
      <svg viewBox="0 0 320 180" role="img" aria-label={progress === null ? l(language, "सूर्योदयदेखि सूर्यास्तसम्मको दिनमान", "Daylight arc from sunrise to sunset") : l(language, "आजको दिनमान प्रगति " + value + " प्रतिशत", "Today's daylight progress " + value + " percent")}>
        <defs><linearGradient id="ap-pjw-sun-gradient"><stop offset="0%" stopColor="#bc8435"/><stop offset="50%" stopColor="#dcb569"/><stop offset="100%" stopColor="#337b53"/></linearGradient></defs>
        <path d="M43 154 A117 117 0 0 1 277 154" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="13" strokeLinecap="round"/>
        <path d="M43 154 A117 117 0 0 1 277 154" fill="none" stroke="url(#ap-pjw-sun-gradient)" strokeWidth="9" strokeLinecap="round"/>
        <path d="M20 155 H300" stroke="currentColor" strokeOpacity=".18" strokeDasharray="4 6" strokeWidth="1"/>
        <circle cx="43" cy="154" r="6" fill="#337b53"/><circle cx="277" cy="154" r="6" fill="#bc8435"/>
        {point && <g><circle cx={point.x} cy={point.y} r="12" fill="#d7a24c" opacity=".22"/><circle cx={point.x} cy={point.y} r="6" fill="#bc8435" stroke="currentColor" strokeWidth="1"/></g>}
        <text x="160" y="113" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="700">{l(language, "स्थानीय दिनमान", "LOCAL DAYLIGHT")}</text>
        <text x="160" y="139" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="800">{Math.floor(duration / 3_600_000)}h {Math.floor(duration % 3_600_000 / 60_000)}m</text>
      </svg>
    </div>
    <figcaption className="ap-pjw-daylight-caption"><span><b>{l(language, "सूर्योदय", "Sunrise")}</b><strong>{formatLocalTime(day.sunrise, language)}</strong></span><span>{progress === null ? l(language, "छानिएको मितिको सूर्यचक्र", "Solar cycle for selected date") : l(language, "आजको वास्तविक घडीबाट", "Based on current local time")}</span><span><b>{l(language, "सूर्यास्त", "Sunset")}</b><strong>{formatLocalTime(day.sunset, language)}</strong></span></figcaption>
  </figure>;
}
