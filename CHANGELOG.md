# Changelog

All notable migration-facing changes are recorded here. Product-feature history that predates the Cloudflare migration may remain in feature-specific documentation.

## Unreleased

### Fixed — sitemaps (fix/sitemap-seo)

- Sitemaps now submit only indexable, self-canonical URLs: BS calendar/day archives are limited to the current BS year ±10 (`SITEMAP_MIN_BS_YEAR`/`SITEMAP_MAX_BS_YEAR` in `scripts/seo-config.mjs`), matching the Worker's historical `noindex` cutoff, which now lives in `worker/seo-window.ts` with the identical formula. The index drops from 422 to 47 child sitemaps (~8.3k URLs instead of ~77k); the full 77,070-row archive remains served from R2.
- `scripts/cloudflare/build-calendar-r2.mjs` is the single writer of `sitemap-calendar-*`/`sitemap-days-*`, deletes stale out-of-window files, and every index entry carries a stable `<lastmod>` derived from the data snapshot.
- `/sitemap*.xml` and `/robots.txt` are served first by `worker/seo-static.ts`: static asset only, `application/xml`/`text/plain`, `cache-control: public, max-age=3600`, no `x-robots-tag`, 404 (never the SPA shell) when missing.
- `scripts/verify-seo-build.mjs` fails the build on oversized, malformed, orphaned or missing sitemaps, duplicate `<loc>`s, and any URL the Worker would serve `noindex`, redirect or keep private.

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
