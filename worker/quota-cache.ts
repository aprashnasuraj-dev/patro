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

function canonicalUrl(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/on-this-day") url.searchParams.delete("fresh");
  const entries = [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) =>
    ak.localeCompare(bk) || av.localeCompare(bv),
  );
  url.search = "";
  for (const [key, value] of entries) url.searchParams.append(key, value);
  return url;
}

function validIsoDate(value: string | null) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function policyFor(request: Request): CachePolicy | null {
  if (request.method !== "GET") return null;
  const url = canonicalUrl(request);
  const path = url.pathname;

  if (path === "/api/v1/on-this-day") {
    return {
      group: "history",
      durable: true,
      kvTtl: 14 * DAY,
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

  // These can have very high key cardinality (arbitrary dates/coordinates). Keep them
  // on the Cache API only so a crawler cannot burn KV/R2 operation quotas by enumerating keys.
  if (path === "/api/v1/convert" || path === "/api/v1/astronomy/tithi") {
    return {
      group: "edge-only",
      durable: false,
      kvTtl: DAY,
      maxBytes: 1_000_000,
      version: () => "edge-v1",
    };
  }

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
  if (!response.ok) return false;
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return false;
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
    // Refill KV from the R2 copy asynchronously on the next store path rather than
    // turning every R2 cache hit into a KV write.
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
        return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
      }
    } catch {}
  }

  const durable = await readDurable(request, env, policy);
  if (durable) {
    ctx.waitUntil(putEdge(request, durable.clone()));
    return durable;
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
