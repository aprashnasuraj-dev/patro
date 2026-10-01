import productionWorker from "./entry";

type Env = Record<string, unknown> & {
  SUPABASE_COMPAT_ORIGIN?: string;
};

const COMPAT_PREFIX = "/api/v1/compat-api/";
const ALLOWED_COMPAT_ROOTS = new Set(["tv", "fm", "samachar"]);

function compatSuffix(pathname: string) {
  if (pathname === "/api/v1/news") return "/compat-api/samachar/feed";
  if (!pathname.startsWith(COMPAT_PREFIX)) return null;

  const tail = pathname.slice(COMPAT_PREFIX.length);
  if (!tail || tail.length > 1024 || tail.includes("\\") || tail.includes("\0")) return null;

  try {
    const decoded = decodeURIComponent(tail);
    if (decoded.includes("\\") || decoded.includes("\0")) return null;
    if (decoded.split("/").some((part) => part === "." || part === "..")) return null;
    const root = decoded.split("/")[0]?.toLowerCase();
    if (!root || !ALLOWED_COMPAT_ROOTS.has(root)) return null;
  } catch {
    return null;
  }

  return "/compat-api/" + tail;
}

async function compatibilityResponse(request: Request, env: Env, suffix: string) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const origin = String(env.SUPABASE_COMPAT_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) return null;

  const incoming = new URL(request.url);
  const target = new URL(origin + suffix);
  target.search = incoming.search;

  try {
    const upstream = await fetch(new Request(target.toString(), request));
    if (!upstream.ok) return null;

    const headers = new Headers(upstream.headers);
    headers.set("x-patro-backend", "supabase-selective-compat");
    headers.set("x-patro-compat-route", suffix.split("?")[0]);
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return null;
  }
}

export default {
  ...productionWorker,
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const response = await productionWorker.fetch(request, env as any, ctx);
    if (response.status !== 404) return response;

    const suffix = compatSuffix(new URL(request.url).pathname);
    if (!suffix) return response;

    return (await compatibilityResponse(request, env, suffix)) || response;
  },
};
