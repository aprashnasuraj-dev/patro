# Cloudflare Migration Plan

Branch: `cloudflare-migration`  
Rule: prepare and verify first; do not cut over or retire the current Vercel/Supabase runtime until parity gates pass.

## Executive state

The repository is already beyond a blank migration scaffold. It contains a working React/Vite product, Cloudflare Worker and Pages bridge, D1/KV migration tooling, deterministic public/reference snapshots, compatibility fallbacks, and CI. The plan therefore treats the supplied Aafnai Patro v2 file as a regression/reference baseline while continuing from the newest production-derived repository state.

## Milestones

| Milestone | Scope | Current state | Exit gate |
| --- | --- | --- | --- |
| M0 | Inventory, plan, handoff contract, baseline CI | **Complete with this commit** | Required docs exist; documented lifecycle commands resolve; CI contract runs |
| M1 | Preserve current runtime behavior and source snapshots | **Substantially complete** | Source runtime manifest matches deployed Supabase functions; no feature removal |
| M2 | Cloudflare-native API/data migration | **In progress** | Each native route has D1/KV/upstream behavior, contract parity and compatibility fallback until proven |
| M3 | Pages/static route parity and UI preservation | **In progress** | Direct navigation works for all preserved routes; Pages bridge tests cover route ownership |
| M4 | SEO, prerender/PWA/performance hardening | **Partial** | Canonicals/sitemap/manifest/SW/security headers verified; no regression in installability/crawlability |
| M5 | Cloudflare deployment readiness | **In progress** | First-bootstrap and routine-deploy commands are reproducible; D1 exact counts pass; service binding documented |
| M6 | Full QA and cutover rehearsal | **Not complete** | Browser/media/Jyotish/tools/PWA smoke suite + cutover contract pass on a Cloudflare preview |

## M0 — inventory and baseline

Completed artifacts:

- `docs/INVENTORY.md`
- this `PLAN.md`
- `DEPLOY.md`
- `CHANGELOG.md`
- `tests/cloudflare-readiness-contract.test.mjs`
- explicit `npm run deploy:cloudflare` package command

Baseline checks:

- Build workflow green.
- Cloudflare migration CI green.
- Cloudflare readiness workflow green.
- No engine or feature behavior changed.

## M1 — source preservation and regression authority

Keep the newest live state authoritative by recording:

- current branch/commit;
- deployed Supabase Edge Function versions and byte-level source parity;
- D1 migration source snapshots;
- calendar archive version and boundaries;
- current Vercel/Supabase rollback origins.

Do not replace current source with an older archive simply because the older copy is easier to convert.

### Exit criteria

- `cloudflare/source-runtime-manifest.json` remains current.
- Every source table is classified.
- Public/reference snapshot generation is deterministic.
- Private/user state remains outside the Git snapshot.
- Engine/date regression tests stay green.

## M2 — native APIs and data

Port one route family at a time. For each family:

1. identify current response contract;
2. identify data source and privacy boundary;
3. implement Worker-native handler;
4. use D1/KV only where appropriate;
5. preserve compatibility fallback;
6. add deterministic tests;
7. compare Cloudflare preview with the current production response;
8. remove fallback only after legitimate traffic reaches zero.

Priority families:

- calendar/sync/panchang;
- history/time machine;
- tool catalog;
- Rashifal public reads;
- NASA/cosmic;
- FM/radio catalog and playback support;
- news/market/fuel;
- Jyotish chat and protected/personalized routes.

## M3 — Pages and route parity

Preserve the product as a complete Patro application.

Required route groups:

- root/calendar/date/search/planner;
- astronomy;
- FM and TV;
- Samachar/history/time machine;
- Jyotish and Rashifal;
- all enabled tools;
- community calendars;
- personal/local features;
- trust/legal pages;
- PWA assets.

The Pages function route classifier is the migration ownership boundary. Any route classified static must exist in `dist/`; any route classified worker must have a functioning `PATRO_API` path.

## M4 — SEO, PWA and performance

Verify rather than assume:

- title/meta/canonical/JSON-LD for crawlable routes;
- `robots.txt`, `sitemap.xml`, manifest and icons;
- service-worker update behavior;
- security headers and CSP;
- mobile layout and no horizontal overflow;
- lazy media does not autoplay;
- LCP/CLS budgets on a deployed preview.

Do not weaken CSP merely to make a failing third-party source work.

## M5 — Cloudflare readiness

### Worker

- D1 `DB` and KV `CACHE` provisioned.
- Runtime secrets configured server-side.
- One-time bootstrap runs schema → deterministic import → exact remote parity verification → Worker deploy.
- Routine deploy runs build → schema migrations → Worker deploy and never replays the full archive.

### Pages

- Project uses branch `cloudflare-migration`.
- Build command: `npm run build`.
- Output: `dist`.
- Service binding: `PATRO_API -> mero-patro`.
- Direct navigation and refresh are verified.

### Exit criteria

- `npm run cloudflare:validate` green.
- D1 remote counts exactly match `cloudflare/d1/expected-public-counts.json`.
- Boundary dates resolve.
- Cutover smoke contract passes against a Cloudflare preview.

## M6 — QA and cutover rehearsal

Run:

- route-by-route browser smoke tests;
- console/page-error sweep;
- FM playback samples and failure states;
- TV/HLS playback samples and failure states;
- Jyotish/Rashifal contract checks;
- representative tools;
- offline/PWA checks;
- security headers/CSP;
- Cloudflare Worker/Pages logs;
- compatibility-fallback-rate observation.

Only after M6 may DNS/domain cutover be considered.

## Alternative path rejected

A full rewrite of the current repository back into the supplied v2 single-file architecture is rejected because it would discard newer working product surfaces and invalidate the migration principle of continuing from the latest deployed state. The v2 file is retained as a regression/reference source for validated behavior, not as the deployment architecture.

## Change-control rules

Ask before:

- changing validated engine math;
- adding a paid/keyed external API;
- removing or deprecating a feature;
- making a licensing/legal judgment about third-party streams or RSS sources;
- deleting Vercel/Supabase rollback infrastructure.

Repository-only migration preparation, tests, docs and compatibility-preserving Cloudflare ports can proceed without a deployment.
