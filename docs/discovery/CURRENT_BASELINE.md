# Current baseline — 2026-10-29

This file deliberately separates observed repository facts from measurements that require an executable checkout.

## Observed

- Nepal Map uses static, on-demand category JSON, MapLibre clustering and an in-view list.
- Search still executes synchronously on the browser main thread.
- Routing calls FOSSGIS OSRM directly from the browser and has a straight-line fallback.
- Bali Calendar is SSR through the world-calendar worker and has deterministic Pawukon, Wuku and Otonan support.
- Bali does not yet have a month grid, Rerainan search or ICS subscription.
- The current repository does not commit Playwright, axe CLI or pa11y.

## Production-advertised data snapshot

The live Nepal Map audited for the roadmap advertised 74,121 named places in total, including 7,713 religious places, 565 peaks/hills, 750 lakes, 19,299 settlements, 24,915 schools/colleges, 4,481 health facilities, 5,871 banks/cooperatives and 4,942 hotels/guest houses.

These are production-page counts, **not a fresh local rebuild measurement**. The local verification pipeline must record its own row counts when it can run.

## Measurement status

| Metric | Baseline |
|---|---|
| npm install time | BLOCKED — no executable checkout/network in agent runner |
| production build time | BLOCKED |
| JS/CSS bundle delta | BLOCKED |
| map payload parse time | BLOCKED |
| GeoJSON construction time | BLOCKED |
| main-thread long tasks | BLOCKED |
| heap use | BLOCKED |
| mobile map interaction latency | BLOCKED |
| Lighthouse performance | BLOCKED |
| automated accessibility | BLOCKED |
| E2E pass count | BLOCKED |

No synthetic number is substituted for a missing measurement.

## Reference-device target for the first runnable benchmark

Use Chromium mobile emulation with:
- viewport approximately 390×844
- device scale factor 2
- 4× CPU slowdown
- Fast/Slow 4G-style network throttling documented in the benchmark output

The exact Playwright/Lighthouse profile must be committed by `scripts/bench.sh` before a baseline is accepted.
