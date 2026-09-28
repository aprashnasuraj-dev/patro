import type { ApodPayload, CosmicDayPayload, HealthPayload, SyncPayload, SyncRangePayload, TithiPayload } from "./types";

const memoryCache = new Map<string, unknown>();

async function fetchJson<T>(path: string, signal?: AbortSignal, cache = true): Promise<T> {
  if (cache && memoryCache.has(path)) return memoryCache.get(path) as T;

  const response = await fetch(path, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The calendar service returned an unreadable response.");
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error?: unknown }).error)
        : "Request failed with HTTP " + response.status;
    throw new Error(message);
  }

  if (cache) memoryCache.set(path, body);
  return body as T;
}

export const api = {
  health(signal?: AbortSignal) {
    return fetchJson<HealthPayload>("/api/v1/health", signal, false);
  },

  sync(date: string, signal?: AbortSignal) {
    return fetchJson<SyncPayload>("/api/v1/sync?date=" + encodeURIComponent(date), signal);
  },

  syncRange(start: string, end: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ start, end });
    return fetchJson<SyncRangePayload>("/api/v1/sync?" + query.toString(), signal);
  },

  apod(date: string, signal?: AbortSignal) {
    return fetchJson<ApodPayload>("/api/v1/nasa/apod?date=" + encodeURIComponent(date), signal);
  },

  cosmic(date: string, signal?: AbortSignal) {
    return fetchJson<CosmicDayPayload>("/api/v1/nasa/cosmic?date=" + encodeURIComponent(date), signal);
  },

  tithi(date: string, lat = 27.7172, lng = 85.324, signal?: AbortSignal) {
    const query = new URLSearchParams({
      date,
      lat: String(lat),
      lng: String(lng)
    });
    return fetchJson<TithiPayload>("/api/v1/astronomy/tithi?" + query.toString(), signal);
  }
};

export function clearApiCache() {
  memoryCache.clear();
}
