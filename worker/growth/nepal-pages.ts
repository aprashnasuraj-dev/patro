/**
 * "Nepal for the world" (English): /nepal, /nepal/time, /nepal/year, /nepal/trek-weather[/{place}]
 *
 * Demand (Google Trends worldwide, 12 months): "time in nepal" > "nepal weather" > "everest base camp" > "nepal festival";
 * "everest base camp trek package" +300%, "everest base camp price" +130%.
 * Nepal's +5:45 offset and its calendar year (2083 BS) are well-known curiosities that travel well on social media.
 */
import { adToBs, bsToAd, daysInBsMonth } from "../../packages/core/src/bsDate";
import { nsFromAd } from "../../src/patro-tools/nepal-sambat/engine";
import { sunriseSunset } from "../../src/patro-tools/core/astro";
import { breadcrumbs, esc, notFound, redirect, shell, siteOrigin, type GrowthEnv } from "./html";

const NPT = "Asia/Kathmandu";
const BS_MONTHS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin (Asoj)", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const NAV = `<a href="/nepal">Nepal</a><a href="/nepal/time">Nepal time</a><a href="/nepal/year">Nepali year</a><a href="/nepal/trek-weather">Trek weather</a><a href="/moon">Moon</a><a href="/eclipse">Eclipses</a>`;
const FOOT = `Aafnai Patro is a Nepali calendar. Dates come from its validated Bikram Sambat archive; times from the IANA time-zone database. <a href="/">नेपाली पात्रो</a> · <a href="/methodology">Methodology</a>`;

const timeIn = (d: Date, tz: string, opts: Intl.DateTimeFormatOptions = {}) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", ...opts }).format(d);
const ymdIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function offsetMinutes(d: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Math.round((Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - Math.floor(d.getTime() / 60000) * 60000) / 60000);
}
const fmtDiff = (min: number) => `${min >= 0 ? "+" : "−"}${Math.floor(Math.abs(min) / 60)}h${Math.abs(min) % 60 ? ` ${Math.abs(min) % 60}m` : ""}`;

const WORLD = [
  ["New York", "America/New_York"], ["Chicago", "America/Chicago"], ["Denver", "America/Denver"], ["Los Angeles", "America/Los_Angeles"], ["Toronto", "America/Toronto"],
  ["London", "Europe/London"], ["Dublin", "Europe/Dublin"], ["Paris", "Europe/Paris"], ["Berlin", "Europe/Berlin"], ["Madrid", "Europe/Madrid"], ["Rome", "Europe/Rome"], ["Amsterdam", "Europe/Amsterdam"],
  ["Tel Aviv", "Asia/Jerusalem"], ["Dubai", "Asia/Dubai"], ["Doha", "Asia/Qatar"], ["New Delhi", "Asia/Kolkata"], ["Dhaka", "Asia/Dhaka"], ["Beijing", "Asia/Shanghai"], ["Tokyo", "Asia/Tokyo"], ["Seoul", "Asia/Seoul"],
  ["Sydney", "Australia/Sydney"], ["Melbourne", "Australia/Melbourne"], ["Auckland", "Pacific/Auckland"],
] as const;

function timePage(request: Request, env: GrowthEnv, now: Date) {
  const nptMin = offsetMinutes(now, NPT);
  const rows = WORLD.map(([name, tz]) => {
    const diff = nptMin - offsetMinutes(now, tz);
    // 9:00–20:00 Nepal time expressed in the other city's clock
    const nptDate = ymdIn(now, NPT);
    const nine = new Date(Date.parse(`${nptDate}T09:00:00Z`) - nptMin * 60000);
    const eight = new Date(Date.parse(`${nptDate}T20:00:00Z`) - nptMin * 60000);
    return `<tr><td>${esc(name)}</td><td>${esc(timeIn(now, tz, { weekday: "short" }))}</td><td>Nepal is ${esc(fmtDiff(diff))}</td><td class="note">${esc(timeIn(nine, tz))}–${esc(timeIn(eight, tz))}</td></tr>`;
  }).join("");
  const nptNow = timeIn(now, NPT, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const bs = adToBs(ymdIn(now, NPT));
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="/nepal">Nepal</a> › Time</p>
<h1>Current Time in Nepal</h1>
<div class="answer"><p>It is <strong id="npt">${esc(timeIn(now, NPT))}</strong> in Nepal now — ${esc(nptNow)} (Nepali date: ${bs.day} ${esc(BS_MONTHS_EN[bs.month - 1])} ${bs.year} BS).</p>
<p>Nepal Standard Time is <strong>UTC+5:45</strong>, one of the few time zones with a 45-minute offset. It is used all year — Nepal has no daylight saving time.</p></div>
<section class="card"><h2>Time difference from Nepal</h2><div class="tablewrap"><table><thead><tr><th>City</th><th>Local time now</th><th>Difference</th><th>Good time to call Nepal (9 am–8 pm NPT) in local time</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note" id="your-tz"></p><p class="note">Differences change when your country switches to or from daylight saving time.</p></section>
<script>(()=>{try{const now=new Date(),o=(tz)=>{const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(now),g=t=>+p.find(x=>x.type===t).value;return Math.round((Date.UTC(g("year"),g("month")-1,g("day"),g("hour"),g("minute"))-Math.floor(now/6e4)*6e4)/6e4)};const tz=Intl.DateTimeFormat().resolvedOptions().timeZone,d=o("Asia/Kathmandu")-o(tz),h=Math.floor(Math.abs(d)/60),m=Math.abs(d)%60;document.getElementById("your-tz").innerHTML="<strong>Your time zone ("+tz.replace(/_/g," ")+"):</strong> Nepal is "+(d>=0?"+":"−")+h+"h"+(m?" "+m+"m":"")+" from you."}catch(e){}})();</script>
<section class="card"><h2>Why +5:45?</h2><p>Five hours 45 minutes is the solar time of the 86°15′ E meridian, which runs through eastern Nepal (15° of longitude per hour). Nepal used UTC+5:30, the same as India, until it moved its clocks 15 minutes ahead on 1 January 1986, according to the IANA time-zone database used by computers and phones worldwide.</p></section>
<section class="card"><p class="links"><a href="/nepal/year">What year is it in Nepal?</a><a href="/nepal/trek-weather">Trek weather</a><a href="/">Today's Nepali calendar</a></p></section>
<script>(()=>{const el=document.getElementById("npt");if(!el)return;const f=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kathmandu",hour:"2-digit",minute:"2-digit"});const tick=()=>{el.textContent=f.format(new Date())};setInterval(tick,15000);})();</script>`;
  return shell(request, env, {
    title: `Time in Nepal Now (${timeIn(now, NPT)}) — Nepal Time Zone UTC+5:45 & Time Difference`,
    description: `Current time in Nepal: ${timeIn(now, NPT)} (UTC+5:45, no daylight saving). Time difference from New York, London, Sydney, Dubai and 20 more cities, and the best time to call Nepal.`,
    body, nav: NAV, footer: FOOT, sMaxAge: 60,
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: "Current time in Nepal", url: siteOrigin(env) + "/nepal/time", inLanguage: "en" }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Nepal", "/nepal"], ["Time", "/nepal/time"]])] },
    backend: "growth-nepal-time",
  });
}

function yearPage(request: Request, env: GrowthEnv, now: Date) {
  const today = ymdIn(now, NPT);
  const bs = adToBs(today);
  const months = BS_MONTHS_EN.map((m, i) => {
    let start = "", len = 0;
    try { start = bsToAd({ year: bs.year, month: i + 1, day: 1 }); len = daysInBsMonth(bs.year, i + 1); } catch { /* outside table */ }
    const label = start ? new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(start + "T12:00:00Z")) : "—";
    return `<tr${i + 1 === bs.month ? ' style="font-weight:600"' : ""}><td>${i + 1}. ${esc(m)}</td><td>${label}</td><td>${len || "—"}</td></tr>`;
  }).join("");
  // Month start dates for this and the next BS year, so the browser can show the right BS date between rebuilds.
  const monthStarts: Array<[number, number, string]> = [];
  for (const y of [bs.year, bs.year + 1]) for (let m = 1; m <= 12; m++) { try { monthStarts.push([y, m, bsToAd({ year: y, month: m, day: 1 })]); } catch { /* outside table */ } }
  let nsYear: number | string = "";
  try { nsYear = nsFromAd(today).year; } catch { nsYear = "—"; }
  const newYear = (() => { try { return bsToAd({ year: bs.year + 1, month: 1, day: 1 }); } catch { return ""; } })();
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="/nepal">Nepal</a> › Nepali year</p>
<h1>What Year Is It in Nepal? It's ${bs.year}</h1>
<div class="answer"><p>Today in Nepal is <strong id="bs-today">${bs.day} ${esc(BS_MONTHS_EN[bs.month - 1])} ${bs.year} BS</strong> (${esc(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(today + "T12:00:00Z")))}).</p>
<p>Nepal's official calendar, <strong>Bikram Sambat (BS)</strong>, runs about 56 years and 8 months ahead of the Gregorian calendar. ${newYear ? `The next Nepali New Year (1 Baisakh ${bs.year + 1}) is on ${esc(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(newYear + "T12:00:00Z")))}.` : ""}</p></div>
<section class="card"><h2>The months of ${bs.year} BS</h2><div class="tablewrap"><table><thead><tr><th>Month</th><th>Starts (Gregorian)</th><th>Days</th></tr></thead><tbody>${months}</tbody></table></div>
<p class="note">Bikram Sambat months follow the Sun's movement through the zodiac, so they have 29 to 32 days and change from year to year. Nepal publishes the official month lengths each year.</p></section>
<section class="card"><h2>How Nepal uses it</h2><p>Government offices, schools, newspapers, citizenship papers and passports in Nepal use BS dates. The weekend is Saturday. Many festivals, such as Dashain and Tihar, follow the lunar calendar instead, so their Gregorian dates move each year. Newar communities also keep Nepal Sambat, a lunar calendar now in the year ${nsYear} NS.</p>
<script type="application/json" id="bs-starts">${JSON.stringify(monthStarts)}</script>
<script>(()=>{try{const S=JSON.parse(document.getElementById("bs-starts").textContent),M=${JSON.stringify(BS_MONTHS_EN)},t=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());let cur=null;for(const s of S){if(s[2]<=t)cur=s}if(!cur)return;const day=Math.round((Date.parse(t)-Date.parse(cur[2]))/864e5)+1;document.getElementById("bs-today").textContent=day+" "+M[cur[1]-1]+" "+cur[0]+" BS"}catch(e){}})();</script>
<p class="links"><a href="/convert">Convert any BS ↔ AD date</a><a href="/">Today's Nepali calendar</a><a href="/festivals">Nepal festivals</a><a href="/nepal/time">Time in Nepal</a></p></section>`;
  return shell(request, env, {
    title: `What Year Is It in Nepal? ${bs.year} BS — Nepali Calendar Explained`,
    description: `Nepal is in the year ${bs.year}. Today is ${bs.day} ${BS_MONTHS_EN[bs.month - 1]} ${bs.year} BS. How the Bikram Sambat calendar works, its months and when the Nepali New Year falls.`,
    body, nav: NAV, footer: FOOT, sMaxAge: 3600,
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `What year is it in Nepal? ${bs.year}`, url: siteOrigin(env) + "/nepal/year", inLanguage: "en" }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Nepal", "/nepal"], ["Nepali year", "/nepal/year"]])] },
    backend: "growth-nepal-year",
  });
}

export interface TrekPlace { slug: string; name: string; trek: string; lat: number; lon: number; elev: number; }
export const TREK_PLACES: TrekPlace[] = [
  { slug: "lukla", name: "Lukla", trek: "Everest Base Camp", lat: 27.6869, lon: 86.7314, elev: 2860 },
  { slug: "namche-bazaar", name: "Namche Bazaar", trek: "Everest Base Camp", lat: 27.805, lon: 86.714, elev: 3440 },
  { slug: "tengboche", name: "Tengboche", trek: "Everest Base Camp", lat: 27.8361, lon: 86.7642, elev: 3867 },
  { slug: "dingboche", name: "Dingboche", trek: "Everest Base Camp", lat: 27.8925, lon: 86.8317, elev: 4410 },
  { slug: "lobuche", name: "Lobuche", trek: "Everest Base Camp", lat: 27.9483, lon: 86.8103, elev: 4940 },
  { slug: "gorak-shep", name: "Gorak Shep", trek: "Everest Base Camp", lat: 27.9806, lon: 86.8292, elev: 5164 },
  { slug: "everest-base-camp", name: "Everest Base Camp", trek: "Everest Base Camp", lat: 28.0026, lon: 86.8528, elev: 5364 },
  { slug: "ghorepani", name: "Ghorepani (Poon Hill)", trek: "Poon Hill", lat: 28.4, lon: 83.7, elev: 2874 },
  { slug: "annapurna-base-camp", name: "Annapurna Base Camp", trek: "Annapurna Base Camp", lat: 28.5304, lon: 83.878, elev: 4130 },
  { slug: "manang", name: "Manang", trek: "Annapurna Circuit", lat: 28.6667, lon: 84.0167, elev: 3519 },
  { slug: "thorong-la", name: "Thorong La Pass", trek: "Annapurna Circuit", lat: 28.7943, lon: 83.9384, elev: 5416 },
  { slug: "muktinath", name: "Muktinath", trek: "Annapurna Circuit", lat: 28.8167, lon: 83.8714, elev: 3800 },
  { slug: "kyanjin-gompa", name: "Kyanjin Gompa", trek: "Langtang", lat: 28.2117, lon: 85.5617, elev: 3870 },
];
const TREK = new Map(TREK_PLACES.map((p) => [p.slug, p]));
const f = (c: unknown) => (typeof c === "number" && Number.isFinite(c) ? `${Math.round(c)}°C / ${Math.round(c * 9 / 5 + 32)}°F` : "—");
const WX: Record<number, string> = { 0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, hail" };

async function trekPage(request: Request, env: GrowthEnv, p: TrekPlace) {
  let d: any;
  try {
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    const q: Record<string, string> = {
      latitude: String(p.lat), longitude: String(p.lon), elevation: String(p.elev), timezone: NPT, forecast_days: "10",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_min,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset",
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    };
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
    const r = await fetch(u.toString(), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(7000) });
    if (!r.ok) throw new Error(String(r.status));
    d = await r.json();
  } catch {
    return new Response("Forecast temporarily unavailable", { status: 503, headers: { "cache-control": "no-store", "retry-after": "120", "x-robots-tag": "noindex, nofollow" } });
  }
  const t: string[] = d?.daily?.time || [];
  if (!t.length) return new Response("Forecast temporarily unavailable", { status: 503, headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
  const day = (i: number) => `<tr><td>${esc(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(t[i] + "T12:00:00Z")))}</td><td>${esc(WX[d.daily.weather_code?.[i]] || "—")}</td><td>${f(d.daily.temperature_2m_max?.[i])}</td><td>${f(d.daily.temperature_2m_min?.[i])}<div class="note">feels ${f(d.daily.apparent_temperature_min?.[i])}</div></td><td>${d.daily.snowfall_sum?.[i] ? `${d.daily.snowfall_sum[i].toFixed(1)} cm snow` : `${(d.daily.precipitation_sum?.[i] ?? 0).toFixed(1)} mm`}<div class="note">${d.daily.precipitation_probability_max?.[i] ?? "—"}%</div></td><td>${Math.round(d.daily.wind_speed_10m_max?.[i] ?? 0)} km/h<div class="note">gusts ${Math.round(d.daily.wind_gusts_10m_max?.[i] ?? 0)}</div></td></tr>`;
  const rows = t.map((_, i) => day(i)).join("");
  const others = TREK_PLACES.filter((x) => x.slug !== p.slug);
  const path = `/nepal/trek-weather/${p.slug}`;
  const ft = Math.round(p.elev * 3.28084).toLocaleString("en-US");
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="/nepal">Nepal</a> › <a href="/nepal/trek-weather">Trek weather</a> › ${esc(p.name)}</p>
<h1>${esc(p.name)} Weather (${p.elev.toLocaleString("en-US")} m / ${ft} ft): 10-Day Forecast</h1>
<div class="answer"><p>Now at ${esc(p.name)}: <strong>${esc(WX[d.current?.weather_code] || "—")}, ${f(d.current?.temperature_2m)}</strong> (feels like ${f(d.current?.apparent_temperature)}), wind ${Math.round(d.current?.wind_speed_10m ?? 0)} km/h.</p>
<p>Tonight's low ${f(d.daily.temperature_2m_min?.[0])}, feels like ${f(d.daily.apparent_temperature_min?.[0])}. Sunrise ${esc(String(d.daily.sunrise?.[0] || "").slice(11, 16))}, sunset ${esc(String(d.daily.sunset?.[0] || "").slice(11, 16))} Nepal time.</p></div>
<section class="card"><h2>10-day forecast at ${p.elev.toLocaleString("en-US")} m</h2><div class="tablewrap"><table><thead><tr><th>Day</th><th>Weather</th><th>High</th><th>Low</th><th>Rain / snow</th><th>Wind</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Forecast computed for the camp's altitude (${p.elev} m) on the ${esc(p.trek)} route; coordinates are approximate. Mountain weather changes fast — check with your guide or lodge, and turn back if conditions worsen. Weather data by <a href="https://open-meteo.com/" rel="nofollow noopener">Open-Meteo.com</a> (CC BY 4.0).</p></section>
<section class="card"><h2>Other places on Nepal's trekking routes</h2><p class="links">${others.map((x) => `<a href="/nepal/trek-weather/${x.slug}">${esc(x.name)}</a>`).join("")}</p><p class="links"><a href="/nepal/time">Time in Nepal</a><a href="/festivals">Nepal festival dates</a></p></section>`;
  return shell(request, env, {
    title: `${p.name} Weather Forecast (${p.elev} m) — 10 Days, Snow, Wind & Night Temperatures`,
    description: `${p.name} (${p.elev} m, ${p.trek}) weather: now ${WX[d.current?.weather_code] || ""} ${f(d.current?.temperature_2m)}. 10-day forecast at camp altitude with night lows, feels-like, snow and wind in °C and °F.`,
    body, nav: NAV, footer: FOOT, sMaxAge: 3600,
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `${p.name} weather`, url: siteOrigin(env) + path, inLanguage: "en", about: { "@type": "Place", name: p.name, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon, elevation: p.elev } } }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Nepal", "/nepal"], ["Trek weather", "/nepal/trek-weather"], [p.name, path]])] },
    backend: "growth-nepal-trek",
  });
}

// Static mode (Cloudflare Free plan): forecast fetched by the visitor's browser from Open-Meteo at the camp's altitude.
const TREK_JS = `(()=>{const C=JSON.parse(document.getElementById("trek-cfg").textContent);const W=C.wx;const f=c=>typeof c==="number"?Math.round(c)+"°C / "+Math.round(c*9/5+32)+"°F":"—";
const u=new URL("https://api.open-meteo.com/v1/forecast");Object.entries(C.q).forEach(([k,v])=>u.searchParams.set(k,v));
fetch(u).then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{const d=j.daily,c=j.current||{};
document.getElementById("trek-now").innerHTML="Now at "+C.name+": <strong>"+(W[c.weather_code]||"—")+", "+f(c.temperature_2m)+"</strong> (feels like "+f(c.apparent_temperature)+"), wind "+Math.round(c.wind_speed_10m||0)+" km/h. Tonight's low "+f(d.temperature_2m_min[0])+", feels like "+f((d.apparent_temperature_min||[])[0])+".";
document.getElementById("trek-days").innerHTML=d.time.map((t,i)=>"<tr><td>"+new Date(t+"T12:00:00Z").toLocaleDateString("en-GB",{timeZone:"UTC",weekday:"short",day:"numeric",month:"short"})+"</td><td>"+(W[d.weather_code[i]]||"—")+"</td><td>"+f(d.temperature_2m_max[i])+"</td><td>"+f(d.temperature_2m_min[i])+"<div class=note>feels "+f((d.apparent_temperature_min||[])[i])+"</div></td><td>"+((d.snowfall_sum||[])[i]?d.snowfall_sum[i].toFixed(1)+" cm snow":((d.precipitation_sum||[])[i]||0).toFixed(1)+" mm")+"<div class=note>"+((d.precipitation_probability_max||[])[i]??"—")+"%</div></td><td>"+Math.round((d.wind_speed_10m_max||[])[i]||0)+" km/h<div class=note>gusts "+Math.round((d.wind_gusts_10m_max||[])[i]||0)+"</div></td></tr>").join("")}).catch(()=>{document.getElementById("trek-now").textContent="The forecast could not load right now. Please try again in a few minutes."})})();`;

function trekStaticPage(request: Request, env: GrowthEnv, p: TrekPlace, now: Date) {
  const today = ymdIn(now, NPT);
  const sun = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.parse(today + "T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10);
    try { const t = sunriseSunset(d, { lat: p.lat, lon: p.lon, tz: NPT, height: p.elev }); return `<tr><td>${esc(new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(d + "T12:00:00Z")))}</td><td>${timeIn(t.sunrise, NPT)}</td><td>${timeIn(t.sunset, NPT)}</td></tr>`; } catch { return ""; }
  }).join("");
  const cfg = { name: p.name, wx: WX, q: { latitude: String(p.lat), longitude: String(p.lon), elevation: String(p.elev), timezone: NPT, forecast_days: "10",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_min,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max",
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m" } };
  const others = TREK_PLACES.filter((x) => x.slug !== p.slug);
  const path = `/nepal/trek-weather/${p.slug}`;
  const ft = Math.round(p.elev * 3.28084).toLocaleString("en-US");
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="/nepal">Nepal</a> › <a href="/nepal/trek-weather">Trek weather</a> › ${esc(p.name)}</p>
<h1>${esc(p.name)} Weather (${p.elev.toLocaleString("en-US")} m / ${ft} ft): 10-Day Forecast</h1>
<div class="answer"><p id="trek-now">Loading the forecast for ${esc(p.name)} at ${p.elev.toLocaleString("en-US")} m…</p><noscript><p>The live forecast needs JavaScript.</p></noscript></div>
<section class="card"><h2>10-day forecast at ${p.elev.toLocaleString("en-US")} m</h2><div class="tablewrap"><table><thead><tr><th>Day</th><th>Weather</th><th>High</th><th>Low</th><th>Rain / snow</th><th>Wind</th></tr></thead><tbody id="trek-days"></tbody></table></div>
<p class="note">Forecast computed for the camp's altitude (${p.elev} m) on the ${esc(p.trek)} route; coordinates are approximate. Mountain weather changes fast — check with your guide or lodge, and turn back if conditions worsen. Weather data by <a href="https://open-meteo.com/" rel="nofollow noopener">Open-Meteo.com</a> (CC BY 4.0).</p></section>
<section class="card"><h2>Sunrise and sunset at ${esc(p.name)} (Nepal time)</h2><div class="tablewrap"><table><thead><tr><th>Day</th><th>Sunrise</th><th>Sunset</th></tr></thead><tbody>${sun}</tbody></table></div><p class="note">Astronomical times for a flat horizon; mountains around the valley delay the visible sunrise.</p></section>
<section class="card"><h2>Other places on Nepal's trekking routes</h2><p class="links">${others.map((x) => `<a href="/nepal/trek-weather/${x.slug}">${esc(x.name)}</a>`).join("")}</p><p class="links"><a href="/nepal/time">Time in Nepal</a><a href="/festivals">Nepal festival dates</a></p></section>
<script type="application/json" id="trek-cfg">${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script><script>${TREK_JS}</script>`;
  return shell(request, env, {
    title: `${p.name} Weather Forecast (${p.elev} m) — 10 Days, Snow, Wind & Night Temperatures`,
    description: `${p.name} (${p.elev} m, ${p.trek}) weather: 10-day forecast at camp altitude with night lows, feels-like, snow and wind in °C and °F, plus sunrise and sunset.`,
    body, nav: NAV, footer: FOOT, sMaxAge: 3600, backend: "growth-nepal-trek-static",
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `${p.name} weather`, url: siteOrigin(env) + path, inLanguage: "en", about: { "@type": "Place", name: p.name, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon, elevation: p.elev } } }, breadcrumbs(env, [["Aafnai Patro", "/"], ["Nepal", "/nepal"], ["Trek weather", "/nepal/trek-weather"], [p.name, path]])] },
  });
}

function trekHub(request: Request, env: GrowthEnv) {
  const groups = [...new Set(TREK_PLACES.map((p) => p.trek))].map((trek) => `<div class="card"><h2>${esc(trek)}</h2><table><tbody>${TREK_PLACES.filter((p) => p.trek === trek).sort((a, b) => a.elev - b.elev).map((p) => `<tr><td><a href="/nepal/trek-weather/${p.slug}">${esc(p.name)}</a></td><td class="note">${p.elev.toLocaleString("en-US")} m</td></tr>`).join("")}</tbody></table></div>`).join("");
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › <a href="/nepal">Nepal</a> › Trek weather</p><h1>Nepal Trekking Weather by Altitude</h1>
<div class="answer"><p>10-day forecasts computed at the real altitude of each village, camp and pass on the Everest, Annapurna and Langtang treks — with night lows, wind and snow in °C and °F.</p></div><section class="grid">${groups}</section>`;
  return shell(request, env, { title: "Nepal Trekking Weather: Everest Base Camp, Annapurna & Langtang Forecasts by Altitude", description: "10-day weather forecasts at the altitude of Lukla, Namche, Gorak Shep, Everest Base Camp, Annapurna Base Camp, Thorong La, Manang and Kyanjin Gompa.", body, nav: NAV, footer: FOOT, sMaxAge: 86_400, backend: "growth-nepal-trek-hub" });
}

function hub(request: Request, env: GrowthEnv, now: Date) {
  const bs = adToBs(ymdIn(now, NPT));
  const body = `<p class="crumbs"><a href="/">Aafnai Patro</a> › Nepal</p><h1>Nepal: Time, Calendar and Mountain Weather</h1>
<div class="answer"><p>It is <strong>${esc(timeIn(now, NPT))}</strong> in Nepal (UTC+5:45) on <strong>${bs.day} ${esc(BS_MONTHS_EN[bs.month - 1])} ${bs.year} BS</strong>.</p></div>
<section class="grid"><div class="card"><h2><a href="/nepal/time">Time in Nepal</a></h2><p>Current time, the +5:45 offset explained, time difference from 23 cities.</p></div>
<div class="card"><h2><a href="/nepal/year">Nepal is in ${bs.year}</a></h2><p>How the Bikram Sambat calendar works and this year's months.</p></div>
<div class="card"><h2><a href="/nepal/trek-weather">Trek weather</a></h2><p>Forecasts at altitude for Everest, Annapurna and Langtang.</p></div>
<div class="card"><h2><a href="/festivals">Festivals</a></h2><p>Dates of Dashain, Tihar, Holi and more from Nepal's official list.</p></div></section>`;
  return shell(request, env, { title: "Nepal Time, Calendar & Trekking Weather | Aafnai Patro", description: `Current time in Nepal, today's Nepali date (${bs.year} BS), and forecasts at altitude for Nepal's trekking routes.`, body, nav: NAV, footer: FOOT, sMaxAge: 300, backend: "growth-nepal-hub" });
}

export function nepalRoutes() {
  return ["/nepal", "/nepal/time", "/nepal/year", "/nepal/trek-weather", ...TREK_PLACES.map((p) => `/nepal/trek-weather/${p.slug}`)];
}

export async function nepalPageResponse(request: Request, env: GrowthEnv, now = new Date()): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const raw = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const path = raw.toLowerCase();
  if (path !== "/nepal" && !path.startsWith("/nepal/")) return null;
  if (raw !== path) return redirect(request, path);
  if (path === "/nepal") return hub(request, env, now);
  if (path === "/nepal/time") return timePage(request, env, now);
  if (path === "/nepal/year") return yearPage(request, env, now);
  if (path === "/nepal/trek-weather") return trekHub(request, env);
  const m = path.match(/^\/nepal\/trek-weather\/([a-z-]+)$/);
  const p = m ? TREK.get(m[1]) : undefined;
  if (!p) return notFound();
  return env.GROWTH_STATIC === "1" ? trekStaticPage(request, env, p, now) : trekPage(request, env, p);
}
