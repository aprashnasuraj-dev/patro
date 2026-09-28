import { createClient } from "npm:@supabase/supabase-js@2";

const NASA_API_URL = "https://api.nasa.gov/planetary/apod";
const NASA_API_KEY = Deno.env.get("NASA_API_KEY") || "DEMO_KEY";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

const FALLBACK_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/Moon_2026_print.jpg";

export interface ApodNormalizedResponse {
  title: string;
  explanation: string;
  media_type: "image";
  source_media_type: "image" | "video";
  url: string;
  hdurl: string;
  date: string;
  copyright: string;
  is_fallback: boolean;
  fallback_reason?: string;
}

function fallback(date: string, reason: string): ApodNormalizedResponse {
  return {
    title: "Moon Phase Visualization (NASA SVS Fallback)",
    explanation: "High-resolution lunar visualization provided by NASA Goddard Scientific Visualization Studio while APOD is unavailable.",
    media_type: "image",
    source_media_type: "image",
    url: FALLBACK_URL,
    hdurl: FALLBACK_URL,
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
  } catch {
    // fall through to regex
  }
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|watch\?v=))([A-Za-z0-9_-]{11})/);
  return m?.[1] || null;
}

async function readCache(date: string): Promise<ApodNormalizedResponse | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("nasa_apod_cache")
    .select("payload")
    .eq("date", date)
    .maybeSingle();
  if (error || !data?.payload) return null;
  return data.payload as ApodNormalizedResponse;
}

async function writeCache(date: string, payload: ApodNormalizedResponse) {
  if (!supabase || payload.is_fallback) return;
  await supabase
    .from("nasa_apod_cache")
    .upsert({ date, payload, created_at: new Date().toISOString() }, { onConflict: "date" });
}

export async function fetchNasaApod(requestedDate?: string): Promise<ApodNormalizedResponse> {
  const targetDate = requestedDate || new Date().toISOString().slice(0,10);
  const cached = await readCache(targetDate);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const url = NASA_API_URL + "?api_key=" + encodeURIComponent(NASA_API_KEY) + "&date=" + encodeURIComponent(targetDate);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error("NASA_HTTP_" + response.status);

    const data: any = await response.json();
    let finalUrl = String(data.url || "");
    let finalHdUrl = String(data.hdurl || data.url || "");
    const sourceMedia: "image" | "video" = data.media_type === "video" ? "video" : "image";

    if (sourceMedia === "video") {
      const id = youtubeId(finalUrl);
      if (!id) return fallback(targetDate, "non_youtube_video");
      finalUrl = "https://img.youtube.com/vi/" + id + "/maxresdefault.jpg";
      finalHdUrl = finalUrl;
    }

    if (!finalUrl) throw new Error("NASA_EMPTY_MEDIA_URL");

    const normalized: ApodNormalizedResponse = {
      title: String(data.title || "Astronomy Picture of the Day"),
      explanation: String(data.explanation || "Astronomical view synchronized with the selected calendar date."),
      media_type: "image",
      source_media_type: sourceMedia,
      url: finalUrl,
      hdurl: finalHdUrl || finalUrl,
      date: String(data.date || targetDate),
      copyright: String(data.copyright || "Public Domain / NASA"),
      is_fallback: false
    };

    await writeCache(targetDate, normalized);
    return normalized;
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError"
      ? "timeout"
      : String((error as Error)?.message || "upstream_error");
    return fallback(targetDate, reason);
  } finally {
    clearTimeout(timeoutId);
  }
}
