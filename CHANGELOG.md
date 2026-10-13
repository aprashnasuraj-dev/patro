# Changelog

All notable migration-facing changes are recorded here. Product-feature history that predates the Cloudflare migration may remain in feature-specific documentation.

## Unreleased

### Added — Nepali dictionary (`/tool/nepalidictionary`, feat/nepali-dictionary)

- 49,119-headword Nepali ↔ English dictionary from open sources plus original editorial definitions (9,101 defined), with English → Nepali pages, pronunciation, A1–B2 word lists, spaced-repetition flashcards, SEE/Lok Sewa quizzes, a Nepali spell checker, rhymes, ukhan and tap-to-translate on reading pages. See `docs/dictionary/README.md`.
- Data is generated at build time into `public/data/dict/v1` (256-way shards, ~2,050 files); `worker/dictionary.ts` server-renders word, A–Z, rhyme and English pages from it with variant/inflection 301s, so the deploy stays at ~7,900 / 19,500 static files.
- D1: `0007_dictionary_learning.sql` (`dict_saved_words`, `dict_quiz_results`, mirrored in `ensureAuthSchema`), `/api/v1/dictionary/{cards,quiz}` on the existing session; included in `/api/v1/my-data` export and account deletion.
- `sitemap-nepalidictionary.xml` (~15.7k URLs). The 29 canonical tools, their sitemap and catalog are unchanged.

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
