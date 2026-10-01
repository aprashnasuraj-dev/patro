import worker from "./index";

type BaseWorker = typeof worker;

function redirect(request: Request, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return Response.redirect(url.toString(), 308);
}

function nepseRemoved() {
  return new Response(JSON.stringify({
    ok: false,
    error: "nepse_integration_removed",
    message: "NEPSE/index integration is not part of Aafnai Patro production."
  }), {
    status: 410,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}

async function doctorWithoutMarketDependency(request: Request, env: any, ctx: ExecutionContext) {
  const response = await worker.fetch(request, env, ctx);
  if (!response.headers.get("content-type")?.includes("application/json")) return response;
  try {
    const body: any = await response.clone().json();
    const tables = Array.isArray(body?.database?.tables)
      ? body.database.tables.filter((row: any) => row?.table !== "market_snapshots")
      : body?.database?.tables;
    const missing = Array.isArray(body?.database?.missing)
      ? body.database.missing.filter((name: string) => name !== "market_snapshots")
      : body?.database?.missing;
    if (!Array.isArray(tables) || !Array.isArray(missing)) return response;
    const ok = missing.length === 0;
    body.ok = ok;
    body.status = ok ? "healthy" : "degraded";
    body.database = { ...body.database, ok, tables, missing };
    body.excluded_features = [
      ...(Array.isArray(body.excluded_features) ? body.excluded_features : []),
      "NEPSE/index market integration"
    ];
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(JSON.stringify(body), { status: ok ? 200 : 503, headers });
  } catch {
    return response;
  }
}

const productionWorker: BaseWorker = {
  ...worker,
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/jyotish/janma-patro") return redirect(request, "/jyotish/china");
    if (path === "/jyotish/china/rashi") return redirect(request, "/jyotish/rashifal");

    if (path === "/api/v1/markets/latest" && (url.searchParams.get("kind") || "forex") === "index") {
      return nepseRemoved();
    }
    if (path === "/api/v1/market/latest") {
      const kind = url.searchParams.get("kind");
      if (!kind || kind === "index") return nepseRemoved();
      if (kind === "forex") {
        url.pathname = "/api/v1/markets/latest";
        url.searchParams.set("kind", "forex");
        return worker.fetch(new Request(url.toString(), request), env, ctx);
      }
    }

    if (path === "/api/v1/doctor") return doctorWithoutMarketDependency(request, env, ctx);
    return worker.fetch(request, env, ctx);
  }
};

export default productionWorker;
