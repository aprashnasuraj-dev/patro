import worker from "./index";
import { runScheduled, type JobsEnv } from "./jobs";

type Env = JobsEnv & Record<string, unknown> & { SUPABASE_COMPAT_ORIGIN?: string };

const FALLBACK_PATHS = new Map<string, string>([
  ["/api/v1/sync", "/sync"],
  ["/api/v1/astronomy/tithi", "/astronomy/tithi"],
  ["/api/v1/rashifal/universal", "/rashifal/universal"],
  ["/api/v1/tools/catalog", "/tools/catalog"],
  ["/api/v1/markets/latest", "/markets/latest"],
  ["/api/v1/market/latest", "/markets/latest"],
]);

const TOOL_TITLES: Record<string, string> = {
  typingtools: "टाइपिङ टुल्स",
  "nepali-typing": "नेपाली टाइपिङ",
  "tithi-reminder": "तिथि रिमाइन्डर",
  sait: "साइत",
  "baby-names": "बेबी नेम",
  "janmadin-akhbar": "जन्मदिन अखबार",
  "future-letter": "भविष्यको चिठी",
  "spell-check": "नेपाली हिज्जे जाँच",
  "voice-typing": "बोली टाइपिङ",
  ocr: "नेपाली OCR",
  "name-check": "नाम जाँच",
  "read-aloud": "पढेर सुनाउने",
  "patro-bot": "पात्रो बोट",
  family: "परिवार",
  "my-data": "डेटा",
};

function redirect(request: Request, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return Response.redirect(url.toString(), 301);
}

function nepseRemoved() {
  return Response.json({
    ok: false,
    error: "nepse_integration_removed",
    message: "NEPSE/index integration is not part of आफ्नै पात्रो production."
  }, {
    status: 410,
    headers: {
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}

function responseWithHeader(response: Response, name: string, value: string) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function compatFallback(request: Request, env: Env, suffix: string) {
  const origin = String(env.SUPABASE_COMPAT_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) return null;
  const incoming = new URL(request.url);
  const target = new URL(origin + suffix);
  target.search = incoming.search;
  const response = await fetch(new Request(target.toString(), request));
  if (!response.ok) return null;
  return responseWithHeader(response, "x-patro-backend", "supabase-compat-fallback");
}

async function brandCatalog(response: Response) {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return response;
  try {
    const body: any = await response.clone().json();
    if (!Array.isArray(body?.items)) return response;
    body.items = body.items.map((item: any) => {
      const slug = String(item?.slug || "");
      return TOOL_TITLES[slug] ? { ...item, title: TOOL_TITLES[slug] } : item;
    });
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(body), { status: response.status, headers });
  } catch {
    return response;
  }
}

async function doctorWithoutMarketDependency(request: Request, env: Env, ctx: ExecutionContext) {
  const response = await worker.fetch(request, env as any, ctx);
  if (!response.headers.get("content-type")?.includes("application/json")) return response;
  try {
    const body: any = await response.clone().json();
    const tables = Array.isArray(body?.database?.tables) ? body.database.tables.filter((row: any) => row?.table !== "market_snapshots") : body?.database?.tables;
    const missing = Array.isArray(body?.database?.missing) ? body.database.missing.filter((name: string) => name !== "market_snapshots") : body?.database?.missing;
    if (!Array.isArray(tables) || !Array.isArray(missing)) return response;
    const ok = missing.length === 0;
    body.ok = ok;
    body.status = ok ? "healthy" : "degraded";
    body.database = { ...body.database, ok, tables, missing };
    body.excluded_features = [...(Array.isArray(body.excluded_features) ? body.excluded_features : []), "NEPSE/index market integration"];
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(JSON.stringify(body), { status: ok ? 200 : 503, headers });
  } catch {
    return response;
  }
}

async function callWithFallback(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const response = await worker.fetch(request, env as any, ctx);
  const suffix = FALLBACK_PATHS.get(url.pathname);
  let resolved = response;
  if (suffix && response.status >= 500) {
    try { resolved = (await compatFallback(request, env, suffix)) || response; } catch { resolved = response; }
  }
  return url.pathname === "/api/v1/tools/catalog" ? brandCatalog(resolved) : resolved;
}

const productionWorker = {
  ...worker,
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    let url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/nepal-sambat") return redirect(request, "/nepal-sambat/mandala");
    if (path === "/jyotish/janma-patro") return redirect(request, "/jyotish/china");
    if (path === "/jyotish/china/rashi" || path === "/jyotish/rashifal") return redirect(request, "/rashifal");

    if (path === "/api/v1/markets/latest" || path === "/api/v1/market/latest") {
      const kinds = (url.searchParams.get("kind") || "forex").split(",").map((value) => value.trim()).filter(Boolean);
      if (!kinds.length || kinds.some((kind) => kind !== "forex")) return nepseRemoved();
      url.pathname = "/api/v1/markets/latest";
      url.searchParams.set("kind", "forex");
      request = new Request(url.toString(), request);
    }

    if (path === "/api/v1/doctor") return doctorWithoutMarketDependency(request, env, ctx);
    return callWithFallback(request, env, ctx);
  },
  async scheduled(controller: { cron: string }, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduled(controller.cron,env));
  }
};

export default productionWorker;
