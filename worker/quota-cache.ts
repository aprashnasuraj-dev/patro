type QuotaCacheEnv = {
  CACHE?: any;
  ARCHIVE?: any;
  CALENDAR_SOURCE_VERSION?: string;
  PUBLIC_REFERENCE_CACHE_VERSION?: string;
};

type CachePolicy = {
  group: string;
  durable: boolean;
  kvTtl: number;
  maxBytes: number;
  version: (env: QuotaCacheEnv) => string;
};

type FastProducer = () => Promise<Response | null>;

type StoredResponse = {
  status: number;
  statusText?: string;
  headers: Record<string, string>;
  body: string;
  stored_at: string;
  canonical: string;
};

const CACHE_PREFIX = "patro-quota-v2";
const DAY = 86_400;
const HISTORY_CACHE_YEAR = "2000"; // Leap-year sentinel: exactly 366 reusable month/day keys.
const textEncoder = new TextEncoder();

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function safeVersion(value: string) {
  return String(value || "v1").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "v1";
}

function validIsoDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

function historyCacheDate(value: string | null) {
  const date = value === null || value === "" ? todayNepal() : validIsoDate(value) ? String(value) : "";
  if (!date) return "";
  const [, month, day] = date.split("-");
  return `${HISTORY_CACHE_YEAR}-${month}-${day}`;
}

function requestedHistoryDate(request: Request) {
  const value = new URL(request.url).searchParams.get("date");
  if (value === null || value === "") return todayNepal();
  return validIsoDate(value) ? String(value) : null;
}

function canonicalUrl(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/on-this-day") {
    url.searchParams.delete("fresh");
    // History content is month/day based. Normalizing the year collapses an unbounded
    // sequence of annual URLs into exactly 366 durable objects while the response adapter
    // below restores the caller's requested year/date before returning JSON.
    const normalized = historyCacheDate(url.searchParams.get("date"));
    if (normalized) url.searchParams.set("date", normalized);
  }
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  const entries = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) =>
    ak.localeCompare(bk) || av.localeCompare(bv),
  );
  url.search = "";
  for (const [key, value] of entries) url.searchParams.append(key, value);
  return url;
}

async function adaptCachedResponse(request: Request, response: Response) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/v1/on-this-day" || !response.ok) return response;
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) return response;
  const requestedDate = requestedHistoryDate(request);
  if (!requestedDate) return response;
  try {
    const body = await response.clone().json() as Record<string, unknown>;
    if (!body || typeof body !== "object" || !("date" in body)) return response;
    body.date = requestedDate;
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(JSON.stringify(body), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}

function edgeOnly(group = "edge-only", maxBytes = 2_000_000): CachePolicy {
  return {
    group,
    durable: false,
    kvTtl: DAY,
    maxBytes,
    version: () => "edge-v1",
  };
}

function policyFor(request: Request): CachePolicy | null {
  if (request.method !== "GET") return null;
  const url = canonicalUrl(request);
  const path = url.pathname;

  // Immutable/slow-changing reference surfaces get the full Cache -> KV -> R2 -> D1
  // hierarchy. R2 is deliberately used for response snapshots, not as a per-request
  // SQLite engine, so the main SQL backup object can coexist untouched in the bucket.
  if (path === "/api/v1/on-this-day") {
    return {
      group: "history",
      durable: true,
      kvTtl: 30 * DAY,
      maxBytes: 1_000_000,
      version: (env) => safeVersion(env.PUBLIC_REFERENCE_CACHE_VERSION || "history-v1"),
    };
  }

  if (path === "/api/v1/time-machine") {
    return {
      group: "time-machine",
      durable: true,
      kvTtl: 30 * DAY,
      maxBytes: 4_000_000,
      version: (env) => safeVersion(env.PUBLIC_REFERENCE_CACHE_VERSION || "references-v1"),
    };
  }

  if (/^\/api\/v1\/calendar\/\d{4}\/\d{1,2}$/.test(path)) {
    return {
      group: "calendar-month",
      durable: true,
      kvTtl: 30 * DAY,
      maxBytes: 2_000_000,
      version: (env) => safeVersion(env.CALENDAR_SOURCE_VERSION || "calendar-v1"),
    };
  }

  if (path === "/api/v1/sync") {
    const date = url.searchParams.get("date");
    const durable = validIsoDate(date) && date === todayNepal();
    return {
      group: durable ? "calendar-today" : "calendar-edge",
      durable,
      kvTtl: 2 * DAY,
      maxBytes: 2_000_000,
      version: (env) => safeVersion(env.CALENDAR_SOURCE_VERSION || "calendar-v1"),
    };
  }

  // Public D1-backed surfaces that may change through admin overrides, stream health,
  // publication refreshes, or have arbitrary query cardinality stay Cache-API-only.
  // This saves D1 rows-read without converting crawler/search traffic into KV/R2 ops.
  if (
    path === "/api/v1/convert" ||
    path === "/api/v1/astronomy/tithi" ||
    path === "/api/v1/today" ||
    path === "/api/v1/panchang" ||
    path === "/api/v1/holidays" ||
    path === "/api/v1/festivals" ||
    path === "/api/v1/tools/official-sait" ||
    path === "/api/v1/market/latest" ||
    path === "/api/v1/news" ||
    path === "/api/v1/rashifal/metadata" ||
    path === "/api/v1/rashifal/universal" ||
    path === "/api/v1/noc/fuel-prices" ||
    path === "/api/fm/stations" ||
    path === "/api/fm/v2/stations" ||
    /^\/api\/fm\/(?:v2\/)?play\//.test(path) ||
    path === "/api/v1/communities" ||
    path === "/api/v1/communities/feed.ics" ||
    path === "/api/v1/communities/lho" ||
    /^\/api\/v1\/communities\/[^/]+(?:\/ics)?$/.test(path)
  ) {
    return edgeOnly("public-d1-edge", 4_000_000);
  }

  // Typing lexicon is a large public external reference. Edge caching avoids repeated
  // upstream fetch/checksum work without spending KV/R2 operations on format variants.
  if (path === "/api/v1/typing/lexicon") return edgeOnly("typing-edge", 4_000_000);

  return null;
}

function edgeKey(request: Request) {
  return new Request(canonicalUrl(request).toString(), { method: "GET" });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function durableKey(request: Request, policy: CachePolicy, env: QuotaCacheEnv) {
  const canonical = canonicalUrl(request).toString();
  const digest = await sha256Hex(canonical);
  return `${CACHE_PREFIX}/${policy.group}/${policy.version(env)}/${digest}.json`;
}

function safeHeaders(response: Response) {
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers) {
    const lower = key.toLowerCase();
    if (lower === "set-cookie" || lower === "content-length" || lower.startsWith("cf-")) continue;
    headers[key] = value;
  }
  return headers;
}

function cacheable(response: Response) {
  if (!response.ok || response.headers.has("set-cookie")) return false;
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (!(type.includes("application/json") || type.includes("text/calendar") || type.includes("application/xml") || type.startsWith("text/plain"))) return false;
  const control = response.headers.get("cache-control") || "";
  return !/\b(?:private|no-store)\b/i.test(control);
}

function restore(stored: StoredResponse, layer: string) {
  const headers = new Headers(stored.headers || {});
  headers.delete("set-cookie");
  headers.set("x-patro-cache", layer);
  return new Response(stored.body, {
    status: Number(stored.status || 200),
    statusText: stored.statusText || undefined,
    headers,
  });
}

async function readKv(env: QuotaCacheEnv, key: string) {
  if (!env.CACHE) return null;
  try {
    const text = await env.CACHE.get(key, "text");
    if (!text) return null;
    return restore(JSON.parse(text) as StoredResponse, "kv");
  } catch {
    return null;
  }
}

async function readR2(env: QuotaCacheEnv, key: string) {
  if (!env.ARCHIVE) return null;
  try {
    const object = await env.ARCHIVE.get(key);
    if (!object) return null;
    const text = await object.text();
    return restore(JSON.parse(text) as StoredResponse, "r2");
  } catch {
    return null;
  }
}

async function persistDurable(
  request: Request,
  response: Response,
  env: QuotaCacheEnv,
  policy: CachePolicy,
) {
  if (!policy.durable || (!env.CACHE && !env.ARCHIVE) || !cacheable(response)) return;
  const body = await response.clone().text();
  if (textEncoder.encode(body).byteLength > policy.maxBytes) return;
  const key = await durableKey(request, policy, env);
  const stored: StoredResponse = {
    status: response.status,
    statusText: response.statusText,
    headers: safeHeaders(response),
    body,
    stored_at: new Date().toISOString(),
    canonical: canonicalUrl(request).pathname + canonicalUrl(request).search,
  };
  const payload = JSON.stringify(stored);
  const writes: Promise<unknown>[] = [];
  if (env.CACHE) {
    writes.push(env.CACHE.put(key, payload, { expirationTtl: policy.kvTtl }));
  }
  if (env.ARCHIVE) {
    writes.push(env.ARCHIVE.put(key, payload, {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        patro_cache: "1",
        group: policy.group,
        stored_at: stored.stored_at,
      },
    }));
  }
  await Promise.allSettled(writes);
}

async function putEdge(request: Request, response: Response) {
  if (typeof caches === "undefined" || !cacheable(response)) return;
  try { await caches.default.put(edgeKey(request), response.clone()); } catch {}
}

async function readDurable(request: Request, env: QuotaCacheEnv, policy: CachePolicy) {
  if (!policy.durable) return null;
  const key = await durableKey(request, policy, env);
  const kv = await readKv(env, key);
  if (kv) return kv;
  const r2 = await readR2(env, key);
  if (r2) {
    // Do not refill KV on every R2 hit. This deliberately trades a cheap R2 read for a
    // potentially quota-counted KV write; the next real origin refresh will repopulate both.
    return r2;
  }
  return null;
}

export async function quotaCachedResponse(
  request: Request,
  env: QuotaCacheEnv,
  ctx: Pick<ExecutionContext, "waitUntil">,
  producer: FastProducer,
): Promise<Response | null> {
  const policy = policyFor(request);
  if (!policy) return producer();

  if (typeof caches !== "undefined") {
    try {
      const hit = await caches.default.match(edgeKey(request));
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("x-patro-cache", "edge");
        const restored = new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
        return adaptCachedResponse(request, restored);
      }
    } catch {}
  }

  const durable = await readDurable(request, env, policy);
  if (durable) {
    const adapted = await adaptCachedResponse(request, durable);
    ctx.waitUntil(putEdge(request, adapted.clone()));
    return adapted;
  }

  const response = await producer();
  if (!response) return null;
  if (cacheable(response)) {
    ctx.waitUntil(putEdge(request, response.clone()));
    if (policy.durable) ctx.waitUntil(persistDurable(request, response.clone(), env, policy));
  }
  return response;
}

/** Scheduled warmup helper. It waits for KV/R2 persistence before returning so the next
 * user request can avoid D1 even when the local edge cache is cold. */
export async function primeQuotaCache(
  request: Request,
  env: QuotaCacheEnv,
  producer: FastProducer,
): Promise<Response | null> {
  const tasks: Promise<unknown>[] = [];
  const ctx = { waitUntil(promise: Promise<unknown>) { tasks.push(promise); } } as Pick<ExecutionContext, "waitUntil">;
  const response = await quotaCachedResponse(request, env, ctx, producer);
  await Promise.allSettled(tasks);
  return response;
}
