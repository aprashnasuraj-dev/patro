const STATIC_EXACT = new Set([
  "/", "/astro", "/fm", "/tv", "/tools", "/tools/nepali-typing",
  "/jyotish/janma-patro", "/jyotish/matchmaking", "/jyotish", "/jyotish/rashifal",
  "/jyotish/china", "/jyotish/china/rashi",
  "/explore", "/my-diary", "/about", "/sources", "/privacy", "/terms", "/contact", "/404",
  "/samudaya", "/nepal-sambat/mandala", "/settings/community", "/admin/community-suites", "/tools/samudaya",
  "/aaja", "/tithi", "/diaspora", "/card", "/family", "/family/join", "/my-data",
  "/settings", "/settings/holidays", "/settings/notifications", "/offline", "/developers",
  "/samachar", "/news", "/time-machine", "/on-this-day", "/history",
  "/convert", "/search", "/notes", "/planner", "/feedback", "/data-trust", "/nepal-sambat", "/astrology", "/widget/today"
]);

function canonicalPath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function routeMode(pathname) {
  const path = canonicalPath(pathname);

  if (
    path === "/api" ||
    path.startsWith("/api/") ||
    path === "/fm-v2-stream" ||
    path.startsWith("/fm-v2-stream/") ||
    path === "/fm-stream" ||
    path.startsWith("/fm-stream/")
  ) return "worker";

  if (STATIC_EXACT.has(path)) return "static";

  if (
    path.startsWith("/astro/") ||
    path.startsWith("/tools/") ||
    path.startsWith("/samudaya/") ||
    path.startsWith("/nepal-sambat/mandala/") ||
    path.startsWith("/calendar/") ||
    path.startsWith("/date/") ||
    path.startsWith("/festival/") ||
    path.startsWith("/jyotish/")
  ) return "static";

  const leaf = path.split("/").pop() || "";
  if (leaf.includes(".")) return "static";

  // Unknown application URLs stay on the SPA so its NotFound/redirect logic
  // handles them without reviving the retired Supabase protected-page proxy.
  return "static";
}

function missingBinding() {
  return new Response(JSON.stringify({
    error: "patro_api_service_binding_missing",
    hint: "Bind PATRO_API to the mero-patro Worker in the Pages project."
  }), {
    status: 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export const onRequest = async ({ request, env, next }) => {
  const mode = routeMode(new URL(request.url).pathname);
  if (mode === "static") return next();

  if (!env.PATRO_API || typeof env.PATRO_API.fetch !== "function") return missingBinding();
  return env.PATRO_API.fetch(request);
};
