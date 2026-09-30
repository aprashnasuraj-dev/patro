# Cloudflare migration

This directory contains the reproducible Cloudflare target for Patro. The current Vercel and Supabase deployment stays available as a rollback source until Cloudflare passes feature and data parity.

## Target

- Cloudflare Workers for API/proxy logic.
- Workers Static Assets or the optional Pages split mode for the React/Vite frontend.
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
