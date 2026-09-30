import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,apikey,x-client-info",
};

function json(body: unknown, status = 200, cache = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
  });
}

async function rest(path: string) {
  const base = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!base || !key) throw new Error("supabase_service_configuration_missing");
  const response = await fetch(base + "/rest/v1/" + path, {
    headers: {
      apikey: key,
      authorization: "Bearer " + key,
      accept: "application/json",
    },
  });
  if (!response.ok) throw new Error("catalog_query_failed_" + response.status);
  const body = await response.json();
  return Array.isArray(body) ? body : [];
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, "no-store");

  try {
    const url = new URL(request.url);
    const includeUpcoming = url.searchParams.get("include") === "upcoming";
    const now = Date.now();

    const [catalogRows, releaseRows] = await Promise.all([
      rest("tool_catalog?select=tool_id,slug,title,subtitle,category,parent_slug,target_path,icon,badge,sort_order,enabled,release_after,metadata&order=sort_order.asc"),
      rest("tool_release_plan?select=release_id,feature_key,version,target_path,publish_after,state,source_bundle_version,notes,metadata&order=publish_after.asc"),
    ]);

    const items = catalogRows
      .filter((row: any) => row?.enabled === true && Date.parse(String(row.release_after)) <= now)
      .map((row: any) => ({
        id: row.tool_id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        category: row.category,
        parent_slug: row.parent_slug,
        path: row.target_path,
        icon: row.icon,
        badge: row.badge,
        sort_order: row.sort_order,
        metadata: row.metadata || {},
      }));

    const eligibleReleases = releaseRows
      .filter((row: any) => (row?.state === "staged" || row?.state === "published") && Date.parse(String(row.publish_after)) <= now)
      .map((row: any) => ({
        id: row.release_id,
        feature: row.feature_key,
        version: row.version,
        target_path: row.target_path,
        publish_after: row.publish_after,
        source_bundle_version: row.source_bundle_version,
        metadata: row.metadata || {},
      }));

    const upcoming = includeUpcoming
      ? releaseRows
          .filter((row: any) => row?.state === "staged" && Date.parse(String(row.publish_after)) > now)
          .map((row: any) => ({
            id: row.release_id,
            feature: row.feature_key,
            version: row.version,
            target_path: row.target_path,
            publish_after: row.publish_after,
            source_bundle_version: row.source_bundle_version,
          }))
      : undefined;

    return json({
      ok: true,
      version: 1,
      generated_at: new Date().toISOString(),
      source: "Supabase tool_catalog",
      items,
      releases: eligibleReleases,
      ...(includeUpcoming ? { upcoming } : {}),
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "catalog_failed" }, 500, "no-store");
  }
});