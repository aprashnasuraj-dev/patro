import { createPatroAdapter } from "../lib/patro";
import { createD1PatroSource, type PatroEnv } from "./patro-source";

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

function jsonRpc(id: unknown, result: any, status = 200, modern = false) {
  const body: any = { jsonrpc: "2.0", id: id ?? null, result };
  if (modern && body.result && typeof body.result === "object") {
    body.result._meta = {
      ...(body.result._meta || {}),
      "io.modelcontextprotocol/serverInfo": SERVER_INFO
    };
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200, data?: any) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}

function toolResult(value: unknown, isError = false) {
  return {
    resultType: "complete",
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
    ...(isError ? { isError: true } : {})
  };
}

async function callTool(name: string, args: any, env: PatroEnv) {
  const adapter = createPatroAdapter(createD1PatroSource(env));
  if (name === "get_today") {
    const value = await adapter.getTodayNepal();
    return value ? toolResult(value) : toolResult({ error: "calendar_unavailable" }, true);
  }
  if (name === "convert_date") {
    const hasAd = typeof args?.ad === "string";
    const hasBs = typeof args?.bs === "string";
    if (hasAd === hasBs) return toolResult({ error: "provide_exactly_one_of_ad_or_bs" }, true);
    const value = hasAd ? await adapter.convertAdToBs(args.ad) : await adapter.convertBsToAd(args.bs);
    return value ? toolResult(value) : toolResult({ error: "date_outside_archive" }, true);
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
      tools: TOOLS.map(({ name, title, description }) => ({ name, title, description })),
      citation: `Cite as: Aafnai Patro (aafnaipatro.com), accessed ${new Date().toISOString().slice(0, 10)}`
    };
    return new Response(request.method === "HEAD" ? null : JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex, nofollow" }
    });
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "GET, HEAD, POST" } });

  let rpc: any;
  try { rpc = await request.json(); } catch { return rpcError(null, -32700, "Parse error", 400); }
  if (!rpc || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") return rpcError(rpc?.id, -32600, "Invalid Request", 400);

  const metaVersion = rpc?.params?._meta?.["io.modelcontextprotocol/protocolVersion"];
  const headerVersion = request.headers.get("MCP-Protocol-Version");
  const modern = metaVersion === MODERN || headerVersion === MODERN || rpc.method === "server/discover";

  if (rpc.method === "server/discover") {
    return jsonRpc(rpc.id, {
      resultType: "complete",
      supportedVersions: [MODERN],
      capabilities: { tools: {} },
      instructions: "Use get_today for the Nepal-date answer, convert_date for BS↔AD conversion, and get_festival for a festival lookup. Results come from the same Aafnai Patro calendar source used by the site.",
      ttlMs: 3600000,
      cacheScope: "public"
    }, 200, true);
  }

  if (rpc.method === "initialize") {
    return jsonRpc(rpc.id, {
      protocolVersion: LEGACY,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions: "Deterministic Nepali calendar tools backed by Aafnai Patro."
    });
  }
  if (rpc.method === "notifications/initialized") return new Response(null, { status: 202 });

  if (modern && headerVersion && headerVersion !== MODERN) {
    return rpcError(rpc.id, -32022, "Unsupported protocol version", 400, { supportedVersions: [MODERN] });
  }

  if (rpc.method === "tools/list") {
    return jsonRpc(rpc.id, { resultType: "complete", tools: TOOLS }, 200, modern);
  }
  if (rpc.method === "tools/call") {
    const name = String(rpc?.params?.name || "");
    const result = await callTool(name, rpc?.params?.arguments || {}, env);
    if (!result) return rpcError(rpc.id, -32602, "Unknown tool", 200, { name });
    return jsonRpc(rpc.id, result, 200, modern);
  }
  if (rpc.method === "ping") return jsonRpc(rpc.id, {});
  return rpcError(rpc.id, -32601, "Method not found", modern ? 400 : 200);
}
