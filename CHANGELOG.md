# Changelog

All notable migration-facing changes are recorded here. Product-feature history that predates the Cloudflare migration may remain in feature-specific documentation.

## Unreleased

### Added

- Cloudflare Pages + Worker staged migration architecture on `cloudflare-migration`.
- D1 deterministic public/reference migration snapshots and exact-count verification.
- KV/Cache API migration path for public upstream/API caching.
- Pages-to-Worker `PATRO_API` service-binding bridge.
- Native/D1-first routes for health, calendar sync, tithi, APOD/cosmic, tools catalog, history/time machine, and public Rashifal reads.
- Compatibility fallback for unported/protected Supabase route families.
- Source runtime manifest recording verified live Supabase Edge Function versions.
- Cloudflare route-parity, migration validation and readiness CI.
- M0 handoff documents: `docs/INVENTORY.md`, `PLAN.md`, `DEPLOY.md`, and this changelog.
- Cloudflare handoff contract test that verifies required lifecycle commands and documentation.

### Fixed

- Added the previously documented but missing `npm run deploy:cloudflare` command, wired to `scripts/deploy-cloudflare.mjs`.
- CI now checks the migration handoff contract so README/runbook commands cannot silently drift from `package.json`.

### Safety

- No validated date/engine math changed.
- No product surface was removed or deprecated.
- No private/user Supabase data was added to the public migration snapshot.
- No deployment or DNS cutover is performed by these repository-preparation changes.
