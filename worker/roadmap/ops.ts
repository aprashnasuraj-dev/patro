export function roadmapPathGroup(pathname: string): string {
  if (/^\/api\/nepal\/v1\/place\/[^/]+$/.test(pathname)) return "/api/nepal/v1/place/:id";
  if (/^\/api\/nepal\/v1\/corrections\/[^/]+$/.test(pathname)) return "/api/nepal/v1/corrections/:id";
  if (pathname.startsWith("/api/nepal/v1/")) return pathname.replace(/\/$/, "");
  if (/^\/bali-calendar\/\d{4}-\d{2}-\d{2}$/.test(pathname)) return "/bali-calendar/:date";
  if (/^\/bali-calendar\/bulan\/\d{4}-\d{2}$/.test(pathname)) return "/bali-calendar/bulan/:month";
  if (/^\/bali-calendar\/hari-raya\/\d{4}$/.test(pathname)) return "/bali-calendar/hari-raya/:year";
  if (/^\/bali-calendar\/wuku\/[^/]+$/.test(pathname)) return "/bali-calendar/wuku/:wuku";
  if (/^\/bali-calendar\/feed\/hari-raya\/\d{4}\.ics$/.test(pathname)) return "/bali-calendar/feed/hari-raya/:year.ics";
  if (/^\/bali-calendar\/feed\/purnama-tilem\/\d{4}\.ics$/.test(pathname)) return "/bali-calendar/feed/purnama-tilem/:year.ics";
  if (/^\/bali-calendar\/feed\/rerainan\/[^/]+\/\d{4}\.ics$/.test(pathname)) return "/bali-calendar/feed/rerainan/:name/:year.ics";
  return pathname.replace(/\/$/, "") || "/";
}
export const nepalPathGroup = roadmapPathGroup;

export function logRoadmapHttp(input: {
  product: "nepalmap" | "bali";
  surface: string;
  pathname: string;
  method: string;
  status: number;
  duration_ms: number;
}): void {
  console.log({
    event: "roadmap_http",
    schema_version: 1,
    product: input.product,
    surface: input.surface,
    path_group: roadmapPathGroup(input.pathname),
    method: input.method,
    status: input.status,
    duration_ms: Math.round(input.duration_ms * 10) / 10,
  });
}

export function logDependency(input: {
  product: "nepalmap" | "bali";
  dependency: string;
  operation: string;
  outcome: "ok" | "error" | "timeout" | "throttled";
  status?: number;
  duration_ms: number;
}): void {
  console.log({
    event: "roadmap_dependency",
    schema_version: 1,
    product: input.product,
    dependency: input.dependency,
    operation: input.operation,
    outcome: input.outcome,
    status: input.status ?? null,
    duration_ms: Math.round(input.duration_ms * 10) / 10,
  });
}
