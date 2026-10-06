import { createPatroAdapter } from "../lib/patro";
import { createArchivePatroSource, type PatroEnv } from "./patro-source";

const MODERN = "2026-07-28";
const LEGACY = "2025-11-25";
const SERVER_INFO = { name: "aafnai-patro", version: "1.0.0" };

const TOOLS = [
  {
    name: "get_today",
    title: "Get today's Nepali calendar date",
    description: "Returns today's authoritative Aafnai Patro calendar record using the Asia/Kathmandu date boundary.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "convert_date",
    title: "Convert BS and AD dates",
    description: "Converts a Gregorian AD date to Bikram Sambat or a Bikram Sambat date to Gregorian AD from the same calendar archive used by Aafnai Patro.",
    inputSchema: {
      type: "object",
      properties: {
        ad: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Gregorian date YYYY-MM-DD" },
        bs: { type: "string", pattern: "^\\d{4}-\\d{1,2}-\\d{1,2}$", description: "Bikram Sambat date YYYY-M-D" }
      },
      additionalProperties: false,
      oneOf: [{ required: ["ad"] }, { required: ["bs"] }]
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "get_festival",
    title: "Look up a Nepali festival",
    description: "Finds a festival or holiday for a Bikram Sambat year from Aafnai Patro's validated calendar and panchang records.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", minLength: 1, maxLength: 80, description: "Festival slug or name, for example dashain or tihar" },
        year: { type: "integer", minimum: 1900, maximum: 2200, description: "Bikram Sambat year" }
      },
      required: ["slug", "year"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  }
] as const;

function responseHeaders(extra: Record<string, string> = {}) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
    ...extra
  };
}
function jsonRpc(id: unknown, result: any, status = 200, modern = false) {
  const body: any = { jsonrpc: "2.0", id: id ?? null, result };
  if (modern && body.result && typeof body.result === "object") {
    body.result._meta = { ...(body.result._meta || {}), "io.modelcontextprotocol/serverInfo": SERVER_INFO };
  }
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(modern ? { "MCP-Protocol-Version": MODERN } : {}) });
}
function rpcError(id: unknown, code: number, message: string, status = 200, data?: any, modern = false) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } }), { status, headers: responseHeaders(modern ? { "MCP-Protocol-Version": MODERN } : {}) });
}
function toolResult(value: unknown, isError = false) {
  return { resultType: "complete", content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, ...(isError ? { isError: true } : {}) };
}
function kathmanduAccessDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function validateModernEnvelope(request: Request, message: any) {
  const version = request.headers.get("MCP-Protocol-Version");
  if (version !== MODERN) return { ok: false, reason: "missing_or_unsupported_protocol_version" };
  if (request.headers.get("Mcp-Method") !== message.method) return { ok: false, reason: "method_header_mismatch" };
  if (message.method === "tools/call") {
    const name = String(message?.params?.name || "");
    if (!name || request.headers.get("Mcp-Name") !== name) return { ok: false, reason: "tool_name_header_mismatch" };
  }
  return { ok: true, reason: "" };
}

async function callTool(name: string, args: any, env: PatroEnv) {
  // Calendar reads use R2. Mutable/correctable festival records may still resolve through the
  // source's D1-backed listRecords implementation.
  const adapter = createPatroAdapter(createArchivePatroSource(env));
  if (name === "get_today") {
    const value = await adapter.getTodayNepal();
    return value ? toolResult(value) : toolResult({ error: "calendar_archive_unavailable" }, true);
  }
  if (name === "convert_date") {
    const hasAd = typeof args?.ad === "string" && args.ad.length > 0;
    const hasBs = typeof args?.bs === "string" && args.bs.length > 0;
    if (hasAd === hasBs) return toolResult({ error: "provide_exactly_one_of_ad_or_bs" }, true);
    const value = hasAd ? await adapter.convertAdToBs(args.ad) : await adapter.convertBsToAd(args.bs);
    return value ? toolResult(value) : toolResult({ error: "date_outside_or_archive_unavailable" }, true);
  }
  if (name === "get_festival") {
    const slug = typeof args?.slug === "string" ? args.slug.trim() : "";
    const year = Number(args?.year);
    if (!slug || !Number.isInteger(year)) return toolResult({ error: "invalid_festival_query" }, true);
    const value = await adapter.getFestival(slug, year);
    return value ? toolResult(value) : toolResult({ error: "festival_not_found", slug, year }, true);
  }
  return null;
}

export async function mcpResponse(request: Request, env: PatroEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/mcp") return null;

  if (request.method === "GET" || request.method === "HEAD") {
    const body = {
      name: "Aafnai Patro MCP",
      endpoint: "/mcp",
      supportedProtocolVersions: [MODERN, LEGACY],
      transport: "streamable-http",
      tools: TOOLS.map(({ name, title, description }) => ({ name, title, description })),
      citation: `Cite as: Aafnai Patro (aafnaipatro.com), accessed ${kathmanduAccessDate()}`
    };
    return new Response(request.method === "HEAD" ? null : JSON.stringify(body), { status: 200, headers: responseHeaders({ "cache-control": "public, max-age=300" }) });
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: responseHeaders({ allow: "GET, HEAD, POST" }) });

  let rpc: any;
  try { rpc = await request.json(); } catch { return rpcError(null, -32700, "Parse error", 400); }
  if (!rpc || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") return rpcError(rpc?.id, -32600, "Invalid Request", 400);

  const headerVersion = request.headers.get("MCP-Protocol-Version");
  const modern = headerVersion === MODERN || rpc.method === "server/discover";
  if (headerVersion && headerVersion !== MODERN && headerVersion !== LEGACY) return rpcError(rpc.id, -32022, "Unsupported protocol version", 400, { supportedVersions: [MODERN, LEGACY] });
  if (headerVersion === MODERN) {
    const envelope = validateModernEnvelope(request, rpc);
    if (!envelope.ok) return rpcError(rpc.id, -32020, "MCP request headers do not match the request envelope", 400, { reason: envelope.reason }, true);
  }

  if (rpc.method === "server/discover") {
    return jsonRpc(rpc.id, {
      resultType: "complete", supportedVersions: [MODERN], serverInfo: SERVER_INFO, capabilities: { tools: {} },
      instructions: "Use get_today for the Nepal-date answer, convert_date for BS↔AD conversion, and get_festival for a festival lookup. Calendar results come from Aafnai Patro's immutable R2 archive.",
      ttlMs: 3600000, cacheScope: "public"
    }, 200, true);
  }
  if (rpc.method === "initialize") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id ?? null, result: { protocolVersion: LEGACY, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: "Deterministic Nepali calendar tools backed by Aafnai Patro." } }), { status: 200, headers: responseHeaders({ "MCP-Protocol-Version": LEGACY }) });
  }
  if (rpc.method === "notifications/initialized") return new Response(null, { status: 202, headers: responseHeaders({ "MCP-Protocol-Version": LEGACY }) });
  if (rpc.method === "tools/list") return jsonRpc(rpc.id, { ...(modern ? { resultType: "complete", ttlMs: 3600000, cacheScope: "public" } : {}), tools: TOOLS }, 200, modern);
  if (rpc.method === "tools/call") {
    const name = String(rpc?.params?.name || "");
    const result = await callTool(name, rpc?.params?.arguments || {}, env);
    if (!result) return rpcError(rpc.id, -32602, "Unknown tool", 200, { name }, modern);
    return jsonRpc(rpc.id, result, 200, modern);
  }
  if (rpc.method === "ping") return jsonRpc(rpc.id, {}, 200, modern);
  return rpcError(rpc.id, -32601, "Method not found", modern ? 400 : 200, undefined, modern);
}
