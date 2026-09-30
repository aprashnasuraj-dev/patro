# Cloudflare Git Deployment Runbook

Production migration branch: `cloudflare-migration`.

## Target topology

```text
Cloudflare Pages: mero-patro-pages
        |
        | PATRO_API service binding
        v
Cloudflare Worker: mero-patro
        |
        +-- D1 binding DB
        +-- KV binding CACHE
        +-- external public APIs
        +-- temporary Supabase compatibility fallback
```

## 1. Repository gate

Run:

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run cloudflare:validate
```

Required archive invariants:

```text
parts:          78
rows:           77,070
first AD date:  1826-04-11
last AD date:   2037-04-13
final part:     70 rows
source version: patro-archive-v79
```

Validation is intentionally `--verify-only`: normal CI does not build the large one-time SQL import.

## 2. Provision data resources

Create:

```text
D1 database: mero-patro
KV namespace: mero-patro-cache
```

Set Worker build variables:

```text
CF_D1_DATABASE_ID=<D1 UUID>
CF_KV_NAMESPACE_ID=<KV UUID>
```

Optional:

```text
CF_D1_DATABASE_NAME=mero-patro
CF_D1_PREVIEW_DATABASE_ID=<preview D1 UUID>
CF_KV_PREVIEW_NAMESPACE_ID=<preview KV UUID>
```

Do not commit a generated `wrangler.generated.jsonc`; it is ignored by Git.

## 3. Perform the one-time native bootstrap

Before enabling automatic routine deploys, run once in an authenticated Cloudflare environment:

```bash
npm run deploy:cloudflare:bootstrap
```

This command:

1. builds the app;
2. generates `.cloudflare/d1-import/content-snapshot.sql`;
3. verifies statement-size and snapshot invariants;
4. generates the bound Wrangler config;
5. applies `cloudflare/d1/schema-migrations`;
6. imports the sanitized public/reference snapshot with `wrangler d1 execute --file`;
7. prints D1 table counts and `migration_state`;
8. deploys `mero-patro`.

Cloudflare D1 currently allows imports up to 5 GB and SQL statements up to 100 KB. The generator validates the statement limit before upload.

The import is deterministic and built from the canonical `migration/data/public` snapshots plus the retained 22-row universal Rashifal seed. It may be retried if Cloudflare reports a failed import, chunk-rewrites oversized payloads, and does not include private/user Supabase tables.

## 4. Worker Git integration after bootstrap

Cloudflare Workers → Import repository:

```text
Repository: aprashnasuraj-dev/patro
Branch:     cloudflare-migration
Name:       mero-patro
Build:      npm run build
Deploy:     npm run deploy:cloudflare
```

The Worker name must match the Wrangler `name`.

Add build variables from step 2 and runtime secret:

```text
NASA_API_KEY
```

Routine deployment applies schema migrations before Worker publication. It does not reimport the full content snapshot.

## 5. Worker smoke tests

Verify:

```text
GET /api/v1/health
GET /api/v1/sync?date=1826-04-11
GET /api/v1/sync?date=2026-09-30
GET /api/v1/sync?date=2037-04-13
GET /api/v1/astronomy/tithi?date=2026-09-30&lat=27.7172&lng=85.3240
GET /api/v1/nasa/apod?date=2026-09-30
GET /api/v1/tools/catalog
GET /api/v1/time-machine
GET /api/v1/on-this-day?date=2026-09-30
GET /api/v1/rashifal/universal?period=daily&system=vedic&calendar=bs&date=2026-09-30
```

With full bindings, health should report native D1 mode. The `x-patro-backend: supabase-compat` header identifies compatibility responses.

## 6. Create Pages Git project

Create a separate Pages project from the same repository:

```text
Project name:       mero-patro-pages
Repository:         aprashnasuraj-dev/patro
Production branch:  cloudflare-migration
Build command:      npm run build
Build output:       dist
Root directory:     repository root
```

`vite.config.ts` builds the main app under `dist/astro`; `emit-cloudflare-root.mjs` emits the root SPA/PWA shell and Pages headers into `dist/`.

## 7. Bind Pages to the Worker

Repository config: `wrangler.pages.jsonc`.

Required binding:

```text
PATRO_API -> mero-patro
```

If Git import does not apply it automatically:

Settings → Bindings → Add → Service binding.

The Pages functions:

```text
functions/api/[[path]].js
functions/fm-v2-stream/[[path]].js
```

forward requests through the service binding without a public Internet hop.

## 8. Pages smoke tests

Check:

- `/`
- `/astro`
- `/fm`
- `/tv`
- `/tools`
- `/tools/nepali-typing`
- `/jyotish/janma-patro`
- `/my-diary`
- `/api/v1/health`
- manifest + service worker
- direct navigation/refresh on SPA routes

## 9. Parity gates

Test more than the home page:

- earliest and latest calendar boundaries;
- current calendar;
- month-grid/range requests;
- Nepal Sambat;
- Time Machine and On This Day;
- Rashifal/Jyotish;
- tool catalog and representative tools;
- FM catalog/stream;
- live TV/HLS;
- APOD upstream failure/fallback;
- PWA install/update path.

## 10. Domain cutover

Keep Vercel production available.

Recommended sequence:

1. Worker bootstrap and D1 verification.
2. Worker preview/smoke tests.
3. Pages preview validation.
4. Attach production domain to Pages.
5. Observe Worker/Pages logs and compatibility fallback rate.
6. Migrate remaining compatibility routes individually.
7. Retire Vercel/Supabase components only after legitimate traffic reaches zero.

## 11. Rollback

Frontend: move the production domain back to the previous Vercel deployment.

API: keep the compatibility Worker/Supabase origins available until the observation window closes.

Data: do not delete Supabase tables/functions during initial cutover. D1 is populated from deterministic checked-in snapshots and the existing source remains the rollback authority until parity is signed off.

## 12. Secret policy

Never expose in Vite/browser configuration:

- Supabase service-role keys;
- database passwords;
- NASA/provider credentials;
- Cloudflare API tokens.

The Worker needs only declared runtime secrets. Cloudflare build IDs are resource identifiers, not browser variables.
