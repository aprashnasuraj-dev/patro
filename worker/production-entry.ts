import baseWorker from "./index";

type CompatEnv = {
  SUPABASE_COMPAT_ORIGIN?: string;
  [key: string]: unknown;
};

const FALLBACK_PATHS = new Map([
  ["/api/v1/sync", "/sync"],
  ["/api/v1/astronomy/tithi", "/astronomy/tithi"],
  ["/api/v1/rashifal/universal", "/rashifal/universal"],
  ["/api/v1/tools/catalog", "/tools/catalog"],
]);

function withHeader(response: Response, name: string, value: string) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function compatFallback(request: Request, env: CompatEnv, suffix: string) {
  const origin = String(env.SUPABASE_COMPAT_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) return null;
  const incoming = new URL(request.url);
  const target = new URL(origin + suffix);
  target.search = incoming.search;
  const proxied = new Request(target.toString(), request);
  const response = await fetch(proxied);
  if (!response.ok) return null;
  return withHeader(response, "x-patro-backend", "supabase-compat-fallback");
}

export default {
  async fetch(request: Request, env: CompatEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // The old /jyotish/china/rashi URL remains compatible while the canonical
    // frontend experience lives at /jyotish/china + /jyotish/rashifal.
    if (url.pathname === "/jyotish/china/rashi") {
      const target = new URL("/jyotish/rashifal", url.origin);
      target.search = url.search;
      return Response.redirect(target.toString(), 308);
    }

    // Keep the public, branded China/Chिना URL while reusing the already-built
    // Janma Patro SPA shell in the base Worker.
    if (url.pathname === "/jyotish/china") {
      const rewritten = new URL(request.url);
      rewritten.pathname = "/jyotish/janma-patro";
      return baseWorker.fetch(new Request(rewritten.toString(), request), env as never, ctx);
    }

    // NEPSE/index integration is intentionally retired. NRB forex remains.
    if (url.pathname === "/api/v1/markets/latest" && url.searchParams.get("kind") === "index") {
      return Response.json(
        { error: "market_index_retired", message: "NEPSE/index integration has been removed." },
        { status: 410, headers: { "cache-control": "public, max-age=300" } },
      );
    }

    const response = await baseWorker.fetch(request, env as never, ctx);
    const fallbackSuffix = FALLBACK_PATHS.get(url.pathname);
    if (!fallbackSuffix || response.status < 500) return response;

    try {
      const fallback = await compatFallback(request, env, fallbackSuffix);
      return fallback || response;
    } catch {
      return response;
    }
  },

  async scheduled(controller: ScheduledController, env: CompatEnv, ctx: ExecutionContext) {
    const scheduled = (baseWorker as typeof baseWorker & {
      scheduled?: (controller: ScheduledController, env: unknown, ctx: ExecutionContext) => Promise<void> | void;
    }).scheduled;
    if (scheduled) return scheduled(controller, env, ctx);
  },
};
