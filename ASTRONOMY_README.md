# Patro Astronomical Calendar Synchronization

This branch migrates Patro to a static React/Vite SPA on Vercel. All dynamic calendar, NASA and astronomical work is routed to the single Supabase Edge Function `router` (Deno + Hono). The browser calls only relative `/api/v1/*` URLs.

## Runtime secrets

The router reads:

- `NASA_API_KEY` — NASA Open APIs key. If absent, the APOD service falls back to `DEMO_KEY`.
- `SUPABASE_URL` — the existing Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the existing project service-role key. Never expose this to the SPA.

Hosted Supabase Edge Functions receive the Supabase project runtime variables. Set the NASA key in Supabase Edge Function secrets, for example:

```bash
supabase secrets set NASA_API_KEY=YOUR_NASA_API_KEY --project-ref pxlsmxbpgdfzjzuqtict
```

For local Edge Function work, provide all three variables in a local, uncommitted env file.

## Database

The idempotent migration is:

`supabase/migrations/20260928_nasa_apod_cache.sql`

It creates `public.nasa_apod_cache(date text primary key, payload jsonb, created_at timestamptz)` when absent and enables RLS. The router uses the service role; the SPA never reads this cache directly.

Existing Patro calendar logic is reused through `public.astronomy_calendar_map`. No existing calendar archive is rewritten.

## Deploy the single Edge Function

```bash
supabase functions deploy router --project-ref pxlsmxbpgdfzjzuqtict --no-verify-jwt
```

JWT verification is disabled intentionally because the four documented GET endpoints are public read-only endpoints. The service-role key remains server-side inside the Edge Function.

## Build the static SPA

```bash
npm install
npm run build
```

Vite emits only static assets in `dist/`. There are no Next.js server components, `app/api/*` handlers, or Vercel serverless functions.

## Vercel proxy

`vercel.json` contains only the required API rewrite to:

`https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/:path*`

and the SPA fallback to `/index.html`.

## Endpoint validation

Direct Supabase:

```bash
curl -fsS https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/health
curl -fsS 'https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/sync?date=2026-09-28'
curl -fsS 'https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/nasa/apod?date=2026-09-28'
curl -fsS 'https://pxlsmxbpgdfzjzuqtict.supabase.co/functions/v1/router/astronomy/tithi?date=2026-09-28&lat=27.7172&lng=85.3240'
```

Through Vercel after the proxy is enabled:

```bash
curl -fsS https://patro-blush.vercel.app/api/v1/health
curl -fsS 'https://patro-blush.vercel.app/api/v1/sync?date=2026-09-28'
curl -fsS 'https://patro-blush.vercel.app/api/v1/nasa/apod?date=2026-09-28'
curl -fsS 'https://patro-blush.vercel.app/api/v1/astronomy/tithi?date=2026-09-28&lat=27.7172&lng=85.3240'
```

Expected health payload:

```json
{"status":"online","runtime":"Deno","framework":"Hono"}
```

For 2026-09-28, `/sync` resolves the existing archive to BS 2083-06-12 and the archived Krishna Paksha Dwitiya entry. The astronomical endpoint computes the phase independently.

## Precision

The interactive Tithi engine uses `astronomy-engine` analytic geocentric ecliptic Sun/Moon positions. It is substantially stronger than a mean-motion approximation but it is not a NASA/JPL DE binary ephemeris. Near exact ceremonial Tithi boundaries, cross-check against an authoritative Panchanga or a JPL-DE-based ephemeris.
