export type ApodEnv = { ARCHIVE?: any; NASA_API_KEY?: string };
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
    if ((u.hostname === "youtube.com" || u.hostname.endsWith(".youtube.com"))) {
      const q = u.searchParams.get("v");
      if (q) return q.slice(0,11);
      const parts = u.pathname.split("/").filter(Boolean);
      const marker = parts.findIndex(x => ["embed","shorts","live"].includes(x));
      if (marker >= 0 && parts[marker + 1]) return parts[marker + 1].slice(0,11);
    }
  } catch {}
  return null;
}

const APOD_CACHE_TTL = 30 * 86400;
const APOD_R2_PREFIX = "runtime/apod/v2";

function apodEdgeKey(date: string) {
  return new Request("https://aafnaipatro.com/__cache/apod-v2/" + encodeURIComponent(date), { method: "GET" });
}

async function readApodCache(env: ApodEnv, date: string) {
  if (typeof caches !== "undefined") {
    try {
      const hit = await caches.default.match(apodEdgeKey(date));
      if (hit) return await hit.json();
    } catch {}
  }
  if (env.ARCHIVE) {
    try {
      const object = await env.ARCHIVE.get(`${APOD_R2_PREFIX}/${date}.json`);
      if (object) {
        const stored: any = JSON.parse(await object.text());
        if (stored?.payload && Date.parse(String(stored.expires_at || "")) > Date.now()) {
          if (typeof caches !== "undefined") {
            try {
              await caches.default.put(
                apodEdgeKey(date),
                new Response(JSON.stringify(stored.payload), {
                  headers: {"content-type":"application/json; charset=utf-8","cache-control":`public, max-age=${Math.max(1, Math.floor((Date.parse(stored.expires_at) - Date.now()) / 1000))}`}
                })
              );
            } catch {}
          }
          return stored.payload;
        }
      }
    } catch {}
  }
  return null;
}

async function writeApodCache(env: ApodEnv, date: string, payload: any) {
  const ttl = payload.is_fallback ? 900 : APOD_CACHE_TTL;
  const body = JSON.stringify(payload);
  const writes: Promise<unknown>[] = [];
  if (typeof caches !== "undefined") {
    writes.push(caches.default.put(
      apodEdgeKey(date),
      new Response(body, {
        headers: {"content-type":"application/json; charset=utf-8","cache-control":`public, max-age=${ttl}`}
      })
    ));
  }
  if (env.ARCHIVE) {
    const now = Date.now();
    writes.push(env.ARCHIVE.put(
      `${APOD_R2_PREFIX}/${date}.json`,
      JSON.stringify({
        payload,
        stored_at:new Date(now).toISOString(),
        expires_at:new Date(now + ttl * 1000).toISOString()
      }),
      {
        httpMetadata:{contentType:"application/json"},
        customMetadata:{patro_cache:"apod-v2"}
      }
    ));
  }
  await Promise.allSettled(writes);
}

async function loadApod(env: ApodEnv, date: string) {
  const cached = await readApodCache(env, date);
  if (cached) return cached;

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
        if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) { last = "non_youtube_video"; continue; }
        image = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
      }
      if (new URL(image).protocol !== "https:") throw new Error("NASA_UNSAFE_MEDIA");
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
      await writeApodCache(env, date, normalized);
      return normalized;
    } catch (error) {
      last = String((error as Error)?.message || error);
    }
  }
  const fallback = apodFallback(date, last);
  await writeApodCache(env, date, fallback);
  return fallback;
}

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
