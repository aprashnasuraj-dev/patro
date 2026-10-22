# Static-page, browser-runtime and Cloudflare budget

This is the architecture contract for this branch. Numbers describe the intended feature surfaces and new infrastructure, not measured build artifacts. The exact emitted HTML file count, bytes and route list must be measured from a completed build before PR.

## Page inventory and counts

| Surface | Planned count | Delivery |
|---|---:|---|
| New top-level group hubs | **5** | Static/prerendered HTML routes: `/panchang`, `/muhurat`, `/jyotish`, `/planets`, `/nepal-calendar` |
| Feature obligations | **91** | One canonical catalog entry each. Reuse the existing page where functional; add a browser-only route/surface only when the crosswalk confirms the need. These are not 91 duplicate copies of existing pages. |
| Existing homepage | **1 updated route** | Existing static/prerender output; small Panchang and group-discovery enhancement only |
| Existing `/tools` directory | **1 updated route** | Existing static/prerender output; grouped catalog/search and links |
| New calculation APIs | **0** | None |
| New Worker-rendered/Worker-owned pages | **0** | None |
| New D1 schema tables/migrations | **0** | None |
| New R2/KV/database publication writes | **0** | None |

### How to interpret the static count

- The fixed *new hub* HTML count is exactly **5**.
- The home and `/tools` pages are existing pages re-built with additional UI; they are not counted as newly added URLs.
- The 91 feature entries use the canonical route already serving the functionality whenever one exists. Missing tool routes will use static shell/pre-rendered HTML plus a lazy client bundle. They must not create duplicate route copies of JanmaPatro, Sait, Guna Milan, Rashifal, My Time, Moon, Eclipse, BS/AD or Nepal Sambat.
- The exact number of extra feature-specific HTML files must be derived from the final route crosswalk and proven by `dist` inspection after the full build. No guessed count may be presented as a completed artifact count.

## What continues to use existing Cloudflare-backed storage?

Existing storage-backed functionality remains untouched:

- The current daily BS/AD/NS/Panchang archive (22,281 verified-range daily rows, with tithi/nakshatra/yoga/karana boundaries and solar/lunar times in payload).
- Existing `/date/*` and `/calendar/*` archive route behavior and any existing public-data fallback.
- Existing community/festival/holiday/official override data and current route owners, where already backed by D1/R2/Worker.
- Existing Day Atlas Moon/Eclipse routes.
- Existing account/family/private storage functions for features that already use them.

This branch adds **zero new persistent Cloudflare-backed feature storage**. It does not reformat, re-seed, duplicate or migrate the production archive. Existing backed pages do not become browser-only simply because they are linked from the new hubs.

## Browser-only rules

- Pure calculation work is done in the browser after a tool is lazy-loaded. No server request for date arithmetic, conversion, recurrence enumeration, element solver, planetary-event scan, filtering, scoring or printing.
- A new tool must be usable without a backend endpoint when all inputs/reference tables are available locally.
- Use existing TypeScript/Astronomy Engine helpers and the single DTO. Avoid importing/running Python/FastAPI from a browser page.
- If an authoritative archive value is required, use the already-existing archive page/data path. Do not make separate calls for individual fields. Cache within the current page lifecycle; do not cause repetitive D1 queries.
- Static HTML and packaged read-only JSON/shards are build artifacts. Do not add runtime data writes for generated pages.
- Heavy feature UI, charting, planetary searches and printable report code must be a lazy chunk, not part of the entry/homepage bundle.
- Do not send birth date/time/place or chart details to a new API. Browser-local calculations stay local.

## Build output report required before PR

The branch needs a checked-in or attached report produced by the full build, with:

1. Count of all `dist/**/*.html` before vs after (and the set of changed/added paths).
2. Count and total bytes of new JS/CSS chunks, including each lazy tool chunk.
3. Count of static hubs, reused canonical routes, new feature routes, dynamic/archive exceptions.
4. Search over the diff confirming no new Worker endpoint, D1 migration, Wrangler binding, R2/KV write or deployment command.
5. A list of page paths that remain current Worker/archive routes with reason and owner.

If build output cannot be produced in this preparation environment, mark it **not measured**; never fill in simulated totals.
