import { createPatroAdapter } from "../lib/patro";
import { agentPageResponse } from "./agent-pages";
import { mcpResponse } from "./mcp";
import { createD1PatroSource } from "./patro-source";
import { yearPageResponse } from "./year-page";

type Env = Record<string, unknown> & { DB?: any; PUBLIC_SITE_URL?: string };
type NativeFetch = (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>;

function headers(extra: Record<string, string> = {}) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
    ...extra
  };
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}

async function agentRest(request: Request, env: Env) {
  const url = new URL(request.url);
  const adapter = createPatroAdapter(createD1PatroSource(env));

  if (url.pathname === "/api/agent/v1/today" && request.method === "GET") {
    const value = await adapter.getTodayNepal();
    return value ? json({ ok: true, value }) : json({ ok: false, error: "calendar_unavailable" }, 503);
  }

  if (url.pathname === "/api/agent/v1/convert" && request.method === "GET") {
    const ad = url.searchParams.get("ad");
    const bs = url.searchParams.get("bs");
    if (!!ad === !!bs) return json({ ok: false, error: "provide_exactly_one_of_ad_or_bs" }, 400);
    const value = ad ? await adapter.convertAdToBs(ad) : await adapter.convertBsToAd(String(bs));
    return value ? json({ ok: true, value }) : json({ ok: false, error: "date_outside_archive" }, 404);
  }

  if (url.pathname === "/api/agent/v1/festival" && request.method === "GET") {
    const slug = String(url.searchParams.get("slug") || "").trim();
    const year = Number(url.searchParams.get("year"));
    if (!slug || !Number.isInteger(year)) return json({ ok: false, error: "provide_slug_and_year" }, 400);
    const value = await adapter.getFestival(slug, year);
    return value ? json({ ok: true, value }) : json({ ok: false, error: "festival_not_found" }, 404);
  }

  if (url.pathname === "/api/agent/v1/sait" && request.method === "GET") {
    const type = String(url.searchParams.get("type") || "").trim();
    const year = Number(url.searchParams.get("year"));
    if (!type || !Number.isInteger(year)) return json({ ok: false, error: "provide_type_and_year" }, 400);
    const items = await adapter.getSait(type, year);
    return json({ ok: true, type, year, count: items.length, items });
  }

  return null;
}

export async function handleAgentSurface(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _nativeFetch: NativeFetch
): Promise<Response | null> {
  const mcp = await mcpResponse(request, env);
  if (mcp) return mcp;

  const year = await yearPageResponse(request, env);
  if (year) return year;

  const page = await agentPageResponse(request, env);
  if (page) return page;

  return agentRest(request, env);
}
