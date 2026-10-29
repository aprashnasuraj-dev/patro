# AafnaiPatro roadmap discovery — repository map

Baseline commit: `b86a8268e88815fdf092ff432638fa0336d9d209` (main when this mission started, 2026-10-29).

## Runtime and build

- Package: `patro-astronomy-spa@2.0.0`, ESM.
- TypeScript 5.8.3, Vite 6.4.4, React 19.1.0, Vitest 5.0.5, Wrangler 4.144.0.
- Production Worker entry: `worker/optimized-entry.ts`.
- Cloudflare config: `wrangler.jsonc`.
- Production build: `npm run build`; broad release gate: `npm run release:verify`.
- Typecheck/lint aliases: `npm run typecheck`, `npm run lint`.
- Product tests: `npm run test:explore`, `npm run test:worldcal`.
- Existing Lighthouse entrypoint: `npm run seo:audit` using `@lhci/cli@0.15.1`.
- No committed Playwright, axe or pa11y package was found at discovery time.

## Nepal Map

Primary implementation:
- `scripts/explore/nepal/build-map.mjs` — materializes static pages and compact JSON.
- `scripts/explore/nepal/map/app.js` — browser map/search/routing application.
- `scripts/explore/nepal/map/style.css` — map UI.
- `tests/nepalmap.test.ts` — map build/routing/CSP contracts.
- Output: `/nepalmap`, `/nepalmap/*`, `/data/nepalmap/v1/*`, `/sitemap-nepalmap.xml`.

Important architecture:
- MapLibre GL JS 4.7.1 loaded from jsDelivr.
- OpenFreeMap is the basemap/style provider.
- Category data is static JSON loaded on demand.
- GeoJSON clustering already exists (`cluster: true`, radius 50, max zoom 12).
- An in-view list already exists and is synchronized with map movement.
- Search is synchronous on the main thread over loaded arrays; English, Nepali and a Latin skeleton are supported.
- Near-me uses browser geolocation.
- Routing is a direct browser call to `https://routing.openstreetmap.de/`.
- Routing has car/bike/foot profiles, straight-line fallback and along-route POI discovery.
- Current along-route discovery is proximity-to-route (~1.5 km), not detour-time routing.
- Static map assets bypass the Worker in `wrangler.jsonc`.
- Map-specific CSP is in `public/_headers`.

Known data fields today:
`[name, name_ne, lat, lng, sub, ele, palika_id, ward, district_id, village_slug, wikipedia]`.

Known debt:
- `LASTMOD = "2026-10-11"` is hard-coded in the map builder.
- Stable internal place identity is not part of the compact row schema.
- Search work remains on the main thread.
- Route requests expose A/B coordinates to the public routing service; Phase 2 privacy disclosure is the first mission fix.

## Bali Calendar

Primary implementation:
- `worker/worldcal/index.ts` — world-calendar HTTP routing/cache.
- `worker/worldcal/config.ts` — family configuration and index window.
- `worker/worldcal/pages/bali-weton.ts` — Bali/Weton pages.
- `worker/worldcal/engines/pawukon.ts` — deterministic Pawukon/Weton arithmetic.
- `worker/worldcal/data/bali-saka.ts` — published/official/provisional year facts.
- `worker/worldcal/html.ts` — shared SSR HTML shell/theme.
- `tests/worldcal.test.ts` — correctness/isolation/rendering contracts.

Current Bali surfaces:
- `/bali-calendar`
- `/bali-calendar/YYYY-MM-DD`
- `/bali-calendar/otonan`
- `/bali-calendar/wuku/:slug`
- `/bali-calendar/hari-raya/:year`

Already present:
- Deterministic 210-day Pawukon.
- Published-reference regression tests.
- Wuku pages and full Wewaran table.
- Otonan with the midnight-to-sunrise previous-Balinese-day option.
- Nyepi status values `official|published|provisional`.
- Published Purnama/Tilem year tables.

Not found:
- Bali month-grid route.
- Rerainan search route.
- Shared provenance badge component.
- ICS subscription endpoints.
- Per-roadmap-feature flags.

## Analytics / consent

The repository contains Google-tag/analytics infrastructure elsewhere, but no dedicated Nepal Map/Bali product event contract was found during this bounded discovery. GSC quantitative verification is unavailable in the current agent environment. The roadmap will therefore introduce a vendor-neutral event contract with a no-op default rather than inferring traffic.

## Secrets and environment

- Cloudflare variables/bindings are declared in `wrangler.jsonc` and examples in `.dev.vars.example`.
- New roadmap integrations must use environment variables and update the example file.
- No secrets may be committed.

## Dependency/provider inventory

| Dependency | Current use | Owner | Fallback | Failure state |
|---|---|---|---|---|
| MapLibre GL JS 4.7.1 | Nepal Map renderer | AafnaiPatro integration / upstream MapLibre | none in app | map cannot boot |
| jsDelivr | MapLibre JS/CSS delivery | third party | none | map library unavailable |
| OpenFreeMap | map style/tiles | third party | none | basemap unavailable |
| OpenStreetMap data | Nepal places/routes | OSM contributors | source-specific | stale/missing place or route |
| FOSSGIS OSRM | direct browser routing | third party/public service | straight line + Google handoff | route degraded |
| local-states-nepal | admin levels per builder comment | upstream dataset | none documented | admin matching/build risk |
| Reingold–Dershowitz model | Pawukon calculation reference | deterministic implementation | regression fixtures | calculation regression |
| Published Bali calendars / government notices | year-specific facts | external publishers/government | display as unavailable/provisional | source fact withheld or downgraded |

## Top build risks

1. No executable local clone is available in this agent environment, so npm/build/browser checks cannot be run here.
2. The repository has a very large production build surface; roadmap changes must stay narrowly scoped.
3. Direct public OSRM dependency is a production scaling/privacy risk.
4. Map search still performs large-array work on the main thread.
5. Bali year-specific source facts need per-assertion provenance rather than prose-only notes.
