export function nepalPathGroup(pathname: string): string {
  if (/^\/api\/nepal\/v1\/place\/[^/]+$/.test(pathname)) return "/api/nepal/v1/place/:id";
  if (/^\/api\/nepal\/v1\/corrections\/[^/]+$/.test(pathname)) return "/api/nepal/v1/corrections/:id";
  if (pathname.startsWith("/api/nepal/v1/")) return pathname.replace(/\/$/, "");
  return pathname;
}

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
    path_group: nepalPathGroup(input.pathname),
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
