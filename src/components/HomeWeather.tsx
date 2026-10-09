import { useEffect, useState } from "react";
import { CloudSun, Droplets } from "lucide-react";
import { loadAutomaticWeatherForecast, type AutomaticWeather } from "../weather-client";
import { l } from "../useUiLanguage";

const labels: Record<string, string> = { "Clear sky": "सफा आकाश", "Mainly clear": "मुख्यतया सफा", "Partly cloudy": "आंशिक बदली", "Overcast": "बदली", "Fog": "कुहिरो", "Drizzle": "हल्का वर्षा", "Rain": "वर्षा", "Snow": "हिमपात", "Thunderstorm": "मेघगर्जन", "Mixed conditions": "मिश्रित मौसम" };
const temperature = (value: number | null) => value === null ? "—" : `${Math.round(value)}°`;

export function HomeWeather({ language }: { language: "ne" | "en"; today: string }) {
  const [forecast, setForecast] = useState<AutomaticWeather | null>(null);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { if (location.hash === "#home-weather") document.getElementById("home-weather")?.scrollIntoView({ block: "start" }); }, []);
  useEffect(() => {
    let active = true; setForecast(null); setError(false);
    loadAutomaticWeatherForecast().then(value => { if (active) setForecast(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [retry]);
  const timezone = forecast?.timezone || "Asia/Kathmandu";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const days = forecast?.days.filter(day => day.date >= today).slice(0, 7) || [];
  const first = days[0];
  return <section id="home-weather" className="hp-weather" aria-label={l(language, "मौसम पूर्वानुमान", "Weather forecast")}>
    <header><div><CloudSun size={23} aria-hidden="true"/><h2>{l(language, "मौसम", "Weather")}</h2>{forecast ? <span className="hp-weather-area" title={l(language, "अनुमानित क्षेत्र", "Approximate area")}>{forecast.location.label || l(language, "तपाईंको क्षेत्र", "Your area")}</span> : null}</div><small>{l(language, "दैनिक पूर्वानुमान", "Daily forecast")}</small></header>
    {first ? <div className="hp-weather-summary"><div className="hp-weather-now"><span aria-hidden="true">{first.icon}</span><div><strong>{temperature(first.temperature_max_c)}<small> / {temperature(first.temperature_min_c)}</small></strong><p>{language === "ne" ? labels[first.label] || first.label : first.label}</p></div></div><div className="hp-weather-rain"><Droplets size={17} aria-hidden="true"/><b>{first.precipitation_probability_max === null ? "—" : `${first.precipitation_probability_max}%`}</b><small>{l(language, "वर्षाको सम्भावना", "Chance of rain")}</small></div><div className="hp-weather-next">{days.slice(1, 4).map(day => <div key={day.date}><small>{new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en-GB", { weekday: "short", timeZone: timezone }).format(new Date(day.date + "T06:00:00Z"))}</small><span aria-hidden="true">{day.icon}</span><b>{temperature(day.temperature_max_c)}</b></div>)}</div></div> : <p className="hp-weather-status" role="status">{error ? l(language, "मौसम अहिले उपलब्ध छैन।", "Weather is unavailable right now.") : l(language, "मौसम खोल्दैछ…", "Loading forecast…")}{error ? <button type="button" onClick={() => setRetry(value => value + 1)}>{l(language, "फेरि प्रयास", "Retry")}</button> : null}</p>}
    {days.length ? <details className="hp-weather-week"><summary>{l(language, "७ दिनको पूर्वानुमान", "7-day forecast")} <span>＋</span></summary><div>{days.map(day => <article key={day.date}><b>{day.date === today ? l(language, "आज", "Today") : new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en-GB", { weekday: "short", timeZone: timezone }).format(new Date(day.date + "T06:00:00Z"))}</b><span aria-hidden="true">{day.icon}</span><strong>{temperature(day.temperature_max_c)} / {temperature(day.temperature_min_c)}</strong><small>{day.precipitation_probability_max === null ? "—" : `${day.precipitation_probability_max}%`}</small></article>)}</div><p>{l(language, "पूर्वानुमान परिवर्तन हुन सक्छ।", "Forecasts may change.")} <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p></details> : null}
  </section>;
}
