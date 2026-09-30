# Cloudflare migration

This directory contains the reproducible Cloudflare target for Patro. The current Vercel and Supabase deployment stays available as a rollback source until Cloudflare passes feature and data parity.

## Target

- One Cloudflare Worker is the canonical deployment: API routing plus Workers Static Assets for the React/Vite frontend.
- Cloudflare Pages + a Worker service binding remains an optional fallback mode (`CF_DEPLOY_MODE=pages-worker`), not the default.
- D1 for public/reference content.
- KV for upstream/API cache.
- Supabase compatibility proxy only while the explicit blockers in `cloudflare/remaining-cutover.json` are being ported. Generic fallthrough is a temporary safety bridge, not the final architecture.

Private/user/operational Supabase rows are intentionally excluded from this public repository.

## Repository-only validation

Before Cloudflare resources are connected:

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run cloudflare:validate
```

This checks the frontend build, Worker dry-run, all 78 astronomy snapshot parts, 77,070 contiguous rows from 1826-04-11 through 2037-04-13, and D1 SQL statement-size limits.


## Pages route parity

The Pages project uses `functions/[[path]].js` plus the `PATRO_API` service binding. Static Astro/tools/community routes continue to Pages assets, while root/calendar/search/planner/API/protected-tool routes are forwarded internally to the `mero-patro` Worker. `public/_routes.json` is copied into the final `dist/` output so this behavior is deterministic in Pages deployments.

The route classifier is covered by `tests/cloudflare-pages-routing.test.mjs` and runs in the Cloudflare migration CI workflow.

## First D1/KV deployment

After creating Cloudflare D1 and KV, provide their IDs as environment variables:

```bash
export CF_D1_DATABASE_ID=...
export CF_KV_NAMESPACE_ID=...
# optional preview resources
export CF_D1_PREVIEW_DATABASE_ID=...
export CF_KV_PREVIEW_NAMESPACE_ID=...

npm run deploy:cloudflare:bootstrap
```

Bootstrap order is schema migrations, canonical public/reference content import, exact remote D1 parity verification, then Worker deployment. The generated bulk import is written to `.cloudflare/d1-import/content-snapshot.sql` and is not committed.

The bulk import is generated from `migration/data/public` plus the retained 22-row universal Rashifal seed. It excludes private/user tables, chunk-rewrites oversized payloads, contains no explicit `BEGIN TRANSACTION` / `COMMIT` wrappers, and keeps every emitted SQL statement below Cloudflare D1's 100 KB statement limit.

## Routine deployment

After bootstrap:

```bash
npm run deploy:cloudflare
```

Routine deploys apply schema-only D1 migrations first and deploy the Worker second. They do not replay the large reference-data import.

## Decommission gates

Do not delete Vercel or Supabase until route parity is verified, D1 row counts match, remaining Supabase compatibility routes have been ported, private/auth state has an explicit replacement, and Cloudflare production has completed a rollback observation window.

## Cutover smoke comparison

After the Cloudflare Pages/Worker preview URL exists, compare it against current production before changing DNS:

```bash
TARGET_ORIGIN=https://<cloudflare-preview-host> npm run cloudflare:smoke
```

The contract in `cloudflare/cutover-contract.json` checks core HTML routes plus deterministic AD/BS/Nepal Sambat API fields. A status or semantic mismatch exits non-zero. This is a cutover gate, not a substitute for browser/visual verification of media playback and interactive tools.

The live Supabase backend versions that were verified byte-for-byte against Git are recorded in `cloudflare/source-runtime-manifest.json`.


## SEO and canonical host

SEO is generated from Git as part of `npm run build`.

- `PUBLIC_SITE_URL` controls the sitemap/canonical production origin at build time.
- `scripts/generate-seo.mjs` writes `robots.txt`, `sitemap.xml`, and `seo-manifest.json`.
- The Worker rewrites canonical, robots, OpenGraph, Twitter and JSON-LD metadata on the initial HTML response using the actual request origin.
- SPA navigation updates the same metadata through `src/components/seo/SeoMeta.tsx`.
- Historical calendar pages older than the configured rolling window receive `noindex, follow` rather than being robots-blocked.
- `.github/workflows/seo-audit.yml` runs Lighthouse SEO/accessibility/performance checks.

Before production cutover, set for example:

```bash
export PUBLIC_SITE_URL=https://YOUR_FINAL_DOMAIN
npm run build
```

Do not leave the final production build canonicalized to a Vercel preview hostname.

## Latest-runtime source preservation

`cloudflare/source-runtime-manifest.json` records the 11 latest active, non-preview Supabase Edge Functions and their deployed hashes. Exact sources live under `migration/cloudflare/supabase/function-source/`; Worker-module conversion artifacts live under `cloudflare/converted-functions/`.

Historical preview/backup Edge Functions are not required for deployment. The source-preservation copy is complete; remaining work is native Cloudflare behavior and private/auth/runtime replacement, tracked in `cloudflare/remaining-cutover.json`.
