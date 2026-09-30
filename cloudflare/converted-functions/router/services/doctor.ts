import { envGet } from "../../_shared/env";
const REQUIRED_TABLES = [
  "astronomy_calendar_map",
  "tool_catalog",
  "tool_release_plan",
  "community_festivals",
  "community_dates",
  "ns_days",
  "ns_festival_dates",
  "user_community_preferences",
  "official_panchang_facts",
  "fm_stations",
  "news_items",
  "market_snapshots",
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function tableHealth(base: string, key: string, table: string) {
  try {
    const response = await fetch(base + "/rest/v1/" + table + "?select=*&limit=0", {
      method: "HEAD",
      headers: { apikey: key, authorization: "Bearer " + key },
      signal: AbortSignal.timeout(3500),
    });
    return { table, ok: response.ok, status: response.status };
  } catch {
    return { table, ok: false, status: 0 };
  }
}

export async function routerDoctor(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  const base = envGet("SUPABASE_URL") || "";
  const key = envGet("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!base || !key) {
    return json({ ok: false, status: "misconfigured", error: "supabase_service_configuration_missing" }, 503);
  }

  const tables = await Promise.all(REQUIRED_TABLES.map((table) => tableHealth(base, key, table)));
  const missing = tables.filter((row) => !row.ok);

  let enabledTools = -1;
  try {
    const response = await fetch(base + "/rest/v1/tool_catalog?select=slug&enabled=eq.true&limit=100", {
      headers: { apikey: key, authorization: "Bearer " + key, accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (response.ok) enabledTools = ((await response.json()) as unknown[]).length;
  } catch {}

  const ok = missing.length === 0 && enabledTools >= 1;
  return json({
    ok,
    status: ok ? "healthy" : "degraded",
    canonical_function: "router",
    architecture: {
      static_ui: "Vercel",
      dynamic_api: "Supabase Edge Function router",
      database: "Supabase Postgres",
    },
    consolidated: [
      "tools-catalog",
      "typing-lexicon",
      "jyotish-chat",
      "nepali-typing-ui->Vercel-static",
    ],
    compatibility_boundary: ["nepal-miti-protected"],
    database: { ok: missing.length === 0, tables, missing: missing.map((row) => row.table) },
    tools: { enabled_count: enabledTools, ok: enabledTools >= 1 },
    checked_at: new Date().toISOString(),
  }, ok ? 200 : 503);
}
