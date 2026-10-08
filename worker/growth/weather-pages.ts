/**
 * /weather/{city} — Nepal city weather pages (Nepali-first, bilingual), the biggest search demand in Nepal.
 *
 * Demand (Google Trends NP, 12 months, Oct 2026): "weather" ≈ 19× "hamro patro"; top queries
 * "tomorrow weather", "today weather", "weather kathmandu", "weather pokhara", "weather butwal",
 * "weather dhangadhi", "weather radar map" (+650%).
 *
 *   /weather              all cities: today + tomorrow (one Open-Meteo multi-location call)
 *   /weather/{city}       today, tomorrow, next 48 h, 16-day forecast with BS dates, sunrise/sunset
 *
 * Data: Open-Meteo (free, attribution required, no key). Cached 30 min at the edge by growth/index.ts.
 * Failure mode: upstream error → 503 + noindex + no-store (never cache or index an empty forecast).
 */
import { adToBs } from "../../packages/core/src/bsDate";
import { sunriseSunset as sunTimes } from "../../src/patro-tools/core/astro";
import { BS_MONTHS, toNepaliDigits, WEEKDAYS } from "../../src/patro-tools/core/names";
import { breadcrumbs, esc, notFound, redirect, shell, siteOrigin, type GrowthEnv } from "./html";

export interface NepalCity { slug: string; ne: string; en: string; lat: number; lon: number; province: string; }

export const NEPAL_WEATHER_CITIES: NepalCity[] = [
  { slug: "kathmandu", ne: "काठमाडौं", en: "Kathmandu", lat: 27.7172, lon: 85.324, province: "Bagmati" },
  { slug: "lalitpur", ne: "ललितपुर", en: "Lalitpur", lat: 27.6588, lon: 85.3247, province: "Bagmati" },
  { slug: "bhaktapur", ne: "भक्तपुर", en: "Bhaktapur", lat: 27.671, lon: 85.4298, province: "Bagmati" },
  { slug: "banepa", ne: "बनेपा", en: "Banepa", lat: 27.6298, lon: 85.5214, province: "Bagmati" },
  { slug: "hetauda", ne: "हेटौंडा", en: "Hetauda", lat: 27.4284, lon: 85.0322, province: "Bagmati" },
  { slug: "bharatpur", ne: "भरतपुर", en: "Bharatpur (Chitwan)", lat: 27.6833, lon: 84.4333, province: "Bagmati" },
  { slug: "charikot", ne: "चरिकोट", en: "Charikot", lat: 27.668, lon: 86.029, province: "Bagmati" },
  { slug: "pokhara", ne: "पोखरा", en: "Pokhara", lat: 28.2096, lon: 83.9856, province: "Gandaki" },
  { slug: "gorkha", ne: "गोरखा", en: "Gorkha", lat: 28.0, lon: 84.6333, province: "Gandaki" },
  { slug: "baglung", ne: "बागलुङ", en: "Baglung", lat: 28.2719, lon: 83.5898, province: "Gandaki" },
  { slug: "besisahar", ne: "बेसीसहर", en: "Besisahar", lat: 28.23, lon: 84.38, province: "Gandaki" },
  { slug: "jomsom", ne: "जोमसोम", en: "Jomsom", lat: 28.7804, lon: 83.723, province: "Gandaki" },
  { slug: "biratnagar", ne: "विराटनगर", en: "Biratnagar", lat: 26.4525, lon: 87.2718, province: "Koshi" },
  { slug: "dharan", ne: "धरान", en: "Dharan", lat: 26.8065, lon: 87.2846, province: "Koshi" },
  { slug: "itahari", ne: "इटहरी", en: "Itahari", lat: 26.6646, lon: 87.2718, province: "Koshi" },
  { slug: "damak", ne: "दमक", en: "Damak", lat: 26.6586, lon: 87.7016, province: "Koshi" },
  { slug: "birtamod", ne: "बिर्तामोड", en: "Birtamod", lat: 26.6436, lon: 87.9897, province: "Koshi" },
  { slug: "ilam", ne: "इलाम", en: "Ilam", lat: 26.9094, lon: 87.9282, province: "Koshi" },
  { slug: "namche-bazaar", ne: "नाम्चे बजार", en: "Namche Bazaar", lat: 27.805, lon: 86.714, province: "Koshi" },
  { slug: "janakpur", ne: "जनकपुर", en: "Janakpur", lat: 26.7288, lon: 85.9263, province: "Madhesh" },
  { slug: "birgunj", ne: "वीरगञ्ज", en: "Birgunj", lat: 27.0104, lon: 84.8771, province: "Madhesh" },
  { slug: "rajbiraj", ne: "राजविराज", en: "Rajbiraj", lat: 26.5395, lon: 86.7475, province: "Madhesh" },
  { slug: "lahan", ne: "लहान", en: "Lahan", lat: 26.72, lon: 86.48, province: "Madhesh" },
  { slug: "gaur", ne: "गौर", en: "Gaur", lat: 26.7667, lon: 85.2833, province: "Madhesh" },
  { slug: "kalaiya", ne: "कलैया", en: "Kalaiya", lat: 27.0333, lon: 85.0, province: "Madhesh" },
  { slug: "butwal", ne: "बुटवल", en: "Butwal", lat: 27.7006, lon: 83.4484, province: "Lumbini" },
  { slug: "bhairahawa", ne: "भैरहवा", en: "Bhairahawa (Siddharthanagar)", lat: 27.505, lon: 83.45, province: "Lumbini" },
  { slug: "lumbini", ne: "लुम्बिनी", en: "Lumbini", lat: 27.484, lon: 83.276, province: "Lumbini" },
  { slug: "tansen", ne: "तानसेन", en: "Tansen (Palpa)", lat: 27.8667, lon: 83.55, province: "Lumbini" },
  { slug: "nepalgunj", ne: "नेपालगञ्ज", en: "Nepalgunj", lat: 28.05, lon: 81.6167, province: "Lumbini" },
  { slug: "tulsipur", ne: "तुलसीपुर", en: "Tulsipur", lat: 28.131, lon: 82.297, province: "Lumbini" },
  { slug: "ghorahi", ne: "घोराही", en: "Ghorahi (Dang)", lat: 28.0333, lon: 82.4833, province: "Lumbini" },
  { slug: "surkhet", ne: "सुर्खेत", en: "Surkhet (Birendranagar)", lat: 28.6019, lon: 81.6339, province: "Karnali" },
  { slug: "jumla", ne: "जुम्ला", en: "Jumla", lat: 29.2747, lon: 82.1838, province: "Karnali" },
  { slug: "dhangadhi", ne: "धनगढी", en: "Dhangadhi", lat: 28.6846, lon: 80.6216, province: "Sudurpashchim" },
  { slug: "mahendranagar", ne: "महेन्द्रनगर", en: "Mahendranagar (Bhimdatta)", lat: 28.9667, lon: 80.1833, province: "Sudurpashchim" },
  { slug: "dadeldhura", ne: "डडेलधुरा", en: "Dadeldhura", lat: 29.3, lon: 80.5833, province: "Sudurpashchim" },
];
const BY_SLUG = new Map(NEPAL_WEATHER_CITIES.map((c) => [c.slug, c]));

const WMO: Record<number, [string, string, string]> = {
  0: ["☀️", "सफा आकाश", "Clear sky"], 1: ["🌤️", "मुख्यतया सफा", "Mainly clear"], 2: ["⛅", "आंशिक बदली", "Partly cloudy"], 3: ["☁️", "बदली", "Overcast"],
  45: ["🌫️", "हुस्सु", "Fog"], 48: ["🌫️", "हुस्सु", "Fog"], 51: ["🌦️", "सिमसिम पानी", "Light drizzle"], 53: ["🌦️", "सिमसिम पानी", "Drizzle"], 55: ["🌦️", "बाक्लो सिमसिम", "Dense drizzle"],
  61: ["🌧️", "हल्का वर्षा", "Light rain"], 63: ["🌧️", "वर्षा", "Rain"], 65: ["🌧️", "भारी वर्षा", "Heavy rain"], 80: ["🌦️", "छिटपुट वर्षा", "Rain showers"], 81: ["🌧️", "वर्षाका झरी", "Rain showers"], 82: ["⛈️", "अति भारी झरी", "Violent showers"],
  71: ["🌨️", "हल्का हिमपात", "Light snow"], 73: ["🌨️", "हिमपात", "Snow"], 75: ["🌨️", "भारी हिमपात", "Heavy snow"], 77: ["🌨️", "हिउँका कण", "Snow grains"], 85: ["🌨️", "हिमपात", "Snow showers"], 86: ["🌨️", "भारी हिमपात", "Heavy snow showers"],
  95: ["⛈️", "मेघगर्जनसहित वर्षा", "Thunderstorm"], 96: ["⛈️", "असिनासहित मेघगर्जन", "Thunderstorm with hail"], 99: ["⛈️", "असिनासहित मेघगर्जन", "Thunderstorm with hail"],
};
const wmo = (code: number) => WMO[code] ?? ["🌤️", "मिश्रित मौसम", "Mixed"];
const deg = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}°` : "—");
const pct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? `${Math.round(v)}%` : "—");
const mm = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)} mm` : "—");

function bsLabel(ad: string) {
  try {
    const b = adToBs(ad);
    return `${toNepaliDigits(b.day)} ${BS_MONTHS[b.month - 1]} ${toNepaliDigits(b.year)}`;
  } catch { return ""; }
}
function weekdayNe(ad: string) { return WEEKDAYS[new Date(ad + "T12:00:00Z").getUTCDay()]; }
function adShort(ad: string) { return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(ad + "T12:00:00Z")); }

/** Plain-language warning from forecast numbers (never invents an official alert). */
function rainNote(precip: number | null, prob: number | null, code: number) {
  if ([95, 96, 99].includes(code)) return { ne: "मेघगर्जन र चट्याङको सम्भावना — खुला ठाउँमा सावधानी।", en: "Thunderstorms possible — take care outdoors." };
  if (precip != null && precip >= 50) return { ne: "भारी वर्षाको सम्भावना — पहिरो/बाढी जोखिम भएका ठाउँमा यात्रा अघि आधिकारिक सूचना हेर्नुहोस्।", en: "Heavy rain likely — check official alerts before travelling in landslide/flood-prone areas." };
  if (prob != null && prob >= 60) return { ne: "छाता बोक्नुहोस्।", en: "Carry an umbrella." };
  return null;
}

async function openMeteo(params: Record<string, string>) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u.toString(), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error("open-meteo " + res.status);
  return res.json() as Promise<any>;
}

function unavailable() {
  return new Response("Weather temporarily unavailable · मौसम विवरण अहिले उपलब्ध छैन", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "retry-after": "120", "x-robots-tag": "noindex, nofollow" } });
}

const FOOT = `<p class="note">पूर्वानुमान: <a href="https://open-meteo.com/" rel="nofollow noopener">Open-Meteo</a> (weather data by Open-Meteo.com, CC BY 4.0) · ३० मिनेटमा अद्यावधिक। आधिकारिक चेतावनीका लागि <a href="https://www.dhm.gov.np/" rel="nofollow noopener">जल तथा मौसम विज्ञान विभाग</a> हेर्नुहोस्।</p>`;

async function cityPage(request: Request, env: GrowthEnv, city: NepalCity) {
  let data: any;
  try {
    data = await openMeteo({
      latitude: String(city.lat), longitude: String(city.lon), timezone: "Asia/Kathmandu", forecast_days: "16",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
      hourly: "temperature_2m,precipitation_probability,weather_code", forecast_hours: "48",
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    });
  } catch { return unavailable(); }
  const d = data?.daily; const times: string[] = d?.time || [];
  if (!times.length) return unavailable();
  const day = (i: number) => ({ date: times[i], code: Number(d.weather_code?.[i] ?? -1), max: d.temperature_2m_max?.[i], min: d.temperature_2m_min?.[i], prob: d.precipitation_probability_max?.[i] ?? null, precip: d.precipitation_sum?.[i] ?? null, sunrise: String(d.sunrise?.[i] || "").slice(11, 16), sunset: String(d.sunset?.[i] || "").slice(11, 16), uv: d.uv_index_max?.[i] });
  const today = day(0), tomorrow = day(1);
  const cur = data?.current || {};
  const [ci, cne, cen] = wmo(Number(cur.weather_code ?? today.code));
  const [ti, tne, ten] = wmo(tomorrow.code);
  const warnToday = rainNote(today.precip, today.prob, today.code);
  const warnTomorrow = rainNote(tomorrow.precip, tomorrow.prob, tomorrow.code);
  const hours: string[] = (data?.hourly?.time || []).map((t: string, i: number) => {
    if (i % 3 !== 0) return "";
    const [hi] = wmo(Number(data.hourly.weather_code?.[i] ?? -1));
    return `<tr><td>${esc(t.slice(5, 10))} ${esc(t.slice(11, 16))}</td><td>${hi} ${deg(data.hourly.temperature_2m?.[i])}</td><td>${pct(data.hourly.precipitation_probability?.[i])}</td></tr>`;
  }).filter(Boolean);
  const rows = times.map((_, i) => { const x = day(i); const [ic, ne] = wmo(x.code); return `<tr><td>${esc(bsLabel(x.date))}<div class="note">${esc(weekdayNe(x.date))} · ${esc(adShort(x.date))}</div></td><td>${ic} ${esc(ne)}</td><td>${deg(x.max)} / ${deg(x.min)}</td><td>${pct(x.prob)}</td><td>${mm(x.precip)}</td></tr>`; }).join("");
  const others = NEPAL_WEATHER_CITIES.filter((c) => c.slug !== city.slug);
  const path = `/weather/${city.slug}`;
  const crumbs: Array<[string, string]> = [["आफ्नै पात्रो", "/"], ["मौसम", "/weather"], [city.ne, path]];
  const body = `<p class="crumbs"><a href="/">आफ्नै पात्रो</a> › <a href="/weather">मौसम</a> › ${esc(city.ne)}</p>
<h1>${esc(city.ne)}को मौसम: आज र भोलि · ${esc(city.en)} Weather Today &amp; Tomorrow</h1>
<div class="answer"><p>अहिले ${esc(city.ne)}मा ${ci} <strong>${esc(cne)}</strong>, तापक्रम <strong>${deg(cur.temperature_2m)}</strong> (आर्द्रता ${pct(cur.relative_humidity_2m)})। आज अधिकतम ${deg(today.max)} / न्यूनतम ${deg(today.min)}, वर्षाको सम्भावना ${pct(today.prob)}।${warnToday ? ` <strong>${esc(warnToday.ne)}</strong>` : ""}</p>
<p><strong>भोलि (${esc(bsLabel(tomorrow.date))}, ${esc(weekdayNe(tomorrow.date))}):</strong> ${ti} ${esc(tne)}, ${deg(tomorrow.max)} / ${deg(tomorrow.min)}, वर्षा ${pct(tomorrow.prob)}।${warnTomorrow ? ` ${esc(warnTomorrow.ne)}` : ""}</p>
<p lang="en" class="note">Now: ${esc(cen)}, ${deg(cur.temperature_2m)}. Today ${deg(today.max)}/${deg(today.min)}, rain chance ${pct(today.prob)}. Tomorrow: ${esc(ten)}, ${deg(tomorrow.max)}/${deg(tomorrow.min)}, rain ${pct(tomorrow.prob)}.${warnTomorrow ? " " + esc(warnTomorrow.en) : ""}</p></div>
<section class="card grid"><div class="stat"><b>सूर्योदय · Sunrise</b><span>${esc(today.sunrise)}</span></div><div class="stat"><b>सूर्यास्त · Sunset</b><span>${esc(today.sunset)}</span></div><div class="stat"><b>हावा · Wind</b><span>${deg(cur.wind_speed_10m).replace("°", "")} km/h</span></div><div class="stat"><b>UV</b><span>${typeof today.uv === "number" ? today.uv.toFixed(0) : "—"}</span></div></section>
<section class="card"><h2>अर्को ४८ घण्टा · Next 48 hours</h2><div class="tablewrap"><table><thead><tr><th>समय</th><th>तापक्रम</th><th>वर्षा सम्भावना</th></tr></thead><tbody>${hours.join("")}</tbody></table></div></section>
<section class="card"><h2>१६ दिनको पूर्वानुमान (नेपाली मितिसहित)</h2><div class="tablewrap"><table><thead><tr><th>मिति</th><th>मौसम</th><th>अधिकतम / न्यूनतम</th><th>वर्षा सम्भावना</th><th>वर्षा</th></tr></thead><tbody>${rows}</tbody></table></div>${FOOT}</section>
<section class="card"><h2>अन्य शहरको मौसम</h2><p class="links">${others.map((c) => `<a href="/weather/${c.slug}">${esc(c.ne)}</a>`).join("")}</p><p class="links"><a href="/">आजको नेपाली पात्रो</a><a href="/moon/kathmandu">चन्द्रोदय · Moonrise</a></p></section>`;
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: `${city.en} weather today and tomorrow`, url: siteOrigin(env) + path, inLanguage: ["ne", "en"], dateModified: new Date().toISOString(),
      about: { "@type": "Place", name: city.en, alternateName: city.ne, geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lon } } },
    breadcrumbs(env, crumbs),
  ] };
  return shell(request, env, {
    lang: "ne",
    title: `${city.ne}को मौसम आज र भोलि · ${city.en} Weather Today, Tomorrow & 16 Days | आफ्नै पात्रो`,
    description: `${city.ne} (${city.en}) मौसम: अहिले ${cne} ${deg(cur.temperature_2m)}, भोलि ${tne} ${deg(tomorrow.max)}/${deg(tomorrow.min)}, वर्षा ${pct(tomorrow.prob)}। ४८ घण्टा र नेपाली मितिसहित १६ दिनको पूर्वानुमान।`,
    body, schema, sMaxAge: 1800, backend: "growth-weather-city",
  });
}

async function hubPage(request: Request, env: GrowthEnv) {
  let list: any[];
  try {
    const data = await openMeteo({
      latitude: NEPAL_WEATHER_CITIES.map((c) => c.lat).join(","), longitude: NEPAL_WEATHER_CITIES.map((c) => c.lon).join(","),
      timezone: "Asia/Kathmandu", forecast_days: "2", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    });
    list = Array.isArray(data) ? data : [data];
  } catch { return unavailable(); }
  if (list.length !== NEPAL_WEATHER_CITIES.length) return unavailable();
  const rows = NEPAL_WEATHER_CITIES.map((c, i) => {
    const d = list[i]?.daily || {};
    const cell = (k: number) => { const [ic, ne] = wmo(Number(d.weather_code?.[k] ?? -1)); return `${ic} ${esc(ne)} ${deg(d.temperature_2m_max?.[k])}/${deg(d.temperature_2m_min?.[k])} · ${pct(d.precipitation_probability_max?.[k])}`; };
    return `<tr><td><a href="/weather/${c.slug}">${esc(c.ne)}</a><div class="note">${esc(c.en)} · ${esc(c.province)}</div></td><td>${cell(0)}</td><td>${cell(1)}</td></tr>`;
  }).join("");
  const firstDate = list[0]?.daily?.time?.[1] || "";
  const body = `<p class="crumbs"><a href="/">आफ्नै पात्रो</a> › मौसम</p><h1>नेपालको मौसम: आज र भोलि · Nepal Weather Today &amp; Tomorrow</h1>
<div class="answer"><p>नेपालका ${NEPAL_WEATHER_CITIES.length} शहरको आज र भोलि${firstDate ? ` (${esc(bsLabel(firstDate))})` : ""}को मौसम, तापक्रम र वर्षाको सम्भावना। शहर छानेर ४८ घण्टा र १६ दिनको पूर्वानुमान हेर्नुहोस्।</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>शहर</th><th>आज</th><th>भोलि</th></tr></thead><tbody>${rows}</tbody></table></div>${FOOT}</section>`;
  return shell(request, env, {
    lang: "ne",
    title: "नेपालको मौसम आज र भोलि · Nepal Weather Today & Tomorrow (Kathmandu, Pokhara, Butwal…) | आफ्नै पात्रो",
    description: "काठमाडौं, पोखरा, विराटनगर, बुटवल, धनगढीसहित नेपालका शहरको आज र भोलिको मौसम, तापक्रम र वर्षा सम्भावना — नेपाली मितिसहित।",
    body, schema: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", name: "Nepal weather", url: siteOrigin(env) + "/weather", inLanguage: ["ne", "en"] }, breadcrumbs(env, [["आफ्नै पात्रो", "/"], ["मौसम", "/weather"]])] },
    sMaxAge: 1800, backend: "growth-weather-hub",
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Static mode (Cloudflare Free plan): pages are prerendered at build into dist/ and served as static assets
// (free, unlimited, no Worker request). The forecast is fetched by the visitor's browser straight from
// Open-Meteo (CORS-enabled, already allowed by the site's CSP connect-src). The server HTML still carries
// useful evergreen facts: the city, BS dates and exact sunrise/sunset for the next 7 days (astronomy-engine).
// ---------------------------------------------------------------------------------------------------------------

const NPT_TZ = "Asia/Kathmandu";
const hm = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: NPT_TZ, hour: "2-digit", minute: "2-digit" }).format(d);
const isoAdd = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const todayNpt = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: NPT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

function bsMap(fromIso: string, days: number) {
  const out: Record<string, string> = {};
  for (let i = -2; i < days; i++) { const d = isoAdd(fromIso, i); out[d] = `${bsLabel(d)} · ${weekdayNe(d)}`; }
  return out;
}

const WMO_NE: Record<number, [string, string]> = Object.fromEntries(Object.entries(WMO).map(([k, v]) => [k, [v[0], v[1]]]));

const CLIENT_JS = `(()=>{const C=JSON.parse(document.getElementById("wx-cfg").textContent);const W=C.wmo,B=C.bs;const w=c=>W[c]||["🌤️","मिश्रित मौसम"];const deg=v=>typeof v==="number"?Math.round(v)+"°":"—";const pc=v=>typeof v==="number"?Math.round(v)+"%":"—";
const u=new URL("https://api.open-meteo.com/v1/forecast");Object.entries(C.q).forEach(([k,v])=>u.searchParams.set(k,v));
fetch(u).then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{if(C.multi){const rows=document.querySelectorAll("[data-wx-i]");rows.forEach(tr=>{const d=(j[+tr.dataset.wxI]||{}).daily||{};[0,1].forEach(k=>{const td=tr.querySelector('[data-k="'+k+'"]');if(td){const x=w(d.weather_code&&d.weather_code[k]);td.textContent=x[0]+" "+x[1]+" "+deg(d.temperature_2m_max&&d.temperature_2m_max[k])+"/"+deg(d.temperature_2m_min&&d.temperature_2m_min[k])+" · "+pc(d.precipitation_probability_max&&d.precipitation_probability_max[k])}})});return}
const d=j.daily,c=j.current||{},cw=w(c.weather_code),t=w(d.weather_code[1]);
document.getElementById("wx-now").innerHTML="अहिले "+C.name+"मा "+cw[0]+" <strong>"+cw[1]+"</strong>, तापक्रम <strong>"+deg(c.temperature_2m)+"</strong> (आर्द्रता "+pc(c.relative_humidity_2m)+")। आज अधिकतम "+deg(d.temperature_2m_max[0])+" / न्यूनतम "+deg(d.temperature_2m_min[0])+", वर्षाको सम्भावना "+pc(d.precipitation_probability_max[0])+"।<br><strong>भोलि ("+(B[d.time[1]]||d.time[1])+"):</strong> "+t[0]+" "+t[1]+", "+deg(d.temperature_2m_max[1])+" / "+deg(d.temperature_2m_min[1])+", वर्षा "+pc(d.precipitation_probability_max[1])+"।"+([95,96,99].includes(d.weather_code[1])?" मेघगर्जन र चट्याङको सम्भावना — खुला ठाउँमा सावधानी।":(d.precipitation_sum[1]>=50?" भारी वर्षाको सम्भावना — यात्रा अघि आधिकारिक सूचना हेर्नुहोस्।":""));
const h=j.hourly||{time:[]};document.getElementById("wx-hours").innerHTML=h.time.map((tm,i)=>i%3?"":"<tr><td>"+tm.slice(5,10)+" "+tm.slice(11,16)+"</td><td>"+w(h.weather_code[i])[0]+" "+deg(h.temperature_2m[i])+"</td><td>"+pc(h.precipitation_probability[i])+"</td></tr>").join("");
document.getElementById("wx-days").innerHTML=d.time.map((dt,i)=>{const x=w(d.weather_code[i]);return "<tr><td>"+(B[dt]||dt)+"</td><td>"+x[0]+" "+x[1]+"</td><td>"+deg(d.temperature_2m_max[i])+" / "+deg(d.temperature_2m_min[i])+"</td><td>"+pc(d.precipitation_probability_max[i])+"</td><td>"+(typeof d.precipitation_sum[i]==="number"?d.precipitation_sum[i].toFixed(1)+" mm":"—")+"</td></tr>"}).join("")}).catch(()=>{const e=document.getElementById("wx-now");if(e)e.textContent="पूर्वानुमान अहिले लोड हुन सकेन। केही बेरपछि फेरि प्रयास गर्नुहोस्।"})})();`;

function staticCityPage(request: Request, env: GrowthEnv, city: NepalCity, now: Date) {
  const today = todayNpt(now);
  const sunRows = Array.from({ length: 7 }, (_, i) => {
    const d = isoAdd(today, i);
    try { const t = sunTimes(d, { lat: city.lat, lon: city.lon, tz: NPT_TZ }); return `<tr><td>${esc(bsLabel(d))}<div class="note">${esc(weekdayNe(d))} · ${esc(adShort(d))}</div></td><td>${hm(t.sunrise)}</td><td>${hm(t.sunset)}</td></tr>`; } catch { return ""; }
  }).join("");
  const cfg = { name: city.ne, wmo: WMO_NE, bs: bsMap(today, 40), multi: false, q: {
    latitude: String(city.lat), longitude: String(city.lon), timezone: NPT_TZ, forecast_days: "16",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    hourly: "temperature_2m,precipitation_probability,weather_code", forecast_hours: "48",
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m" } };
  const others = NEPAL_WEATHER_CITIES.filter((c) => c.slug !== city.slug);
  const path = `/weather/${city.slug}`;
  const crumbs: Array<[string, string]> = [["आफ्नै पात्रो", "/"], ["मौसम", "/weather"], [city.ne, path]];
  const body = `<p class="crumbs"><a href="/">आफ्नै पात्रो</a> › <a href="/weather">मौसम</a> › ${esc(city.ne)}</p>
<h1>${esc(city.ne)}को मौसम: आज र भोलि · ${esc(city.en)} Weather Today &amp; Tomorrow</h1>
<div class="answer"><p id="wx-now">${esc(city.ne)}को आज र भोलिको पूर्वानुमान लोड हुँदैछ…</p><noscript><p>पूर्वानुमान हेर्न JavaScript चाहिन्छ।</p></noscript></div>
<section class="card"><h2>अर्को ४८ घण्टा · Next 48 hours</h2><div class="tablewrap"><table><thead><tr><th>समय</th><th>तापक्रम</th><th>वर्षा सम्भावना</th></tr></thead><tbody id="wx-hours"></tbody></table></div></section>
<section class="card"><h2>१६ दिनको पूर्वानुमान (नेपाली मितिसहित)</h2><div class="tablewrap"><table><thead><tr><th>मिति</th><th>मौसम</th><th>अधिकतम / न्यूनतम</th><th>वर्षा सम्भावना</th><th>वर्षा</th></tr></thead><tbody id="wx-days"></tbody></table></div>${FOOT}</section>
<section class="card"><h2>सूर्योदय र सूर्यास्त · ${esc(city.en)} sunrise &amp; sunset</h2><div class="tablewrap"><table><thead><tr><th>मिति</th><th>सूर्योदय</th><th>सूर्यास्त</th></tr></thead><tbody>${sunRows}</tbody></table></div><p class="note">${esc(city.ne)} (${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°, ${esc(city.province)} प्रदेश) का लागि खगोलीय गणना, नेपाल समय।</p></section>
<section class="card"><h2>अन्य शहरको मौसम</h2><p class="links">${others.map((c) => `<a href="/weather/${c.slug}">${esc(c.ne)}</a>`).join("")}</p><p class="links"><a href="/">आजको नेपाली पात्रो</a><a href="/moon/kathmandu">चन्द्रोदय · Moonrise</a></p></section>
<script type="application/json" id="wx-cfg">${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script><script>${CLIENT_JS}</script>`;
  return shell(request, env, {
    lang: "ne",
    title: `${city.ne}को मौसम आज र भोलि · ${city.en} Weather Today, Tomorrow & 16 Days | आफ्नै पात्रो`,
    description: `${city.ne} (${city.en}) को आज र भोलिको मौसम, ४८ घण्टाको र नेपाली मितिसहित १६ दिनको पूर्वानुमान, सूर्योदय र सूर्यास्त।`,
    body, sMaxAge: 3600, backend: "growth-weather-city-static",
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "WebPage", name: `${city.en} weather today and tomorrow`, url: siteOrigin(env) + path, inLanguage: ["ne", "en"], about: { "@type": "Place", name: city.en, alternateName: city.ne, geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lon } } }, breadcrumbs(env, crumbs)] },
  });
}

function staticHubPage(request: Request, env: GrowthEnv) {
  const cfg = { name: "", wmo: WMO_NE, bs: {}, multi: true, q: {
    latitude: NEPAL_WEATHER_CITIES.map((c) => c.lat).join(","), longitude: NEPAL_WEATHER_CITIES.map((c) => c.lon).join(","),
    timezone: NPT_TZ, forecast_days: "2", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" } };
  const rows = NEPAL_WEATHER_CITIES.map((c, i) => `<tr data-wx-i="${i}"><td><a href="/weather/${c.slug}">${esc(c.ne)}</a><div class="note">${esc(c.en)} · ${esc(c.province)}</div></td><td data-k="0">…</td><td data-k="1">…</td></tr>`).join("");
  const body = `<p class="crumbs"><a href="/">आफ्नै पात्रो</a> › मौसम</p><h1>नेपालको मौसम: आज र भोलि · Nepal Weather Today &amp; Tomorrow</h1>
<div class="answer"><p>नेपालका ${NEPAL_WEATHER_CITIES.length} शहरको आज र भोलिको मौसम, तापक्रम र वर्षाको सम्भावना। शहर छानेर ४८ घण्टा र १६ दिनको पूर्वानुमान हेर्नुहोस्।</p></div>
<section class="card"><div class="tablewrap"><table><thead><tr><th>शहर</th><th>आज</th><th>भोलि</th></tr></thead><tbody>${rows}</tbody></table></div>${FOOT}</section>
<script type="application/json" id="wx-cfg">${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script><script>${CLIENT_JS}</script>`;
  return shell(request, env, {
    lang: "ne",
    title: "नेपालको मौसम आज र भोलि · Nepal Weather Today & Tomorrow (Kathmandu, Pokhara, Butwal…) | आफ्नै पात्रो",
    description: "काठमाडौं, पोखरा, विराटनगर, बुटवल, धनगढीसहित नेपालका शहरको आज र भोलिको मौसम, तापक्रम र वर्षा सम्भावना — नेपाली मितिसहित।",
    body, sMaxAge: 3600, backend: "growth-weather-hub-static",
    schema: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", name: "Nepal weather", url: siteOrigin(env) + "/weather", inLanguage: ["ne", "en"] }, breadcrumbs(env, [["आफ्नै पात्रो", "/"], ["मौसम", "/weather"]])] },
  });
}

export function weatherRoutes() {
  return ["/weather", ...NEPAL_WEATHER_CITIES.map((c) => `/weather/${c.slug}`)];
}

export async function weatherPageResponse(request: Request, env: GrowthEnv): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const raw = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const path = raw.toLowerCase();
  if (path !== "/weather" && !path.startsWith("/weather/")) return null;
  if (raw !== path) return redirect(request, path);
  const isStatic = env.GROWTH_STATIC === "1";
  if (path === "/weather") return isStatic ? staticHubPage(request, env) : hubPage(request, env);
  const city = BY_SLUG.get(path.slice("/weather/".length));
  if (!city) return notFound("Unknown city");
  return isStatic ? staticCityPage(request, env, city, new Date()) : cityPage(request, env, city);
}
