const STATIC_EXACT = new Set([
  "/news",
  "/history",
  "/astro",
  "/fm",
  "/tv",
  "/tools",
  "/tools/nepali-typing",
  "/jyotish/janma-patro",
  "/jyotish/matchmaking",
  "/explore",
  "/my-diary",
  "/about",
  "/sources",
  "/privacy",
  "/terms",
  "/contact",
  "/404",
  "/samudaya",
  "/nepal-sambat/mandala",
  "/settings/community",
  "/admin/community-suites",
  "/tools/samudaya"
]);

const WORKER_EXACT = new Set([
  "/tools/tithi",
  "/tools/diaspora",
  "/tools/card",
  "/tools/family",
  "/tools/api",
  "/tools/my-data"
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
  ) {
    return "worker";
  }

  if (WORKER_EXACT.has(path)) return "worker";
  if (STATIC_EXACT.has(path)) return "static";

  if (
    path.startsWith("/astro/") ||
    path.startsWith("/samudaya/") ||
    path.startsWith("/nepal-sambat/mandala/")
  ) {
    return "static";
  }

  // Vercel's current routing keeps the general /tools/* surface on the SPA,
  // except for the explicit protected-tool routes handled above.
  if (path.startsWith("/tools/")) return "static";

  // Files with extensions are static artifacts unless caught by /api/* above.
  const leaf = path.split("/").pop() || "";
  if (leaf.includes(".")) return "static";

  // Match the current Vercel/Supabase protected catch-all for root/calendar/
  // search/planner/etc. until each route is ported natively to the Worker.
  return "worker";
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

  if (!env.PATRO_API || typeof env.PATRO_API.fetch !== "function") {
    return missingBinding();
  }
  return env.PATRO_API.fetch(request);
};
