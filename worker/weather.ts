type WeatherDay = {
  date: string;
  weather_code: number;
  icon: string;
  label: string;
  temperature_max_c: number | null;
  temperature_min_c: number | null;
  precipitation_probability_max: number | null;
  precipitation_mm: number | null;
};

function json(body: unknown, status = 200, cache = "public, max-age=300, s-maxage=1800, stale-while-revalidate=7200") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}

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

export async function dailyWeatherResponse(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const lat = incoming.searchParams.get("lat") == null ? 27.7172 : Number(incoming.searchParams.get("lat"));
  const lng = incoming.searchParams.get("lng") == null ? 85.3240 : Number(incoming.searchParams.get("lng"));
  const days = Math.min(16, Math.max(1, Number(incoming.searchParams.get("days") || "16")));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return json({ ok:false, error:"invalid_lat" }, 400, "no-store");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return json({ ok:false, error:"invalid_lng" }, 400, "no-store");
  if (!Number.isInteger(days)) return json({ ok:false, error:"invalid_days" }, 400, "no-store");

  const upstream = new URL("https://api.open-meteo.com/v1/forecast");
  upstream.searchParams.set("latitude", String(lat));
  upstream.searchParams.set("longitude", String(lng));
  upstream.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum");
  upstream.searchParams.set("timezone", "Asia/Kathmandu");
  upstream.searchParams.set("forecast_days", String(days));

  let response: Response;
  try {
    response = await fetch(upstream.toString(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6500)
    });
  } catch {
    return json({ ok:false, error:"weather_upstream_unavailable", provider:"Open-Meteo" }, 502, "public, max-age=60, s-maxage=180");
  }

  if (!response.ok) {
    return json({ ok:false, error:"weather_upstream_http_" + response.status, provider:"Open-Meteo" }, 502, "public, max-age=60, s-maxage=180");
  }

  const raw: any = await response.json().catch(() => null);
  const daily = raw?.daily;
  const times: unknown[] = Array.isArray(daily?.time) ? daily.time : [];
  if (!times.length) return json({ ok:false, error:"weather_upstream_invalid", provider:"Open-Meteo" }, 502, "public, max-age=60, s-maxage=180");

  const values = <T = unknown>(key: string): T[] => Array.isArray(daily?.[key]) ? daily[key] : [];
  const codes = values<number>("weather_code");
  const maxT = values<number>("temperature_2m_max");
  const minT = values<number>("temperature_2m_min");
  const rainChance = values<number>("precipitation_probability_max");
  const precip = values<number>("precipitation_sum");

  const normalized: WeatherDay[] = times.map((value, index) => {
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

  return json({
    ok: true,
    provider: "Open-Meteo",
    attribution: "Weather data by Open-Meteo",
    latitude: numberOrNull(raw?.latitude) ?? lat,
    longitude: numberOrNull(raw?.longitude) ?? lng,
    timezone: String(raw?.timezone || "Asia/Kathmandu"),
    generated_at: new Date().toISOString(),
    days: normalized
  });
}
