import type {WeatherDailyPayload} from "./types";
function condition(code: number) {
  if (code === 0) return { icon: "☀️", label: "Clear sky" };
  if (code === 1) return { icon: "🌤️", label: "Mainly clear" };
  if (code === 2) return { icon: "⛅", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Fog" };
  if ([51,53,55,56,57].includes(code)) return { icon: "🌦️", label: "Drizzle" };
  if ([61,63,65,66,67,80,81,82].includes(code)) return { icon: "🌧️", label: "Rain" };
  if ([71,73,75,77,85,86].includes(code)) return { icon: "🌨️", label: "Snow" };
  if ([95,96,99].includes(code)) return { icon: "⛈️", label: "Thunderstorm" };
  return { icon: "🌤️", label: "Mixed conditions" };
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}


export function normalizeWeather(raw:any,lat:number,lng:number,generatedAt=new Date().toISOString()):WeatherDailyPayload {
 const daily=raw?.daily,times:unknown[]=Array.isArray(daily?.time)?daily.time:[];
 if(!times.length)throw Error("weather_upstream_invalid");
  const values = <T = unknown>(key: string): T[] => Array.isArray(daily?.[key]) ? daily[key] : [];
  const codes = values<number>("weather_code");
  const maxT = values<number>("temperature_2m_max");
  const minT = values<number>("temperature_2m_min");
  const rainChance = values<number>("precipitation_probability_max");
  const precip = values<number>("precipitation_sum");

  const normalized: WeatherDailyPayload["days"] = times.map((value, index) => {
    const code = Number(codes[index] ?? -1);
    const mapped = condition(code);
    return {
      date: String(value),
      weather_code: code,
      icon: mapped.icon,
      label: mapped.label,
      temperature_max_c: numberOrNull(maxT[index]),
      temperature_min_c: numberOrNull(minT[index]),
      precipitation_probability_max: numberOrNull(rainChance[index]),
      precipitation_mm: numberOrNull(precip[index])
    };
  });

  return {
    ok: true,
    provider: "Open-Meteo",
    attribution: "Weather data by Open-Meteo",
    latitude: numberOrNull(raw?.latitude) ?? lat,
    longitude: numberOrNull(raw?.longitude) ?? lng,
    timezone: String(raw?.timezone || "Asia/Kathmandu"),
    generated_at: generatedAt,
    days: normalized
  };
}
