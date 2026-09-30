# Cloudflare migration

This directory contains the reproducible Cloudflare target for Patro. The current Vercel and Supabase deployment stays available as a rollback source until Cloudflare passes feature and data parity.

## Target

- Cloudflare Workers for API/proxy logic.
- Cloudflare Pages for the React/Vite frontend, with Workers Static Assets retained as a single-Worker fallback mode.
- D1 for public/reference content.
- KV for upstream/API cache.
- Supabase compatibility proxy only while remaining routes are being ported.

Private/user/operational Supabase rows are intentionally excluded from this public repository.

## Repository-only validation

Before Cloudflare resources are connected:

```bash
npm ci
npm run cloudflare:validate
```

This checks the frontend build, Worker dry-run, all 78 astronomy snapshot parts, 77,070 contiguous rows from 1826-04-11 through 2037-04-13, and D1 SQL statement-size limits.


## Pages route parity

The Pages project uses `functions/[[path]].js` plus the `PATRO_API` service binding. Static Astro/tools/community routes continue to Pages assets, while root/calendar/search/planner/API/protected-tool routes are forwarded internally to the `mero-patro` Worker. `public/_routes.json` is copied into the final `dist/` output so this behavior is deterministic in Pages deployments.

The route classifier is covered by `tests/cloudflare-pages-routing.test.mjs` and runs in the Cloudflare migration CI workflow.
\n## First D1/KV deployment

After creating Cloudflare D1 and KV, provide their IDs as environment variables:

```bash
export CF_D1_DATABASE_ID=...
export CF_KV_NAMESPACE_ID=...
# optional preview resources
export CF_D1_PREVIEW_DATABASE_ID=...
export CF_KV_PREVIEW_NAMESPACE_ID=...

npm run deploy:cloudflare:bootstrap
```

Bootstrap order is schema migrations, deterministic public/reference content import, database inventory query, then Worker deployment. The generated bulk import is written to `.cloudflare/d1-import/content-snapshot.sql` and is not committed.

The bulk import contains no explicit `BEGIN TRANSACTION` / `COMMIT` wrappers and keeps every generated SQL statement below Cloudflare D1's 100 KB statement limit.

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
