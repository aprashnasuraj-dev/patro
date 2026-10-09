import type { WeatherDailyPayload } from './types';
import {normalizeWeather} from './weather-normalize';
const forecasts=new Map<string,{until:number;promise:Promise<WeatherDailyPayload>}>();
const TTL=30*60_000;
export function loadWeatherForecast(lat=27.7172,lng=85.3240,timezone="Asia/Kathmandu"){
 const path=`/api/v1/weather/daily?days=16&lat=${lat}&lng=${lng}&timezone=${encodeURIComponent(timezone)}`,key=`patro.weather.v2:${lat}:${lng}:${timezone}`;
 const cached=forecasts.get(path);if(cached&&cached.until>Date.now())return cached.promise;
 const promise=(async()=>{
  try{const old=JSON.parse(sessionStorage.getItem(key)||'null');if(old?.until>Date.now()&&old.body?.ok&&Array.isArray(old.body.days)&&old.body.days.length)return old.body as WeatherDailyPayload;}catch{}
  let body:WeatherDailyPayload;
  try{
   const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(lat),longitude:String(lng),daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',timezone,forecast_days:'16'}).toString();
   const response=await fetch(url,{signal:AbortSignal.timeout(6500),headers:{accept:'application/json'}});if(!response.ok)throw Error('weather_upstream_unavailable');body=normalizeWeather(await response.json(),lat,lng);
  }catch{
   const response=await fetch(path,{headers:{accept:'application/json'}});if(!response.ok)throw Error('weather_unavailable');body=await response.json();if(!body.ok||!Array.isArray(body.days)||!body.days.length)throw Error('weather_unavailable');
  }
  try{sessionStorage.setItem(key,JSON.stringify({until:Date.now()+TTL,body}));}catch{}return body;
 })().catch(error=>{forecasts.delete(path);throw error;});forecasts.set(path,{until:Date.now()+TTL,promise});return promise;
}

export type AutomaticWeather = WeatherDailyPayload & { location: { label: string; approximate: true } };
let automatic: Promise<AutomaticWeather> | null = null;
let automaticUntil = 0;
export function loadAutomaticWeatherForecast(): Promise<AutomaticWeather> {
  if (automatic && automaticUntil > Date.now()) return automatic;
  automaticUntil = Date.now() + TTL;
  automatic = (async () => {
    const response = await fetch("/api/v1/weather/location", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(6500), headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("location_unavailable");
    const area = await response.json();
    if (!area.ok || !Number.isFinite(area.latitude) || Math.abs(area.latitude) > 90 || !Number.isFinite(area.longitude) || Math.abs(area.longitude) > 180) throw new Error("location_unavailable");
    const forecast = await loadWeatherForecast(area.latitude, area.longitude, area.timezone || "auto");
    return { ...forecast, location: { label: String(area.label || ""), approximate: true as const } };
  })().catch(error => { automatic = null; throw error; });
  return automatic;
}
