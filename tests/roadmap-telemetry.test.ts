import { describe, expect, it, vi } from "vitest";
import { HttpSink, NoopSink, TelemetryClient, sanitizeTelemetryProps, validateTelemetryEnvelope, type TelemetryEnvelope, type TelemetrySink } from "../worker/roadmap/telemetry";

describe("roadmap telemetry privacy contract", () => {
  it("strips precise-location and raw free-text fields recursively", () => {
    expect(sanitizeTelemetryProps({
      lat: 27.7, lng: 85.3, query: "home address", ip_address: "hidden",
      user_agent: "hidden", referrer: "hidden", safe: "ok",
      nested: { latitude: 1, bbox: [1,2,3,4], query_token_count: 2 },
    })).toEqual({ safe: "ok", nested: { query_token_count: 2 } });
  });

  it("rejects forbidden fields if an envelope bypasses sanitization", () => {
    const errors = validateTelemetryEnvelope({
      event: "nepalmap.route.requested", schema_version: 1, ts: new Date().toISOString(),
      product: "nepalmap", surface: "route", locale: "en", device_class: "mobile",
      country_code: "NP", session_id: "session", props: { longitude: 85.3 },
    });
    expect(errors.join(" ")).toContain("forbidden telemetry field");
  });

  it("defaults consent off and queues nothing", () => {
    const c = new TelemetryClient({ sink: new NoopSink() });
    expect(c.enqueue({ event: "bali.date.navigated", product: "bali", surface: "day", locale: "id", device_class: "mobile", country_code: null })).toBe(false);
    expect(c.queued()).toBe(0);
  });

  it("flushes a partial batch after the configured window", async () => {
    vi.useFakeTimers();
    const sent: TelemetryEnvelope[][] = [];
    const sink: TelemetrySink = { async send(batch) { sent.push([...batch]); } };
    const client = new TelemetryClient({ sink, consent: () => true, batchSize: 10, flushAfterMs: 250 });
    client.enqueue({ event: "bali.date.navigated", product: "bali", surface: "day", locale: "id", device_class: "mobile", country_code: null });
    expect(client.queued()).toBe(1);
    await vi.advanceTimersByTimeAsync(251);
    expect(sent).toHaveLength(1);
    expect(client.queued()).toBe(0);
    vi.useRealTimers();
  });

  it("refuses cross-origin HTTP telemetry endpoints", () => {
    expect(() => new HttpSink("https://example.com/events")).toThrow("same-origin");
    expect(() => new HttpSink("/api/telemetry")).not.toThrow();
  });
});
