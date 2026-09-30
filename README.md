# Mero Patro

Production migration repository for Mero Patro: a Nepali calendar, astronomy, history, media, Jyotish and utility platform.

The `cloudflare-migration` branch is prepared for a staged move from **Vercel + Supabase** to **Cloudflare Pages + Workers + D1 + KV** without removing working product surfaces during the transition.

## Migration state

- Frontend: React 19 + TypeScript + Vite static SPA.
- Cloudflare frontend target: Pages, output directory `dist/`.
- Cloudflare API target: Worker `mero-patro`.
- Pages-to-Worker transport: service binding `PATRO_API`.
- Migrated reference/content store: D1 binding `DB`.
- Edge cache: KV binding `CACHE` plus Cache API.
- Calendar snapshot: **77,070 rows**, **78 parts**, AD **1826-04-11 → 2037-04-13**, with BS + Nepal Sambat + Panchang required on every row.\n- D1 parity gates: Rashifal **22**, Time Machine **706**, On This Day **5,454**, Tools catalog **29** + release plan **4**, Nepal Sambat day map **14,972**.\n- Exact D1 row expectations live in `cloudflare/d1/expected-public-counts.json`; all Supabase public tables are classified in `cloudflare/d1/supabase-table-inventory.json`.
- Runtime strategy: **native Cloudflare first, Supabase compatibility fallback second**.
- Private/user Supabase tables are not bulk-exported into the public migration snapshot.
- No Supabase service-role credential is used by browser code or committed to Git.

The compatibility fallback is deliberate. A route that is not yet Worker-native continues to use the existing Supabase router so a Cloudflare cutover cannot silently delete functionality.

## Architecture

```text
Browser
  |
  +-- static app / PWA --------------------------> Cloudflare Pages
  |
  +-- /api/* and /fm-v2-stream/*
        |
        +-- Pages Function ----------------------> PATRO_API service binding
                                                    |
                                                    v
                                             Worker: mero-patro
                                              |        |        |
                                              |        |        +--> upstream APIs
                                              |        +-----------> KV / Cache API
                                              +--------------------> D1
                                                    |
                                                    +--> Supabase compatibility
                                                         for routes not native yet
```

A single-Worker + Static Assets profile remains available for bootstrap/local use. Full production configuration defaults to split Pages + API Worker mode.

## Preserved product surfaces

This repository keeps the full Patro product rather than replacing it with an astronomy-only application.

| Surface | Cloudflare migration behavior |
| --- | --- |
| AD / Bikram Sambat / Nepal Sambat calendar | D1-native sync where available; compatibility fallback otherwise |
| Panchang / tithi / astronomy | Worker-native tithi + preserved router routes |
| Astronomy / Time Travel | Pages UI + Worker APIs |
| NASA APOD | Worker-native normalization/fallback + KV |
| Time Machine / On This Day | Worker/D1 native with compatibility fallback |
| Jyotish / Janma Patro | Pages UI + preserved backend bridge |
| Rashifal | existing protected backend contract preserved |
| FM / radio | Pages player + Worker/compat stream route |
| Live TV | Pages HLS/browser player |
| Nepali typing | integrated and standalone static app |
| Preeti ↔ Unicode | Nepali tools |
| Utility suite | OCR, voice typing, spellcheck, read-aloud, Sait, reminders, baby names, PatroBot, future letters and related tools |
| Community calendars | Nepal Sambat, Hijri, Lhosar, Kirat, Mithila, Tharu |
| Personal | My Diary/local storage behavior |
| PWA | manifest, icons, installability, service worker |
| Trust/legal | About, Sources, Privacy, Terms, Contact |

## Repository layout

```text
.
├── src/                         React/Vite application and features
├── public/                      PWA/static tools/icons/calendar chunks
├── functions/
│   ├── api/[[path]].js          Pages /api/* -> PATRO_API
│   └── fm-v2-stream/[[path]].js Pages stream bridge -> PATRO_API
├── worker/
│   ├── index.ts                 Worker gateway/native handlers
│   └── tithi.ts                 astronomical tithi calculation
├── cloudflare/
│   └── d1/
│       ├── schema-migrations/   routine D1 schema migrations
│       └── migrations/          checked-in sanitized reference seed source
├── migration/
│   └── data/public/             deterministic public/reference snapshots
│       └── astronomy_calendar_map/part-001..078.json
├── scripts/
│   ├── bootstrap-cloudflare.mjs
│   ├── generate-d1-migrations.mjs
│   ├── prepare-cloudflare-config.mjs
│   ├── validate-cloudflare.mjs
│   ├── deploy-cloudflare.mjs
│   └── emit-cloudflare-root.mjs
├── wrangler.jsonc               Worker bootstrap/single-deploy config
├── wrangler.pages.jsonc         Pages + PATRO_API config
└── .github/workflows/cloudflare-readiness.yml
```

## Local verification

Node 22 is the CI baseline.

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run test:core
npm run test:typing
npm run test:patro-tools
npm run cloudflare:validate
```

`cloudflare:validate` builds the application, verifies all 78 calendar parts/77,070 rows without creating the large import artifact, and performs a Worker dry-run.

For integrated local compatibility development:

```bash
npm run dev:cloudflare
```

For Vite-only UI development:

```bash
npm run dev:vite
```

## Cloudflare resource contract

Full native deployment uses these build variables:

| Variable | Purpose |
| --- | --- |
| `CF_D1_DATABASE_ID` | D1 UUID bound as `DB` |
| `CF_KV_NAMESPACE_ID` | KV UUID bound as `CACHE` |
| `CF_D1_DATABASE_NAME` | optional, defaults to `mero-patro` |
| `CF_D1_PREVIEW_DATABASE_ID` | optional isolated preview D1 |
| `CF_KV_PREVIEW_NAMESPACE_ID` | optional isolated preview KV |
| `CF_DEPLOY_MODE` | optional; default split Pages + Worker, use `single-worker` for Worker Static Assets |

Runtime secret:

```text
NASA_API_KEY
```

Never put database passwords, Supabase service-role keys, provider secrets or Cloudflare API tokens into Vite/browser environment variables.

## First native D1 bootstrap

The first native deployment is intentionally different from routine releases.

```bash
npm run deploy:cloudflare:bootstrap
```

It performs, in order:

1. Production build and doctor checks.
2. Verification of all 78 astronomy snapshot parts.
3. Generation of a deterministic SQL import in `.cloudflare/d1-import/`.
4. Validation that no generated SQL statement exceeds Cloudflare D1's 100 KB statement limit.
5. Generation of a Wrangler config containing the real D1/KV IDs.
6. Application of schema migrations.
7. One-time public/reference data import with `wrangler d1 execute --file`.
8. Exact remote D1 table-count + AD/BS/NS/Panchang verification (`npm run cloudflare:verify-d1-remote`).\n9. Worker deployment.

The generated import excludes private/user tables and strips transaction wrappers that are unsuitable for D1 bulk import.

## Routine Worker deploys

After bootstrap, use:

```bash
npm run deploy:cloudflare
```

Routine releases do **not** regenerate/reimport the entire 77,070-row archive. They build, apply schema migrations, and deploy the Worker. This keeps normal Git deployments fast and avoids repeatedly rewriting the reference archive.

If both D1 and KV IDs are absent, routine deploy intentionally falls back to compatibility/bootstrap Worker mode. Supplying only one binding ID fails closed.

## Pages deployment

Pages configuration is in `wrangler.pages.jsonc`.

Git integration:

```text
Production branch: cloudflare-migration
Build command:     npm run build
Build output:      dist
Service binding:   PATRO_API -> mero-patro
```

The service binding keeps API traffic inside Cloudflare instead of adding a public network hop.

Optional direct deployment:

```bash
npm run deploy:pages
```

Deploy the API Worker before Pages so `PATRO_API` has a valid target.

## Edge behavior

- Fingerprinted Vite assets under `/astro/assets/*` are browser-cached immutably.
- Static calendar data uses shorter browser caching and longer shared caching.
- `sw.js` revalidates so PWA releases are not pinned by browser cache.
- Native GET APIs use Cloudflare Cache API.
- APOD also uses KV when available.
- D1 is attempted before compatibility calls on native routes.
- Unknown `/api/v1/*` routes continue to the existing Supabase router during staged migration.

## Security boundaries

- Browser code never receives a Supabase service-role key.
- D1/KV identifiers are deployment metadata; provider credentials remain secrets.
- Pages reaches the API Worker using a service binding.
- Compatibility proxying strips `Host` and `Content-Length` before forwarding.
- Public/reference bulk migration is separated from private/user data.
- Existing Supabase RLS/protected routes stay in force until verified replacements exist.

## Cutover gate

Do not retire Vercel or Supabase just because Cloudflare deploys.

Cut over only after:

- Cloudflare readiness CI is green.
- D1 bootstrap reports expected table counts.
- boundary dates `1826-04-11` and `2037-04-13` resolve correctly.
- representative historical/current/future calendar samples match.
- FM/TV/Jyotish/Rashifal/tools/PWA smoke checks pass.
- Pages service-binding API calls pass.
- production logs show no unexpected 5xx or compatibility spike.

Then migrate remaining compatibility routes one at a time. The fallback is a migration safety mechanism, not permission to weaken the app.

## Migration documentation

- `docs/CLOUDFLARE_GIT_DEPLOY.md` — exact Git setup and cutover runbook.
- `docs/CLOUDFLARE_MIGRATION_PARITY.md` — feature/route preservation contract.
- `cloudflare/migration-manifest.json` — machine-readable migration state.

The existing Vercel and Supabase files remain intentionally present until the Cloudflare observation window and rollback period are complete.

## Recovery / resumable D1 import

The canonical first import is `npm run deploy:cloudflare:bootstrap`. A second importer exists only for recovery or table-by-table resume:

```bash
npm run cloudflare:import-d1:recovery
# or add --table=<table> directly to scripts/cloudflare/import-d1.mjs
```

It uses the same exact-count manifest and refuses private/user tables. Do not use `cf:bootstrap` as a separate deployment design; it is an alias of the canonical safe bootstrap so ordering remains schema → content → remote parity verification → Worker.
