export type TelemetryProduct = "nepalmap" | "bali";
export type DeviceClass = "mobile" | "tablet" | "desktop" | "unknown";

export const TELEMETRY_EVENTS = [
  "nepalmap.search.started", "nepalmap.search.result_selected", "nepalmap.search.zero_result",
  "nepalmap.filter.used", "nepalmap.district.selected", "nepalmap.near_me.used",
  "nepalmap.route.requested", "nepalmap.route.succeeded", "nepalmap.route.failed",
  "nepalmap.along_route.discovered", "nepalmap.external_directions.used",
  "nepalmap.view.toggled", "nepalmap.share.used",
  "bali.today.navigated", "bali.date.navigated", "bali.month.navigated",
  "bali.festival.opened", "bali.wuku.explored", "bali.otonan.calculated",
  "bali.rerainan.searched", "bali.feed.subscribed", "bali.reminder.created",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENTS)[number];
export type TelemetryEnvelope = {
  event: TelemetryEventName; schema_version: 1; ts: string; product: TelemetryProduct;
  surface: string; locale: string; device_class: DeviceClass; country_code: string | null;
  session_id: string; props: Record<string, unknown>;
};

const BLOCKED = /^(lat|latitude|lng|lon|longitude|bbox|bounding_?box|ip|ip_?address|user_?agent|referrer|full_?referrer|query|search_?text|address)$/i;
let memorySessionId = "";

export function sessionId(): string {
  if (memorySessionId) return memorySessionId;
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  memorySessionId = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return memorySessionId;
}
export function resetSessionIdForTest(): void { memorySessionId = ""; }

export function sanitizeTelemetryProps(input: Record<string, unknown>): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (!BLOCKED.test(key)) out[key] = visit(child);
    }
    return out;
  };
  return visit(input) as Record<string, unknown>;
}

export function validateTelemetryEnvelope(value: TelemetryEnvelope): string[] {
  const errors: string[] = [];
  if (!(TELEMETRY_EVENTS as readonly string[]).includes(value.event)) errors.push("unknown event");
  if (value.schema_version !== 1) errors.push("schema_version must be 1");
  if (!value.ts || Number.isNaN(Date.parse(value.ts))) errors.push("invalid ts");
  if (!value.session_id) errors.push("missing session_id");
  const scan = (obj: unknown, path = "props") => {
    if (Array.isArray(obj)) return obj.forEach((v, i) => scan(v, `${path}[${i}]`));
    if (!obj || typeof obj !== "object") return;
    for (const [key, child] of Object.entries(obj as Record<string, unknown>)) {
      if (BLOCKED.test(key)) errors.push(`forbidden telemetry field: ${path}.${key}`);
      scan(child, `${path}.${key}`);
    }
  };
  scan(value.props);
  return errors;
}

export interface TelemetrySink { send(batch: readonly TelemetryEnvelope[]): Promise<void>; }
export class NoopSink implements TelemetrySink { async send(_batch: readonly TelemetryEnvelope[]): Promise<void> {} }
export class ConsoleSink implements TelemetrySink {
  async send(batch: readonly TelemetryEnvelope[]): Promise<void> { console.info("[roadmap-telemetry]", batch); }
}

export class HttpSink implements TelemetrySink {
  constructor(private readonly endpoint: string) {
    if (!endpoint.startsWith("/")) throw new Error("telemetry endpoint must be same-origin");
  }
  async send(batch: readonly TelemetryEnvelope[]): Promise<void> {
    if (!batch.length) return;
    const body = JSON.stringify({ events: batch });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(this.endpoint, new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`telemetry sink returned ${response.status}`);
  }
}

export type TelemetryClientOptions = {
  sink?: TelemetrySink; consent?: () => boolean; sampleRate?: number; batchSize?: number; maxQueue?: number; flushAfterMs?: number;
};

export class TelemetryClient {
  private readonly sink: TelemetrySink;
  private readonly consent: () => boolean;
  private readonly sampleRate: number;
  private readonly batchSize: number;
  private readonly maxQueue: number;
  private readonly flushAfterMs: number;
  private queue: TelemetryEnvelope[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(options: TelemetryClientOptions = {}) {
    this.sink = options.sink ?? new NoopSink();
    this.consent = options.consent ?? (() => false);
    this.sampleRate = Math.max(0, Math.min(1, options.sampleRate ?? 1));
    this.batchSize = Math.max(1, options.batchSize ?? 10);
    this.maxQueue = Math.max(this.batchSize, options.maxQueue ?? 100);
    this.flushAfterMs = Math.max(250, options.flushAfterMs ?? 5000);
  }
  enqueue(input: Omit<TelemetryEnvelope, "schema_version" | "ts" | "session_id" | "props"> & { props?: Record<string, unknown> }): boolean {
    if (!this.consent() || Math.random() > this.sampleRate) return false;
    const event: TelemetryEnvelope = { ...input, schema_version: 1, ts: new Date().toISOString(), session_id: sessionId(), props: sanitizeTelemetryProps(input.props ?? {}) };
    const errors = validateTelemetryEnvelope(event);
    if (errors.length) throw new Error(errors.join("; "));
    if (this.queue.length >= this.maxQueue) this.queue.shift();
    this.queue.push(event);
    if (this.queue.length >= this.batchSize) {
      void this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush().catch(() => undefined);
      }, this.flushAfterMs);
    }
    return true;
  }
  async flush(): Promise<void> {
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (!this.queue.length) return;
    const batch = this.queue.splice(0, this.batchSize);
    try { await this.sink.send(batch); }
    catch (error) { this.queue = batch.concat(this.queue).slice(0, this.maxQueue); throw error; }
  }
  queued(): number { return this.queue.length; }
}
