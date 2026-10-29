import { describe, expect, it } from "vitest";
import { NoopSink, TelemetryClient, sanitizeTelemetryProps, validateTelemetryEnvelope } from "../worker/roadmap/telemetry";

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
});
