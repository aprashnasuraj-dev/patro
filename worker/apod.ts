export type ApodEnv = { CACHE?: any; NASA_API_KEY?: string };

const APOD_PRIMARY = "https://science.nasa.gov/wp-json/wp/v2/apod-basic/";
const APOD_LEGACY = "https://api.nasa.gov/planetary/apod";
const APOD_FALLBACK = "https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/Moon_2026_print.jpg";

function apodFallback(date: string, reason: string) {
  return {
    title: "Moon Phase Visualization (NASA SVS Fallback)",
    explanation: "High-resolution lunar visualization provided by NASA Goddard Scientific Visualization Studio while APOD is unavailable.",
    media_type: "image",
    source_media_type: "image",
    url: APOD_FALLBACK,
    hdurl: APOD_FALLBACK,
    date,
    copyright: "NASA / Goddard Space Flight Center Scientific Visualization Studio",
    is_fallback: true,
    fallback_reason: reason
  };
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.split("/").filter(Boolean)[0]?.slice(0,11) || null;
    if (u.hostname.includes("youtube.com")) {
      const q = u.searchParams.get("v");
      if (q) return q.slice(0,11);
      const parts = u.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex(x => ["embed","shorts","live"].includes(x));
      if (marker >= 0 && parts[marker + 1]) return parts[marker + 1].slice(0,11);
    }
  } catch {}
  return null;
}

async function loadApod(env: ApodEnv, date: string) {
  const cacheKey = "apod:" + date;
  if (env.CACHE) {
    try {
      const cached = await env.CACHE.get(cacheKey, "json");
      if (cached) return cached;
    } catch {}
  }

  const apiKey = env.NASA_API_KEY || "DEMO_KEY";
  let last = "NASA_APOD_UNAVAILABLE";
  for (const endpoint of [APOD_PRIMARY, APOD_LEGACY]) {
    const url = endpoint + "?api_key=" + encodeURIComponent(apiKey) + "&date=" + encodeURIComponent(date);
    try {
      const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6500) });
      if (!response.ok) throw new Error("NASA_HTTP_" + response.status);
      const raw: any = await response.json();
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (!data || String(data.date || "") !== date || !(data.hdurl || data.url)) throw new Error("NASA_DATE_OR_MEDIA_MISMATCH");

      const sourceMedia = data.media_type === "video" ? "video" : "image";
      let image = String(data.hdurl || data.url || "");
      if (sourceMedia === "video") {
        const id = youtubeId(String(data.url || ""));
        if (!id) { last = "non_youtube_video"; continue; }
        image = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
      }
      const normalized = {
        title: String(data.title || "Astronomy Picture of the Day"),
        explanation: String(data.explanation || "Astronomical view synchronized with the selected calendar date."),
        media_type: "image",
        source_media_type: sourceMedia,
        url: image,
        hdurl: image,
        date,
        copyright: String(data.copyright || "Public Domain / NASA"),
        is_fallback: false
      };
      if (env.CACHE) {
        try { await env.CACHE.put(cacheKey, JSON.stringify(normalized), { expirationTtl: 30 * 86400 }); } catch {}
      }
      return normalized;
    } catch (error) {
      last = String((error as Error)?.message || error);
    }
  }
  const fallback = apodFallback(date, last);
  if (env.CACHE) {
    try { await env.CACHE.put(cacheKey, JSON.stringify(fallback), { expirationTtl: 900 }); } catch {}
  }
  return fallback;
}


// APOD and cosmic requests arrive in parallel. Share upstream work within an
// isolate; KV shares completed results across edges. This is not a global lock.
const pending = new WeakMap<ApodEnv, Map<string, Promise<any>>>();
export function apod(env: ApodEnv, date: string): Promise<any> {
  let requests = pending.get(env);
  if (!requests) { requests = new Map(); pending.set(env, requests); }
  const existing = requests.get(date);
  if (existing) return existing;
  const result = loadApod(env, date).finally(() => requests!.delete(date));
  requests.set(date, result);
  return result;
}
