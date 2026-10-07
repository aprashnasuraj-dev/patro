import type { WeatherDailyPayload } from "./types";

const forecasts = new Map<string, { until: number; promise: Promise<WeatherDailyPayload> }>();
/** One shared request for the homepage and calendar icons; refresh on next use after 30 minutes. */
export function loadWeatherForecast(lat?: number, lng?: number) {
  const path = lat === undefined ? "/api/v1/weather/daily?days=16" : `/api/v1/weather/daily?days=16&lat=${lat}&lng=${lng}`;
  const cached = forecasts.get(path);
  if (cached && cached.until > Date.now()) return cached.promise;
  const promise = fetch(path, { headers: { accept: "application/json" } }).then(async response => {
    if (!response.ok) throw new Error("weather_unavailable");
    const body = await response.json() as WeatherDailyPayload;
    if (!body.ok || !Array.isArray(body.days) || !body.days.length) throw new Error("weather_unavailable");
    return body;
  }).catch(error => { forecasts.delete(path); throw error; });
  forecasts.set(path, { until: Date.now() + 30 * 60_000, promise });
  return promise;
}
