import { Hono } from "npm:hono@4.7.2";
import { cors } from "npm:hono@4.7.2/cors";

const app = new Hono().basePath("/functions/v1/router");

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-client-info"]
}));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string | undefined | null): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const x = new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === m-1 && x.getUTCDate() === d;
}

function todayNepal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

app.get("/health", (c) => c.json({
  status: "online",
  runtime: "Deno",
  framework: "Hono"
}));

app.get("/sync", async (c) => {
  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) return c.json({ success: false, error: "invalid_date", expected: "YYYY-MM-DD" }, 400);

  const [{ getCalendarDate, getCalendarCoverage }, { calculateAstronomicalTithi }] = await Promise.all([
    import("./services/calendarService.ts"),
    import("./services/tithiEngine.ts")
  ]);

  const calendar = await getCalendarDate(date);
  if (!calendar) {
    return c.json({
      success: false,
      error: "date_outside_existing_patro_archive",
      query_date: date,
      coverage: getCalendarCoverage()
    }, 422);
  }

  const astronomy = calculateAstronomicalTithi({
    date,
    lat: 27.7172,
    lng: 85.3240,
    bsFormatted: calendar.bs.formatted,
    nsFormatted: calendar.ns.formatted
  });
  return c.json({
    success: true,
    query_date: date,
    calendars: {
      gregorian_ad: date,
      bikram_sambat: calendar.bs.formatted,
      nepal_sambat: calendar.ns.formatted,
      bikram_sambat_detail: calendar.bs,
      nepal_sambat_detail: calendar.ns
    },
    tithi: calendar.panchang.tithi,
    archive_panchang: calendar.panchang,
    astronomy
  }, 200, {
    "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400"
  });
});

app.get("/nasa/apod", async (c) => {
  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) return c.json({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
  const { fetchNasaApod } = await import("./services/nasaService.ts");
  const payload = await fetchNasaApod(date);
  return c.json(payload, 200, {
    "Cache-Control": payload.is_fallback
      ? "public, max-age=60, s-maxage=300"
      : "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
  });
});

app.get("/astronomy/tithi", async (c) => {
  const date = c.req.query("date") || todayNepal();
  if (!validDate(date)) return c.json({ error: "invalid_date", expected: "YYYY-MM-DD" }, 400);

  const latRaw = c.req.query("lat");
  const lngRaw = c.req.query("lng");
  const lat = latRaw == null ? 27.7172 : Number(latRaw);
  const lng = lngRaw == null ? 85.3240 : Number(lngRaw);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return c.json({ error: "invalid_lat" }, 400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return c.json({ error: "invalid_lng" }, 400);

  try {
    const [{ calculateAstronomicalTithi }, { getCalendarDate }] = await Promise.all([
      import("./services/tithiEngine.ts"),
      import("./services/calendarService.ts")
    ]);
    const calendar = await getCalendarDate(date);
    const result = calculateAstronomicalTithi({
      date,
      lat,
      lng,
      bsFormatted: calendar?.bs.formatted ?? null,
      nsFormatted: calendar?.ns.formatted ?? null
    });
    return c.json(result, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=1800"
    });
  } catch (error) {
    return c.json({ error: String((error as Error)?.message || error) }, 400);
  }
});

app.notFound((c) => c.json({
  error: "not_found",
  routes: ["/health", "/sync", "/nasa/apod", "/astronomy/tithi"]
}, 404));

app.onError((error, c) => {
  console.error("router_error", error);
  return c.json({ error: "internal_error" }, 500);
});

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  if (url.pathname === "/router" || url.pathname.startsWith("/router/")) {
    url.pathname = "/functions/v1" + url.pathname;
    const init: RequestInit = {
      method: req.method,
      headers: req.headers,
      body: (req.method === "GET" || req.method === "HEAD") ? undefined : req.body,
      redirect: req.redirect,
      signal: req.signal
    };
    return app.fetch(new Request(url.toString(), init));
  }
  return app.fetch(req);
});
