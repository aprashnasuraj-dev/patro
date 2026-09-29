import { z } from "npm:zod@4.1.12";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const LEGACY_BASE = SUPABASE_URL + "/functions/v1/nepal-miti-protected";
const MONTH_KEYS = ["chaitra","vaishakha","jyestha","ashadha","shravana","bhadrapada","ashwin","kartika","margashirsha","pausha","magha","falguna"];

const tokenQuerySchema = z.object({
  token: z.string().min(40).max(80).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

const tithiEventSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(180),
  kind: z.enum(["shraddha","tithi_birthday","puja","vrata","custom"]),
  rule: z.object({
    month: z.number().int().min(0).max(11),
    paksha: z.enum(["shukla","krishna"]),
    tithi: z.number().int().min(1).max(15),
    observance: z.enum(["udaya","madhyahna","aparahna","pradosh","nishitha"]),
    adhik: z.enum(["nija","adhik","both"]).optional(),
    system: z.enum(["purnimanta","amanta"]).optional(),
  }),
  remindDaysBefore: z.array(z.number().int().min(0).max(365)).max(12),
  remindAt: z.string().regex(/^\d{2}:\d{2}$/),
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  updatedAt: z.number().optional(),
}).passthrough();

function serviceHeaders() {
  return { apikey: SERVICE_KEY, authorization: "Bearer " + SERVICE_KEY, "content-type": "application/json" };
}

function json(body: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

async function currentUserId(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || !SUPABASE_URL || !SERVICE_KEY) return null;
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => ({})) as { id?: string };
  return body.id || null;
}

function base64Url(bytes: Uint8Array) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createTithiFeedToken(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return json({ ok: false, error: "authentication_required" }, 401);
  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const parsed = z.object({}).strict().safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "invalid_request" }, 400);

  const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const saved = await fetch(SUPABASE_URL + "/rest/v1/personal_ics_tokens?on_conflict=user_id", {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, token_hash: tokenHash }),
    signal: AbortSignal.timeout(5000),
  });
  if (!saved.ok) return json({ ok: false, error: "feed_token_unavailable" }, 502);
  return json({ ok: true, path: "/api/v1/tools/tithi-feed.ics?token=" + token });
}

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function icsEsc(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function nextDate(date: string) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0,10);
}

async function loadEvents(userId: string) {
  const response = await fetch(
    SUPABASE_URL + "/rest/v1/user_calendar_state?user_id=eq." + encodeURIComponent(userId) + "&select=preferences&limit=1",
    { headers: serviceHeaders(), signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) return [];
  const rows = await response.json() as Array<{ preferences?: Record<string, unknown> }>;
  const preferences = rows[0]?.preferences;
  const life = preferences && typeof preferences.life_tools === "object" && preferences.life_tools
    ? preferences.life_tools as Record<string, unknown> : {};
  const raw = Array.isArray(life.tithiEvents) ? life.tithiEvents : [];
  return raw.slice(0, 30).map((event) => tithiEventSchema.safeParse(event)).filter((result) => result.success).map((result) => result.data);
}

async function nextOccurrences(event: z.infer<typeof tithiEventSchema>) {
  const rule = event.rule;
  const params = new URLSearchParams({
    month: MONTH_KEYS[rule.month],
    paksha: rule.paksha,
    tithi: String(rule.tithi),
    rule: rule.observance === "pradosh" ? "pradosha" : rule.observance,
    system: rule.system || "purnimanta",
    adhikPolicy: rule.adhik === "adhik" ? "adhik_month" : rule.adhik === "both" ? "both" : "nija_month",
    from: todayNepal(),
    count: "4",
  });
  const response = await fetch(LEGACY_BASE + "/api/v1/tithi/next?" + params.toString(), {
    headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [] as Array<{ adDate: string }>;
  const payload = await response.json() as { occurrences?: Array<{ adDate?: string }> };
  return (payload.occurrences || []).filter((row): row is { adDate: string } => typeof row.adDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.adDate));
}

export async function personalTithiFeed(request: Request) {
  const url = new URL(request.url);
  const parsed = tokenQuerySchema.safeParse({ token: url.searchParams.get("token") || "" });
  if (!parsed.success) return json({ ok: false, error: "invalid_feed_token" }, 400);

  const tokenHash = await sha256(parsed.data.token);
  const tokenResponse = await fetch(
    SUPABASE_URL + "/rest/v1/personal_ics_tokens?token_hash=eq." + encodeURIComponent(tokenHash) + "&select=user_id&limit=1",
    { headers: serviceHeaders(), signal: AbortSignal.timeout(5000) },
  );
  if (!tokenResponse.ok) return json({ ok: false, error: "feed_unavailable" }, 502);
  const tokenRows = await tokenResponse.json() as Array<{ user_id?: string }>;
  const userId = tokenRows[0]?.user_id;
  if (!userId) return json({ ok: false, error: "feed_not_found" }, 404);

  const events = await loadEvents(userId);
  const lines = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mero Patro//Private Tithi Feed//NE","CALSCALE:GREGORIAN",
    "X-WR-CALNAME:मेरो पात्रो · तिथि रिमाइन्डर","X-WR-TIMEZONE:Asia/Kathmandu","REFRESH-INTERVAL;VALUE=DURATION:P1D",
  ];
  for (const event of events) {
    const occurrences = await nextOccurrences(event);
    for (const occurrence of occurrences) {
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + icsEsc(event.id + "-" + occurrence.adDate + "@meropatro"),
        "DTSTART;VALUE=DATE:" + occurrence.adDate.replace(/-/g, ""),
        "DTEND;VALUE=DATE:" + nextDate(occurrence.adDate).replace(/-/g, ""),
        "SUMMARY:" + icsEsc(event.title),
        "DESCRIPTION:" + icsEsc("तिथि रिमाइन्डर · Mero Patro"),
      );
      for (const day of event.remindDaysBefore.filter((value) => value > 0)) {
        lines.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:" + icsEsc(event.title),"TRIGGER:-P" + day + "D","END:VALARM");
      }
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "content-disposition": 'inline; filename="mero-patro-tithi.ics"',
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
