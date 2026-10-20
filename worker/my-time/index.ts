import { calculateMyTimeSnapshot } from "../../src/patro-tools/core/my-time-snapshot";


function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff"
    }
  });
}

/** Scoped handler imported by the existing main Worker; it is not a separate Worker entry point. */
export async function myTimeResponse(request: Request, env: Record<string, unknown> = {}): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/v1/mytime/today") return null;
  if (env.MY_TIME_ENABLED !== true && env.MY_TIME_ENABLED !== "true") return json({ ok: false, error: "feature_disabled" }, 404);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const numberParam = (key: string): number | undefined => {
    const raw = url.searchParams.get(key);
    if (raw === null || raw.trim() === "") return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`invalid_${key}`);
    return value;
  };

  try {
    const snapshot = calculateMyTimeSnapshot({
      date: url.searchParams.get("date") || undefined,
      timezone: url.searchParams.get("timezone") || undefined,
      lat: numberParam("lat"),
      lng: numberParam("lng")
    });
    return request.method === "HEAD" ? new Response(null, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } }) : json({ ok: true, data: snapshot });
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_request";
    const allowed = new Set(["invalid_date", "invalid_timezone", "invalid_latitude", "invalid_longitude", "invalid_lat", "invalid_lng"]);
    return json({ ok: false, error: allowed.has(code) ? code : "invalid_request" }, 400);
  }
}
