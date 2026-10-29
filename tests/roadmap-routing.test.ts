import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { delete (globalThis as any).AafnaiRoutingV2; vi.useRealTimers(); });

async function api() {
  await import("../scripts/explore/nepal/map/routing-v2.js?test=" + Math.random());
  return (globalThis as any).AafnaiRoutingV2;
}

describe("Nepal routing v2 core", () => {
  it("normalizes provider failure and opens the circuit", async () => {
    const R = await api();
    const provider = { route: vi.fn(async () => { throw new R.RoutingError("upstream_5xx", "failed"); }) };
    const client = new R.Client(provider, { timeoutMs: 100, rateLimit: { capacity: 10, refillMs: 1 }, breaker: { threshold: 2, cooldownMs: 10000 } });
    const req = { from: { lat: 27.7, lng: 85.3 }, to: { lat: 27.8, lng: 85.4 }, mode: "car" };
    await expect(client.route(req)).rejects.toMatchObject({ code: "upstream_5xx" });
    await expect(client.route(req)).rejects.toMatchObject({ code: "upstream_5xx" });
    await expect(client.route(req)).rejects.toMatchObject({ code: "circuit_open" });
  });

  it("supports provider swap without changing the caller contract", async () => {
    const R = await api();
    const a = { route: async () => ({ geometry: { type: "LineString", coordinates: [] }, distance: 1, duration: 1, legs: [], warnings: [], confidence: null, provenance: { provider: "a" } }) };
    const b = { route: async () => ({ geometry: { type: "LineString", coordinates: [] }, distance: 2, duration: 2, legs: [], warnings: ["unknown_surface"], confidence: null, provenance: { provider: "b" } }) };
    const client = new R.Client(a, { rateLimit: { capacity: 10, refillMs: 1 } });
    expect((await client.route({ from:{lat:1,lng:1}, to:{lat:2,lng:2}, mode:"car" })).distance).toBe(1);
    client.setProvider(b);
    expect((await client.route({ from:{lat:1,lng:1}, to:{lat:2,lng:2}, mode:"car" })).distance).toBe(2);
  });

  it("classifies exact routed detour thresholds without geometric guesses", async () => {
    const R = await api();
    expect(R.detourClass(0)).toBe("10m");
    expect(R.detourClass(600)).toBe("10m");
    expect(R.detourClass(601)).toBe("30m");
    expect(R.detourClass(1800)).toBe("30m");
    expect(R.detourClass(1801)).toBe("over30m");
    expect(R.detourClass(Number.NaN)).toBe("unknown");
  });

  it("inserts detour candidate at the requested ordered stop index", async () => {
    const R = await api();
    const calls:any[] = [];
    const provider = { route: async (req:any) => {
      calls.push(req);
      return { geometry: { type: "LineString", coordinates: [] }, distance: 1200, duration: 900, legs: [], warnings: [], confidence: null, provenance: { provider: "mock" } };
    }};
    const client = new R.Client(provider, { rateLimit: { capacity: 10, refillMs: 1 } });
    const from={lat:1,lng:1,label:"A"}, first={lat:2,lng:2,label:"First"}, second={lat:3,lng:3,label:"Second"}, to={lat:4,lng:4,label:"B"}, candidate={lat:2.5,lng:2.5,label:"Candidate"};
    await client.detour({from,to,stops:[first,second],mode:"car",insertAt:1},{distance:1000,duration:600},candidate);
    expect(calls).toHaveLength(1);
    expect(calls[0].points.map((p:any)=>p.label)).toEqual(["A","First","Candidate","Second","B"]);
  });
});
