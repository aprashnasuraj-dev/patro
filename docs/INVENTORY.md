# Repository Inventory — Cloudflare Migration

Snapshot date: 2026-09-30  
Branch: `cloudflare-migration`

This inventory is the M0 preservation contract for the current Patro repository. It records what exists before further Cloudflare-native migration work and maps the current application back to the supplied Aafnai Patro v2 single-file baseline. Migration work must preserve working behavior unless a change is explicitly approved.

## 1. Runtime inventory

| Layer | Current/source runtime | Cloudflare migration target | Current migration rule |
| --- | --- | --- | --- |
| Frontend | React 19 + TypeScript + Vite SPA, currently served from Vercel | Cloudflare Pages, `dist/` | Keep all product surfaces; Pages serves static/native routes |
| API | Supabase Edge Functions plus protected runtime | Cloudflare Worker `mero-patro` | Native Worker first; compatibility fallback for unported routes |
| Public/reference data | Supabase PostgreSQL + checked-in deterministic snapshots | D1 binding `DB` | Bootstrap only deterministic/public/reference content |
| Cache | Supabase/runtime caches | KV binding `CACHE` + Cache API | Rebuild ephemeral cache/rate state on Cloudflare |
| Private/user state | Supabase protected tables/RLS | Deferred replacement | Keep on protected Supabase compatibility path until auth/privacy parity exists |
| Pages → API transport | public network today | `PATRO_API` service binding | No public hop once Pages is connected |

The migration manifest records 56 source public-schema tables: 32 deterministic D1 tables, 22 protected-transition tables, and 2 ephemeral runtime tables.

## 2. Current application surfaces

### Native/static SPA surfaces

The React router currently owns these primary UI surfaces:

- `/astro`
- `/fm`
- `/tv`
- `/tools` and the general `/tools/*` utility surface
- `/explore`
- `/my-diary`
- `/jyotish/janma-patro`
- `/jyotish/matchmaking`
- `/settings/community`
- `/admin/community-suites`
- trust/legal pages: `/about`, `/sources`, `/privacy`, `/terms`, `/contact`, `/404`

Additional generated/static community surfaces include Nepal Sambat and the community calendar suites under `/samudaya/*`.

### Worker/protected UI surfaces during migration

Pages forwards root/calendar/search/planner and other protected catch-all routes to the Worker while their native replacements are still being ported. Explicit protected tool routes include:

- `/tools/tithi`
- `/tools/diaspora`
- `/tools/card`
- `/tools/family`
- `/tools/api`
- `/tools/my-data`

This split is intentional. A feature is not considered migrated merely because a static route exists.

## 3. API inventory

### Cloudflare-native or D1-first routes

- `GET /api/v1/health`
- `GET /api/v1/sync`
- `GET /api/v1/astronomy/tithi`
- `GET /api/v1/nasa/apod`
- `GET /api/v1/nasa/cosmic`
- `GET /api/v1/tools/catalog`
- `GET /api/v1/on-this-day`
- `GET /api/v1/time-machine`
- `GET /api/v1/rashifal/universal`
- `GET /api/rashifal/universal`
- radio/FM handlers where the required relay secret is configured

### Explicit compatibility bridges

- `/api/jyotish-chat`
- `/api/rashifal_engine.py`
- `/fm-v2-stream/*`
- `/fm-stream/*`
- unmatched `/api/v1/*` routes

The compatibility bridge is a cutover safety mechanism. It must stay until the equivalent Cloudflare-native route passes response-shape, data, privacy/auth, failure-mode, CI, and traffic-parity gates.

## 4. Public/reference data inventory

Checked-in migration invariants:

| Dataset | Expected rows |
| --- | ---: |
| Astronomy calendar map | 77,070 |
| Nepal Sambat day map | 14,972 |
| On This Day | 5,454 |
| Nepal Sambat festival dates | 1,886 |
| Community dates | 1,062 |
| Time Machine moments | 706 |
| News items | 274 |
| News clusters | 229 |
| NASA cosmic cache | 126 |
| Official panchang facts | 101 |
| Holidays | 84 |
| Market snapshots | 69 |
| FM stations | 20 |
| Universal Rashifal publications | 22 |
| Tool catalog | 29 |
| Tool release plan | 4 |

Main calendar coverage is AD `1826-04-11` through `2037-04-13`, sourced as `patro-archive-v79`. Every calendar row is required to contain BS, Nepal Sambat, and Panchang/tithi payloads.

## 5. Mapping from the supplied Aafnai Patro v2 baseline

The supplied v2 HTML is treated as a behavior/reference baseline, not as a source to overwrite the newer React product.

| Aafnai Patro v2 responsibility | Current repository location / equivalent | Migration rule |
| --- | --- | --- |
| BS ↔ AD conversion engine | `packages/core/src/bsDate.ts`, calendar adapters and the checked-in astronomy calendar map | Do not change validated date math without regression evidence |
| Tithi / lunar / panchang calculations | `worker/tithi.ts`, Patro panchang adapters, Supabase source snapshot, D1 calendar payloads | Preserve values and response shape |
| Festival/holiday data | deterministic migration snapshots + current holiday/panchang tables | Preserve official/source-of-truth records; do not fabricate |
| Local state/reminders | current SPA/local storage and protected routes | Preserve local behavior; private cloud sync stays deferred |
| Tools registry | current utility suite, Patro tools integration, D1 tool catalog | Keep every enabled tool reachable |
| Home/deep-feature navigation | current React app + protected root runtime | Do not replace the full product with an astronomy-only shell |
| Rashifal | current universal/public D1-first route plus protected personalized compatibility | Preserve disclaimer, public/private boundary, and contract |
| TV/FM | current media suite + Worker/compat stream/catalog handling | Preserve playable channels/stations; no feature removal during migration |
| Search/history/time machine | current protected routes plus D1-native history APIs | Preserve response semantics and UI routes |
| SEO/PWA | Vite output, generated root shell, manifest, service worker, robots/sitemap | Keep installability and crawlable static assets |

## 6. Repository layout relevant to migration

- `src/` — React/Vite application and feature suites.
- `packages/core/` — date/conversion/core utility logic.
- `public/` — PWA assets, static calendar chunks and standalone Nepali tools.
- `functions/` — Pages Functions and Pages-to-Worker bridge.
- `worker/` — Cloudflare Worker/native handlers.
- `cloudflare/` — migration manifests, D1 schema/seed source and converted Edge Function references.
- `migration/` — deterministic source snapshots and Supabase source/runtime records.
- `supabase/` — retained rollback/compatibility source.
- `scripts/` — validation, bootstrap, D1 generation/import, deploy and cutover smoke tools.
- `tests/` — product and Cloudflare route/contract tests.
- `.github/workflows/` — build, security and migration/readiness CI.

## 7. Preservation constraints

1. No engine-math changes are part of the Cloudflare runtime move.
2. No existing route, tool, FM/TV surface, Jyotish feature, community calendar, personal surface, or PWA feature may be removed to simplify migration.
3. No private/user Supabase rows are committed into the public migration snapshot.
4. No secrets belong in Vite/browser variables or Git.
5. D1 bootstrap is deterministic and exact-count verified.
6. Vercel/Supabase remain rollback sources until Cloudflare passes parity and an observation window.
7. Deployment is out of scope for repository-preparation commits unless explicitly requested.

## 8. M0 baseline evidence

At the start of this inventory, the branch already had green GitHub Actions runs for Build, Cloudflare migration CI, and Cloudflare readiness on the latest migration commits. The handoff contract test added with this inventory verifies that the documented lifecycle commands and required migration documents stay present.
