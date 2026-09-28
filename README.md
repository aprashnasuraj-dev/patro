# Patro — Astronomical Calendar SPA

Patro is deployed as a **static React + Vite SPA on Vercel** with all dynamic
calendar, astronomy, NASA and database work centralized in one Supabase Edge
Function named `router` (Deno + Hono).

## Runtime boundary

```text
Browser
  │
  ├── static HTML / CSS / JS ───────────────> Vercel CDN
  │
  └── /api/v1/* ── Vercel rewrite ─────────> Supabase Edge Function: router
                                               ├── existing Patro AD/BS/NS archive
                                               ├── Astronomy Engine tithi math
                                               ├── nasa_apod_cache
                                               └── NASA APOD upstream
```

There are **no Vercel Serverless Functions, Next.js route handlers or server
components** in this branch. The earlier Python Rashifal Vercel function and its
Python requirements were removed as part of this architecture cutover.

The public GitHub repository contains the complete router source, but it does
**not** publish Patro's proprietary historical calendar rows. Those rows were
migrated once, server-side, into the private RLS-enabled
`astronomy_calendar_map` table in the existing Supabase project. The
`calendarService.ts` adapter reads only that private table with the Edge
Function service role, so the static browser bundle never receives raw archive
data.

## Frontend

```bash
npm install
npm run dev
npm run build

# Vite's development proxy preserves the same relative /api/v1/* contract
```

Production output is `dist/`. The SPA calls only these relative endpoints:

- `GET /api/v1/health`
- `GET /api/v1/sync?date=YYYY-MM-DD`
- `GET /api/v1/nasa/apod?date=YYYY-MM-DD`
- `GET /api/v1/astronomy/tithi?date=YYYY-MM-DD&lat=27.7172&lng=85.3240`

The required single-date `/sync?date=` contract remains unchanged. The SPA month
grid additionally uses the same `/sync` route in bounded batch mode
(`?start=YYYY-MM-DD&end=YYYY-MM-DD`, maximum 62 days) so a 42-cell calendar
view performs one Edge Function/database range request instead of 42 individual
requests.

## Supabase environment

The `router` runtime reads:

- `NASA_API_KEY` — set this explicitly for production. `DEMO_KEY` is only a
  resilience fallback and has a much lower quota.
- `SUPABASE_URL` — provided automatically to Supabase Edge Functions.
- `SUPABASE_SERVICE_ROLE_KEY` — provided automatically to Supabase Edge
  Functions. It is server-only and must never be exposed to the browser.

Set the NASA key:

```bash
supabase link --project-ref pxlsmxbpgdfzjzuqtict
supabase secrets set NASA_API_KEY=YOUR_NASA_API_KEY
```

Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as project
runtime secrets. Verify that the function is running in the linked project
rather than copying either value into frontend environment variables.

## Deploy the Edge Function

The function name is exactly `router` and the public calendar endpoints are
intentionally callable without a Supabase JWT because Vercel proxies them as the
public Patro API surface.

```bash
supabase functions deploy router --project-ref pxlsmxbpgdfzjzuqtict --no-verify-jwt
```

The deployed Hono app keeps the explicit base path
`/functions/v1/router`. The entrypoint also normalizes Supabase gateway paths
before handing requests to Hono, because the Edge runtime receives the function
slug as `/router/*`.

## Database migration

Apply both schema migrations:

- `supabase/migrations/20260928090000_astronomical_sync_apod_cache.sql`
- `supabase/migrations/20260928093000_astronomical_sync_calendar_map.sql`

Both tables are RLS-enabled with no browser policy. Only the service-role-backed
Edge Function can read/write them. In the existing production project, the
calendar map has already been populated from the current Patro archive with
**77,070 contiguous dates from 1826-04-11 through 2037-04-13**. That one-time
data migration is intentionally not published in the public repository.

## Vercel

`vercel.json` contains only the required API proxy and SPA fallback:

```json
{
  "version": 2,
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/api/v1/:path*",
      "destination": "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Connect the repository to the existing Vercel `patro` project. Vercel detects
Vite, runs `npm run build`, serves `dist/` as static assets, and performs only
the rewrites above.

## Endpoint tests

Direct Edge Function:

```bash
curl -i "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/health"
curl -i "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/sync?date=2026-09-28"
curl -i "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/nasa/apod?date=2026-09-28"
curl -i "https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/astronomy/tithi?date=2026-09-28&lat=27.7172&lng=85.3240"
```

After Vercel deployment, verify the same routes through the production proxy:

```bash
curl -i "https://patro-blush.vercel.app/api/v1/health"
curl -i "https://patro-blush.vercel.app/api/v1/sync?date=2026-09-28"
curl -i "https://patro-blush.vercel.app/api/v1/nasa/apod?date=2026-09-28"
curl -i "https://patro-blush.vercel.app/api/v1/astronomy/tithi?date=2026-09-28&lat=27.7172&lng=85.3240"
```

Expected health response:

```json
{"status":"online","runtime":"Deno","framework":"Hono"}
```

For `2026-09-28`, the current Patro archive maps the date to BS
`2083-06-12` and Nepal Sambat `1146 Yanlā ga Nimilā`. The archive and
calculated engine both identify Krishna Dwitiya (Tithi 17) for the Kathmandu
reference date.

## Astronomy precision

The real-time Tithi engine uses Astronomy Engine 2.1.19 for geocentric ecliptic
Sun/Moon longitudes:

```text
Δθ = (λMoon − λSun) mod 360°
T  = floor(Δθ / 12°) + 1
progress = (Δθ mod 12°) / 12°
illumination = (1 − cos Δθ) / 2
```

Kshaya and Adhika awareness is determined by comparing Tithis at consecutive
local sunrises. Sunrise is resolved with Astronomy Engine's rise/set search for
the requested latitude/longitude, and date-only Tithi evaluation is anchored at
that sunrise. Astronomy Engine uses analytical ephemeris models rather than a
NASA JPL DE binary kernel, so dates very close to a Tithi boundary should be
cross-checked against an authoritative Panchanga or a JPL-DE-backed ephemeris
when ceremonial minute-level precision matters.

## Production verification checklist

- Vercel deployment contains static output only; no `api/*` function runtime.
- `/api/v1/health` returns the Deno/Hono health contract through Vercel.
- APOD first request creates one `nasa_apod_cache` row; repeats do not consume
  another upstream NASA request.
- Video APOD entries resolve to a YouTube thumbnail; upstream errors return the
  NASA SVS image with `is_fallback: true`.
- The month grid works in AD and BS modes and every day displays a Tithi badge.
- Today, selected date, Purnima and Amavasya remain visually distinct.
- Keyboard focus, reduced-motion mode, mobile layout and NASA drawer are usable.
- Existing Patro date archive remains server-side and is never bundled into the
  public SPA.
