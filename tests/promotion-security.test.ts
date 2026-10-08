import { describe, expect, it } from "vitest";
import { handleJyotishChat } from "../worker/jyotish";

const endpoint = "https://aafnaipatro.com/api/v1/jyotish-chat";
const env = {} as Parameters<typeof handleJyotishChat>[1];

function request(method: "GET" | "OPTIONS" | "POST", origin?: string) {
  return new Request(endpoint, {
    method,
    headers: {
      ...(origin ? { origin } : {}),
      "content-type": "application/json",
    },
    ...(method === "POST" ? { body: JSON.stringify({ message: "test" }) } : {}),
  });
}

describe("pre-promotion chat origin and quota protections", () => {
  it("blocks foreign-site preflight before cross-origin paid chat calls", async () => {
    const response = await handleJyotishChat(request("OPTIONS", "https://example.com"), env);
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("forbidden_origin");
  });

  it("blocks direct foreign-origin POSTs, including preflight-free text/plain requests", async () => {
    const response = await handleJyotishChat(request("POST", "https://example.com"), env);
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("forbidden_origin");
    const simple = new Request(endpoint, {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "text/plain" },
      body: '{"message":"test"}',
    });
    expect((await handleJyotishChat(simple, env)).status).toBe(403);
  });

  it("keeps first-party browser preflight and read-only service discovery", async () => {
    const preflight = await handleJyotishChat(request("OPTIONS", "https://aafnaipatro.com"), env);
    expect(preflight.status).toBe(204);
    const health = await handleJyotishChat(request("GET", "https://example.com"), env);
    expect(health.status).toBe(200);
    expect((await health.json()).streaming).toBe(true);
  });

  it("retains same-origin message validation without requiring any AI credentials", async () => {
    const missing = new Request(endpoint, {
      method: "POST",
      headers: { origin: "https://aafnaipatro.com", "content-type": "application/json" },
      body: "{}",
    });
    const response = await handleJyotishChat(missing, env);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("message_required");
  });
});
