# Roadmap feature flags

All user-visible roadmap work is reversible and defaults OFF until its phase gate is locally verified. The precise-location and external-route disclosure is a strict privacy fix and therefore is not gated.

| Flag | Default | Phase | Rollout condition | Rollback |
|---|---:|---:|---|---|
| telemetry | off | 1 | schema/privacy tests + approved sink/consent | disable |
| provenanceUi | off | 2 | manifest coverage + UI/schema checks | disable |
| nepalSearchWorker | off | 3 | worker fixtures + measured mobile benchmark | disable |
| nepalRoutingProviderV2 | off | 4 | provider/fault tests + routing-provider decision | disable |
| nepalDetourRouting | off | 4 | multi-stop/detour tests + acceptable provider capacity | disable |
| nepalRoadSafety | off | 4 | OSM road metadata build + route-match tests + disclaimer review | disable |
| nepalStablePlaceIds | off | 5 | mapping generated from current ingest + stability checks | disable |
| nepalBoundaryConfidence | off | 5 | refreshed OSM polygon ingest + confidence distribution QA | disable |
| baliMonthGrid | off | 6 | grid/date/source fixtures + a11y | disable |
| baliRerainanSearch | off | 6 | ranking/query/noindex tests | disable |
| baliLearningGuides | off | 6 | deterministic glossary/Wuku links + a11y | disable |
| baliOtonanDualResult | off | 6 | sunrise-boundary dual-result fixtures + UX review | disable |
| baliIcsFeeds | off | 7 | RFC 5545 + third-party parser validation | disable |
| baliSubscriptionUi | off | 7 | feed parser verification + HTTPS/webcal UX checks | disable |
| nepalTerrain | off | 7/10 | same-origin DEM source/licensing + elevation benchmark | disable |
| nepalOfflinePacks | off | 7 | district-pack size/offline E2E + attribution | disable |
| nepalExports | off | 7 | GPX/KML/GeoJSON validation + attribution checks | disable |
| nepalItinerary | off | 7 | local-storage migration/privacy/E2E | disable |
| nepalVisitorMode | off | 8 | copy review + a11y | disable |
| nepalPoiPages | off | 8 | stable IDs + unique-value SEO gate + sitemap checks | disable |
| nepalMobileSheetV2 | off | 8 | mobile E2E + keyboard/screen-reader review | disable |
| seoPolicyEngine | off | 8 | URL-family checks pass | disable |
| nepalCorrectionsUi | off | 9 | D1 migration + API validation + abuse/correction E2E | disable |
| nepalApi | off | 9 | licensing/rate-limit/API contract verification | disable |
| nepalEmbeds | off | 9 | strict CSP + attribution + partner embed E2E | disable |
| futureNepalApi | off | 9 | retained compatibility gate for broader partner surface | keep off |
| futureEmbeds | off | 9 | retained compatibility gate for broader partner surface | keep off |
| nepalEmergency | off | 10 | BIPAD contract/failure-mode tests + local resilience E2E | disable |
| nepalPmtiles | off | 10 | PMTiles build POC beats/justifies current payload budgets | disable |
| roadmapSlo | off | 10 | real structured logs + dashboard validation | disable |
| roadmapCostMetrics | off | 10 | same-period session/usage/billing inputs | disable |
| futureBaliCulturalSurfaces | off | 10 | authoritative corpus + cultural review | keep off |

## Build/runtime mapping

The TypeScript registry above is the product-level rollout inventory. Nepal Map static-build features are selected with the corresponding `NEPALMAP_*` variables documented in `.dev.vars.example`. Worker API/corrections/emergency routes are separately protected by `NEPAL_API_ENABLED`, `NEPAL_CORRECTIONS_ENABLED` and `NEPAL_EMERGENCY_ENABLED` in `wrangler.jsonc`, all defaulting to `0`.

Bali feature flags currently remain compile-time constants in `worker/roadmap/flags.ts`. This is intentional until the local verification gate is green; enabling one is a reviewed code change rather than an untracked environment toggle.
