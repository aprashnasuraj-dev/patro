# World Day Atlas

Additive, independently deployed Cloudflare Worker. Existing `patro` Worker, assets, tools and databases remain unchanged.

Exactly 1,000,000 astronomical day URLs: 50 existing city-centre records × 20,000 Gregorian days, 1982-07-12 through 2037-04-13. Complete server HTML for every valid URL; no stored per-day files or database rows. City/year/month directories provide crawlable links. Date picker, share action and ICS downloads work on each detail page.

## Build and verify

From this directory: `npm ci`, `npm run build`, `npm test`. Tests enumerate all million sitemap URLs, validate inventory bounds and leap dates, test daylight-saving and polar conditions, sample astronomy across every city, and check existing robots/sitemap preservation. Optional production-baseline files in `/tmp` are used by preservation tests.

Deploy separately with `npx wrangler deploy --config extensions/day-atlas/wrangler.jsonc` from the repository root. It does not rebuild or redeploy the main application. The committed bundle permits deployment without installing the main app dependencies.

## Routes

- `/atlas/`, `/atlas/{city}/{date}`, city/year/month directories and methods.
- `/sitemap-atlas.xml`: index of 1,000 generated shards with 1,000 URLs each.
- `/robots.txt`: service-bound original response with one sitemap declaration appended.
- `/sitemap.xml`: service-bound original index with all new leaf sitemap entries appended. Existing entries are preserved. If the origin is not a sitemap index it is passed through unchanged; robots still exposes the new index.

Remove only this Worker's routes to roll back; original production endpoints resume immediately. No schema migrations or existing Worker changes.

## Accuracy and limits

Astronomy Engine 2.1.19, sea-level observer, standard refraction, flat horizon. Time zones use the runtime IANA database, with actual next local midnight (23/25-hour days supported). Sunrise/sunset are displayed rounded to the minute. Moon quantities are at the midpoint of the local civil day. Terrain, atmospheric variations and future time-zone legislation can change observed times. No invented festival, weather or religious-observance data. Existing Nepali date service is linked, not duplicated.

One independent spot-check against US Naval Observatory on 2026-10-09 for Kathmandu gives sunrise 06:00 and sunset 17:41; model results must agree within two minutes. Tests do not establish independent accuracy for every city/date.

Additional persistent deployment footprint is under 0.1 MB for the bundled Worker; no R2/D1/KV storage is allocated. Platform-managed bounded caches, old deployments and repository dependency installations are distinct from the new page-data footprint. Crawling, indexing and AI citation are search-provider decisions; availability is not proof of indexing. Worker requests still count toward account quotas.
