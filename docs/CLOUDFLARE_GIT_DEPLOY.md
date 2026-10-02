# Cloudflare Zero-State Rebuild Runbook

This document is the **current production rebuild path** for **आफ्नै पात्रो / Aafnai Patro**. Do not use the retired `cloudflare-migration`, `mero-patro`, separate Pages, or Vercel topology for a new production build.

## Production target

```text
GitHub:             aprashnasuraj-dev/patro
Production branch: main
Worker:             patro
Entrypoint:         worker/connected-entry.ts
Static assets:      ASSETS -> ./dist
D1 binding:         DB -> patro
Custom domain:      aafnaipatro.com
Architecture:       native Cloudflare first + selective TV/FM/Samachar compatibility only
```

The production deployment is one Cloudflare Worker with Workers Static Assets. A separate Pages project is not required.

## 1. Repository gate before importing Cloudflare

Use Node.js 22 from a clean checkout:

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run cloudflare:production-check
npm run cloudflare:validate
```

The build itself runs brand/SEO generation, TypeScript, Vite, retained tool/community emitters, doctor checks and the final product-build verifier. `cloudflare:validate` also performs Wrangler dry-runs against both committed deployment configs:

- `wrangler.jsonc` — canonical deployment configuration
- `wrangler.toml` — Git-import discovery mirror

Do not proceed if the clean local build or Wrangler dry-run fails.

## 2. Reconnect/import the repository from zero

In Cloudflare Workers & Pages, reconnect GitHub if necessary and import:

```text
Repository:        aprashnasuraj-dev/patro
Production branch: main
Worker name:       patro
Build command:     npm run cloudflare:production-check
Deploy command:    npm run deploy:cloudflare
Root directory:    repository root
```

Do **not** create/select `mero-patro` and do not create a separate Pages site for this rebuild.

If the stale Git integration reports:

```text
Preview creation failed: This Worker does not exist on your account.
```

remove/reconnect that stale Cloudflare Git project or import the repository again as Worker `patro`. Git cannot recreate the Cloudflare account-side service association before Cloudflare accepts the import.

## 3. Production Wrangler configuration

`wrangler.jsonc` and `wrangler.toml` must remain aligned:

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

Do not create a blank replacement D1 database during a routine rebuild. The existing bound D1 database is part of the production state.

## 4. Deploy command order

```bash
npm run deploy:cloudflare
```

performs:

1. production build;
2. removes `dist/_redirects` so Workers Static Assets cannot interpret old Pages redirects;
3. applies pending D1 schema migrations to `DB`;
4. deploys `worker/connected-entry.ts` and static assets.

Routine deploys do not bulk-reseed the public archive.

## 5. Release inventory that must survive every build

### 29 canonical public tools

```text
/tools/astro
/tools/nepali-typing
/tools/preeti-converter
/tools/bstoad
/tools/adtobs
/tools/calc
/tools/age
/tools/clock
/tools/forex
/tools/gold
/tools/emi
/tools/vat
/tools/incometax
/tools/landconverter
/tools/units
/tools/fuelprice
/tools/nepaliqr
/tools/words
/tools/tithi-reminder
/tools/sait
/tools/baby-names
/tools/janmadin-akhbar
/tools/future-letter
/tools/spell-check
/tools/voice-typing
/tools/ocr
/tools/name-check
/tools/read-aloud
/tools/patro-bot
```

Aliases remain usable but are deliberately omitted from the canonical tool sitemap to avoid duplicate SEO signals.

### Community Suite: exactly seven retained experiences

```text
/nepal-sambat/mandala
/samudaya/lhosar
/samudaya/tharu
/samudaya/mithila
/samudaya/kirat
/samudaya/hijri
/samudaya/chakra
```

`scripts/emit-community-suites.mjs` fails the build unless all seven are emitted.

### Other first-class surfaces

```text
/
/tools
/convert
/rashifal
/samachar
/fm
/tv
/time-machine
/on-this-day
/jyotish/china
/jyotish/matchmaking
/me
```

The new UI provides a global feature launcher plus a featured Tools rail so history, media, astronomy and community experiences remain discoverable on desktop and mobile.

## 6. D1 inventory expected by the UI

The migration snapshot/release inventory includes at least:

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

The committed calendar coverage is `1826-04-11` through `2037-04-13`.

## 7. Compatibility boundary

Native Cloudflare routes run first. `worker/connected-entry.ts` allows selective read compatibility only for:

```text
TV
FM
Samachar / /api/v1/news
```

Do not restore a generic Supabase `/api/v1/*` proxy.

## 8. Secrets: verify by feature scope

A recreated Worker does not inherit secrets from a deleted Worker. Secret names and feature groups are documented in `cloudflare/secrets-manifest.json`.

### Core scope

Calendar, conversion, Community Suite, Time Machine, On This Day, D1 content, deterministic Patro Bot and browser/local utilities have no runtime-secret requirement beyond their committed bindings/variables.

```bash
node scripts/verify-cloudflare-secrets.mjs --scope core
```

### Public-complete scope

For signed FM/radio playback, configure at least one:

```text
TV_RELAY_SECRET
RADIO_RELAY_SECRET
```

Verify:

```bash
node scripts/verify-cloudflare-secrets.mjs --scope public
```

### Full-feature scope

For every optional account/notification/admin/AI feature, also configure the groups below:

```text
AI Jyotish chat:  one of Groq_API / supported Groq aliases / nvidia_api / supported NVIDIA aliases
Google login:     GOOGLE_CLIENT_ID
Web push:         VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT
Admin overrides:  one of ADMIN_GOOGLE_SUBJECTS / ADMIN_EMAILS
```

Verify:

```bash
node scripts/verify-cloudflare-secrets.mjs --scope full
```

These are optional for the corresponding specialized feature and are **not** core deployment blockers:

```text
NASA_API_KEY             optional astronomy/APOD enhancement
CRON_SECRET              manual HTTP cron authorization only; scheduled() does not require it
RASHIFAL_SERVICE_TOKEN   compatibility service-token-hash endpoint only
GROQ_MODEL               optional model override
NVIDIA_MODEL             optional model override
```

Never commit secret values to Git.

## 9. Post-deploy smoke checks

First verify the shell/navigation:

```text
/
/tools
/convert
/rashifal
/time-machine
/on-this-day
/samudaya
/fm
/tv
/samachar
/jyotish/china
/me
```

Then open all **29 canonical tool routes** from section 5 and all **7 community routes**. Every route must show a real functional surface, never a placeholder/coming-soon shell.

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
GET /api/v1/radio/catalog?country=NP&limit=12
```

For full-feature verification additionally test:

```text
GET  /api/v1/auth/config
GET  /api/push/vapid
POST /api/v1/jyotish/chat
```

Expected native responses use Cloudflare/D1. TV/FM/Samachar may use only the explicitly allowed selective compatibility bridge where the native route does not answer.

## 10. SEO/PWA checks

Verify these production files after deployment:

```text
/robots.txt
/sitemap.xml
/sitemap-pages.xml
/sitemap-tools.xml
/sitemap-community.xml
/sitemap-calendar.xml
/llms.txt
/seo-manifest.json
/sw.js
/manifest.webmanifest
```

Search-facing HTML must use the Aafnai Patro brand and canonical `https://aafnaipatro.com`. `worker/connected-entry.ts` sends production HTML through `worker/connected-seo.ts` before returning it.

The final service-worker generation must purge older `aafnai-pwa-*` caches. Navigation is network-first; calendar data remains stale-while-revalidate for offline resilience.

## 11. Rollback boundary

Do not delete the retained Supabase compatibility functions yet. Remove them only after live Cloudflare smoke checks prove TV/FM/Samachar no longer need compatibility traffic.
