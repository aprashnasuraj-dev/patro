# Cloudflare Git Deployment Runbook

This document describes the **current production topology** for Aafnai Patro. Do not use the retired `cloudflare-migration` / `mero-patro` / separate Pages topology for a new deployment.

## Current production target

```text
GitHub: aprashnasuraj-dev/patro
Branch: main
        |
        v
Cloudflare Worker: patro
Entrypoint: worker/connected-entry.ts
        |
        +-- Static Assets binding: ASSETS -> ./dist
        +-- D1 binding: DB -> patro
        +-- canonical custom domain: aafnaipatro.com
        +-- native Cloudflare APIs first
        +-- selective Supabase compatibility fallback for TV / FM / Samachar only
```

The production deployment is a **single Cloudflare Worker with Static Assets**. A separate Pages project is not required for the current rebuild path.

## 1. Repository gate

Use Node.js 22 and run:

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run cloudflare:production-check
npm run cloudflare:validate
```

`cloudflare:validate` builds the complete app, verifies migration inventory and calendar snapshots, then performs Wrangler dry-runs for both:

- `wrangler.jsonc` — canonical deploy configuration
- `wrangler.toml` — default Git-import discovery configuration

Both configs must stay aligned.

## 2. Reconnect / import the Git repository

In Cloudflare Workers & Pages, reconnect GitHub if necessary and import:

```text
Repository:        aprashnasuraj-dev/patro
Production branch: main
Worker name:       patro
Build command:     npm run cloudflare:production-check
Deploy command:    npm run deploy:cloudflare
Root directory:    repository root
```

Do not create or select a Worker named `mero-patro` for this deployment.

If the old Git integration reports:

```text
Preview creation failed: This Worker does not exist on your account.
```

remove/reconnect the stale Cloudflare Git project or import the repository as the `patro` Worker again. The GitHub-side code cannot repair a deleted Cloudflare service before Cloudflare has re-established that service connection.

## 3. Production Wrangler configuration

Production-critical values are committed in `wrangler.jsonc` and mirrored in `wrangler.toml`:

```text
name:              patro
main:              worker/connected-entry.ts
preview URLs:      disabled
custom domain:     aafnaipatro.com
assets directory:  ./dist
assets 404 mode:   none
D1 binding:        DB
D1 database:       patro
D1 database ID:    fb25c860-01db-4ab0-9036-7f87b26ca64b
```

The existing D1 database is part of the production configuration. Do **not** create a blank replacement D1 database unless you intentionally want to perform a full data bootstrap and update the committed binding.

## 4. What the deploy command does

```bash
npm run deploy:cloudflare
```

performs this order:

1. production build;
2. removes `dist/_redirects` so Workers Static Assets cannot interpret Pages redirects;
3. applies pending D1 schema migrations to the bound `DB` database;
4. deploys `worker/connected-entry.ts` plus the built static assets.

Routine deploys do not bulk-reseed the public archive.

## 5. Static/UI features included in every build

The build must emit the React SPA plus retained standalone suites. In particular, `scripts/emit-community-suites.mjs` fails the build unless all seven community routes are produced:

```text
/nepal-sambat/mandala
/samudaya/lhosar
/samudaya/tharu
/samudaya/mithila
/samudaya/kirat
/samudaya/hijri
/samudaya/chakra
```

The new UI also exposes Time Machine, On This Day, Community, FM, TV, Samachar and the utility/tool surfaces.

## 6. Native data expected in D1

The checked migration inventory includes the public/reference datasets required by the current UI, including:

```text
tool_catalog              29
time_machine_moments      706
on_this_day_events        5,454
astronomy_calendar_map    77,070
community_dates           1,062
community_festivals       34
fm_stations               20
news_items                274
```

The production calendar archive covers `1826-04-11` through `2037-04-13`.

## 7. Compatibility boundary

Cloudflare-native routes always run first.

`worker/connected-entry.ts` permits read-only compatibility fallback only for the retained transitional media/news surfaces:

```text
TV
FM
Samachar / /api/v1/news
```

Do not restore a generic `/api/v1/*` Supabase proxy.

## 8. Runtime secrets after recreating a Worker

A newly recreated Worker does not automatically inherit secrets from a deleted Worker. Restore the relevant Cloudflare secrets from your secure source when those features are required.

See `cloudflare/secrets-manifest.json`. Important names include:

```text
GOOGLE_CLIENT_ID
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
CRON_SECRET
RASHIFAL_SERVICE_TOKEN
Groq_API
nvidia_api
TV_RELAY_SECRET or RADIO_RELAY_SECRET
ADMIN_GOOGLE_SUBJECTS or ADMIN_EMAILS
```

`NASA_API_KEY` is optional because the astronomy UI has a safe NASA fallback path.

Never commit secret values to Git.

## 9. Required post-deploy smoke checks

After Cloudflare finishes the fresh deployment, verify at minimum:

```text
/
/tools
/convert
/tools/astro
/time-machine
/on-this-day
/samudaya
/nepal-sambat/mandala
/samudaya/lhosar
/samudaya/tharu
/samudaya/mithila
/samudaya/kirat
/samudaya/hijri
/samudaya/chakra
/fm
/tv
/samachar
/rashifal
/jyotish/china
/me
```

API checks:

```text
GET /api/v1/health
GET /api/v1/sync?date=2026-09-30
GET /api/v1/calendar/2083/6?calendar=bs
GET /api/v1/astronomy/tithi?date=2026-09-30&lat=27.7172&lng=85.3240
GET /api/v1/tools/catalog
GET /api/v1/time-machine?limit=5
GET /api/v1/on-this-day?date=2026-09-30
GET /api/v1/rashifal/universal?period=daily&system=vedic&calendar=bs&date=2026-09-30
GET /api/v1/news?limit=5
```

Expected native responses use Cloudflare/D1. TV/FM/Samachar may use the explicitly permitted selective compatibility bridge where the native route does not answer.

## 10. PWA update behavior

The current service-worker cache generation is intentionally bumped for the repaired UI. On activation it removes older Patro/Aafnai cache generations, so users should not remain pinned to the previously broken UI after the fresh production deploy.

Navigation is network-first; calendar data uses stale-while-revalidate for offline resilience.

## 11. Do not delete rollback sources yet

Supabase compatibility is still intentionally retained for selected media/news routes. Do not delete those source functions until live Cloudflare smoke tests prove the remaining compatibility traffic can be removed safely.
