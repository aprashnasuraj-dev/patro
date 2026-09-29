const TE = new TextEncoder();
const TD = new TextDecoder();

const RADIO_BROWSER_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info"
];

const MAX_REDIRECTS = 6;
const MAX_MANIFEST_BYTES = 1_048_576;
const COUNTRY_CACHE_MS = 15 * 60_000;

let HMAC_KEY: CryptoKey | null = null;
let COUNTRY_CACHE: { at: number; rows: Array<{ code: string; name: string; count: number }> } | null = null;

type RadioBrowserStation = {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  languagecodes?: string;
  codec?: string;
  bitrate?: number;
  hls?: number | boolean;
  votes?: number;
  clickcount?: number;
  lastcheckok?: number | boolean;
  lastchecktime_iso8601?: string;
};

function text(value: unknown, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function privateHost(raw: string) {
  const h = raw.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "metadata.google.internal"
  ) return true;

  if (h.includes(":")) {
    return h === "::1" || h.startsWith("fc") || h.startsWith("fd") ||
      h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb");
  }

  const a = h.split(".").map(Number);
  if (a.length === 4 && a.every((x) => Number.isInteger(x) && x >= 0 && x <= 255)) {
    const [x, y] = a;
    return x === 0 || x === 10 || x === 127 ||
      (x === 100 && y >= 64 && y <= 127) ||
      (x === 169 && y === 254) ||
      (x === 172 && y >= 16 && y <= 31) ||
      (x === 192 && y === 168) ||
      (x === 198 && (y === 18 || y === 19)) ||
      x >= 224;
  }
  return false;
}

function safeUrl(raw: string, base?: string) {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new Error("invalid_radio_stream_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported_radio_protocol");
  if (url.username || url.password) throw new Error("credentials_not_allowed");
  if (privateHost(url.hostname)) throw new Error("radio_stream_target_blocked");
  return url;
}

function b64u(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function unb64u(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey() {
  if (HMAC_KEY) return HMAC_KEY;
  const secret =
    Deno.env.get("RADIO_RELAY_SECRET") ||
    Deno.env.get("TV_RELAY_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "";
  if (!secret) throw new Error("radio_relay_secret_unavailable");
  HMAC_KEY = await crypto.subtle.importKey(
    "raw",
    TE.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return HMAC_KEY;
}

async function sign(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), TE.encode(value)));
  return b64u(bytes);
}

async function verify(value: string, signature: string) {
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(), unb64u(signature), TE.encode(value));
  } catch {
    return false;
  }
}

async function signedStreamPath(raw: string) {
  const target = safeUrl(raw).toString();
  const packed = b64u(TE.encode(target));
  const signature = await sign(packed);
  return "/api/v1/radio/stream?u=" + encodeURIComponent(packed) + "&s=" + encodeURIComponent(signature);
}

function regionName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

async function rbFetch(path: string) {
  let lastError: unknown = null;
  const offset = Math.floor(Date.now() / 60_000) % RADIO_BROWSER_SERVERS.length;
  for (let i = 0; i < RADIO_BROWSER_SERVERS.length; i++) {
    const base = RADIO_BROWSER_SERVERS[(i + offset) % RADIO_BROWSER_SERVERS.length];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(base + path, {
        headers: {
          accept: "application/json",
          "user-agent": "NepaliPatro/2.1 (+https://patro-blush.vercel.app)"
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error("radio_browser_" + response.status);
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("radio_browser_unavailable");
}

async function countryFacets() {
  const now = Date.now();
  if (COUNTRY_CACHE && now - COUNTRY_CACHE.at < COUNTRY_CACHE_MS) return COUNTRY_CACHE.rows;
  const raw = await rbFetch("/json/countrycodes?hidebroken=true&order=stationcount&reverse=true&limit=300");
  const rows = (Array.isArray(raw) ? raw : [])
    .map((row: any) => {
      const code = text(row?.name, 2).toUpperCase();
      const count = Math.max(0, Number(row?.stationcount) || 0);
      return { code, name: regionName(code), count };
    })
    .filter((row: any) => /^[A-Z]{2}$/.test(row.code) && row.count > 0);
  COUNTRY_CACHE = { at: now, rows };
  return rows;
}

async function localNepalStations() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRole) return [];

  const select = [
    "slug","name_ne","name_en","frequency_mhz","district_id","city","languages",
    "website","logo_url","stream_format","stream_status","stream_url","category","last_ok_at"
  ].join(",");
  const url = supabaseUrl + "/rest/v1/fm_stations?select=" + encodeURIComponent(select) +
    "&stream_status=eq.verified&stream_url=not.is.null&limit=500";

  try {
    const response = await fetch(url, {
      headers: {
        apikey: serviceRole,
        authorization: "Bearer " + serviceRole,
        accept: "application/json"
      },
      signal: AbortSignal.timeout(4_000)
    });
    if (!response.ok) return [];
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function dedupeKey(name: string, url: string) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
  return name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "") + "|" + host;
}

async function browserItem(row: RadioBrowserStation) {
  const source = text(row.url_resolved || row.url, 2048);
  if (!source) return null;
  let safe: URL;
  try { safe = safeUrl(source); } catch { return null; }
  if (!(row.lastcheckok === true || Number(row.lastcheckok) === 1)) return null;

  const code = text(row.countrycode, 2).toUpperCase();
  const languages = text(row.language, 300).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
  const languageCodes = text(row.languagecodes, 120).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
  const tags = text(row.tags, 300).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
  const name = text(row.name, 160) || "Live Radio";
  const isHls = row.hls === true || Number(row.hls) === 1 || /\.m3u8(?:$|\?)/i.test(safe.toString());
  return {
    id: "rb:" + text(row.stationuuid, 80),
    name,
    name_ne: name,
    country: code || "XX",
    country_name: code ? regionName(code) : "International",
    province: text(row.state, 100) || (code ? regionName(code) : "International"),
    district: text(row.state, 100) || "Online",
    genre: tags.join(" · ") || "Radio",
    languages,
    language_codes: languageCodes,
    codec: text(row.codec, 30).toUpperCase() || (isHls ? "HLS" : "AUDIO"),
    bitrate_kbps: Math.max(0, Number(row.bitrate) || 0) || undefined,
    logo: text(row.favicon, 1000) || undefined,
    website: text(row.homepage, 1000) || undefined,
    stream: await signedStreamPath(safe.toString()),
    source_stream: safe.toString(),
    status: "verified-live",
    playable: true,
    media_type: isHls ? "hls" : "audio",
    verified: true,
    source: "Radio Browser",
    votes: Math.max(0, Number(row.votes) || 0),
    clickcount: Math.max(0, Number(row.clickcount) || 0),
    last_ok_at: text(row.lastchecktime_iso8601, 64) || undefined
  };
}

async function localItem(row: any) {
  const source = text(row?.stream_url, 2048);
  if (!source) return null;
  let safe: URL;
  try { safe = safeUrl(source); } catch { return null; }
  const name = text(row?.name_en || row?.name_ne || row?.slug, 160) || "Nepal FM";
  const isHls = text(row?.stream_format, 32).toLowerCase() === "hls" || /\.m3u8(?:$|\?)/i.test(safe.toString());
  return {
    id: "local:" + text(row?.slug, 120),
    name,
    name_ne: text(row?.name_ne, 160) || name,
    country: "NP",
    country_name: "Nepal",
    province: text(row?.city, 100) || "Nepal",
    district: text(row?.district_id || row?.city, 100) || "Nepal",
    genre: text(row?.category, 120) || "Radio",
    languages: Array.isArray(row?.languages) ? row.languages.slice(0, 6) : [],
    language_codes: [],
    codec: text(row?.stream_format, 30).toUpperCase() || (isHls ? "HLS" : "AUDIO"),
    bitrate_kbps: undefined,
    logo: text(row?.logo_url, 1000) || undefined,
    website: text(row?.website, 1000) || undefined,
    stream: await signedStreamPath(safe.toString()),
    source_stream: safe.toString(),
    status: "verified-live",
    playable: true,
    media_type: isHls ? "hls" : "audio",
    verified: true,
    source: "Patro verified",
    votes: 0,
    clickcount: 0,
    last_ok_at: text(row?.last_ok_at, 64) || undefined
  };
}

function json(body: unknown, status = 200, cache = "public, max-age=60, s-maxage=300, stale-while-revalidate=900") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff"
    }
  });
}

export async function radioCatalogResponse(request: Request) {
  const url = new URL(request.url);
  const countryRaw = text(url.searchParams.get("country") || "NP", 3).toUpperCase();
  const country = countryRaw === "ALL" ? "ALL" : (/^[A-Z]{2}$/.test(countryRaw) ? countryRaw : "NP");
  const query = text(url.searchParams.get("q") || "", 120);
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const limit = Math.max(12, Math.min(80, Number(url.searchParams.get("limit")) || 60));

  const [facets, localRaw] = await Promise.all([
    countryFacets().catch(() => []),
    country === "NP" ? localNepalStations().catch(() => []) : Promise.resolve([])
  ]);

  // A stale/bad row or temporary DB failure must not take down the entire directory.
  const localRows = (await Promise.all(
    localRaw.map((row: any) => localItem(row).catch(() => null))
  )).filter(Boolean) as any[];
  const remoteOffset = Math.max(0, (page - 1) * limit - localRows.length);
  const remoteLimit = page === 1 ? Math.min(120, limit + localRows.length + 20) : Math.min(100, limit + 20);

  const params = new URLSearchParams({
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    offset: String(remoteOffset),
    limit: String(remoteLimit)
  });
  if (country !== "ALL") params.set("countrycode", country);
  if (query) params.set("name", query);

  let remoteRaw: RadioBrowserStation[] = [];
  let directoryWarning: string | null = null;
  try {
    const raw = await rbFetch("/json/stations/search?" + params.toString());
    remoteRaw = Array.isArray(raw) ? raw : [];
  } catch {
    directoryWarning = "global_radio_directory_temporarily_unavailable";
  }

  // Isolate per-station signing/parsing failures so one malformed upstream record
  // cannot turn a usable directory response into HTTP 500.
  const remoteRows = (await Promise.all(
    remoteRaw.map((row) => browserItem(row).catch(() => null))
  )).filter(Boolean) as any[];
  const combined = page === 1 && country === "NP" ? [...localRows, ...remoteRows] : remoteRows;
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const row of combined) {
    const key = dedupeKey(row.name, row.source_stream || "");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= limit) break;
  }

  const countryTotal = country === "ALL"
    ? facets.reduce((sum, row) => sum + row.count, 0)
    : (facets.find((row) => row.code === country)?.count || 0) + (country === "NP" ? localRows.length : 0);
  const total = query ? Math.max((page - 1) * limit + unique.length + (remoteRaw.length >= remoteLimit ? 1 : 0), unique.length) : countryTotal;
  const hasMore = remoteRaw.length >= remoteLimit;
  const pages = query
    ? Math.max(page, hasMore ? page + 1 : page)
    : Math.max(1, Math.ceil(Math.max(total, unique.length) / limit));

  return json({
    ok: true,
    source: "Patro verified + Radio Browser",
    directory_warning: directoryWarning,
    country,
    query,
    total,
    page,
    pages,
    page_size: limit,
    has_more: hasMore,
    verified_total: unique.length,
    items: unique,
    facets: { countries: facets }
  });
}

function requestHeaders(request: Request) {
  const headers = new Headers({
    accept: request.headers.get("accept") || "audio/mpeg,audio/aac,application/ogg,application/vnd.apple.mpegurl,application/x-mpegURL,*/*",
    "icy-metadata": "0",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36 NepaliPatroRadio/2.1"
  });
  const range = request.headers.get("range");
  if (range && /^bytes=\d*-\d*(?:,\d*-\d*)?$/i.test(range)) headers.set("range", range);
  return headers;
}

async function fetchSafe(start: URL, headers: Headers, signal: AbortSignal) {
  let target = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const response = await fetch(target, { method: "GET", headers, redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: target };
      if (i === MAX_REDIRECTS) throw new Error("radio_redirect_limit");
      target = safeUrl(location, target.toString());
      continue;
    }
    return { response, finalUrl: target };
  }
  throw new Error("radio_redirect_limit");
}

async function readTextLimited(response: Response) {
  const declared = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > MAX_MANIFEST_BYTES) throw new Error("radio_manifest_too_large");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_MANIFEST_BYTES) {
      await reader.cancel("radio_manifest_too_large").catch(() => undefined);
      throw new Error("radio_manifest_too_large");
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

async function rewriteManifest(body: string, base: URL) {
  const output: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      output.push(line);
      continue;
    }
    if (trimmed.startsWith("#")) {
      let next = line;
      for (const match of [...line.matchAll(/URI="([^"]+)"/g)]) {
        try {
          const target = safeUrl(match[1], base.toString());
          next = next.replace('URI="' + match[1] + '"', 'URI="' + await signedStreamPath(target.toString()) + '"');
        } catch {}
      }
      output.push(next);
      continue;
    }
    try {
      const target = safeUrl(trimmed, base.toString());
      output.push(line.slice(0, line.indexOf(trimmed)) + await signedStreamPath(target.toString()));
    } catch {
      output.push(line);
    }
  }
  return output.join("\n");
}

export async function radioStreamResponse(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "method_not_allowed" }, 405, "no-store");
  const url = new URL(request.url);
  const packed = url.searchParams.get("u") || "";
  const signature = url.searchParams.get("s") || "";
  if (!packed || !signature || !(await verify(packed, signature))) return json({ error: "invalid_radio_stream_token" }, 403, "no-store");

  let target: URL;
  try {
    target = safeUrl(TD.decode(unb64u(packed)));
  } catch {
    return json({ error: "invalid_radio_stream_url" }, 400, "no-store");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let fetched: { response: Response; finalUrl: URL };
  try {
    fetched = await fetchSafe(target, requestHeaders(request), controller.signal);
  } catch (error) {
    clearTimeout(timer);
    return json({
      error: (error as any)?.name === "AbortError" ? "radio_upstream_timeout" : ((error as any)?.message || "radio_upstream_failed")
    }, 502, "no-store");
  }

  const upstream = fetched.response;
  const finalUrl = fetched.finalUrl;
  const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
  const manifest =
    finalUrl.pathname.toLowerCase().includes(".m3u8") ||
    target.pathname.toLowerCase().includes(".m3u8") ||
    contentType.includes("mpegurl");

  if (!upstream.ok && upstream.status !== 206) {
    clearTimeout(timer);
    return json({ error: "radio_upstream_" + upstream.status }, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502, "no-store");
  }

  if (manifest) {
    try {
      const body = await readTextLimited(upstream);
      const rewritten = await rewriteManifest(body, finalUrl);
      clearTimeout(timer);
      return new Response(request.method === "HEAD" ? null : rewritten, {
        status: upstream.status,
        headers: {
          "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
          "x-content-type-options": "nosniff",
          "x-nepal-miti-radio-relay": "manifest"
        }
      });
    } catch {
      clearTimeout(timer);
      return json({ error: "radio_manifest_read_failed" }, 502, "no-store");
    }
  }

  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    clearTimeout(timer);
    try { await upstream.body?.cancel(); } catch {}
    return json({ error: "radio_upstream_not_media" }, 502, "no-store");
  }

  clearTimeout(timer);
  const headers = new Headers();
  for (const key of [
    "content-type","content-length","content-range","accept-ranges","icy-br","icy-name",
    "icy-genre","icy-description","etag","last-modified"
  ]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.get("content-type")) headers.set("content-type", "audio/mpeg");
  headers.set("cache-control", "no-store");
  headers.set("access-control-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-nepal-miti-radio-relay", "audio");
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}
