# Phase 3 — Nepal Map performance at scale

## Chosen approach

Keep the existing static on-demand JSON architecture and existing MapLibre clustering/list. Optimize the remaining bottleneck: synchronous search/filter work, then benchmark before considering PMTiles/MVT.

## Rejected / deferred

Do not rewrite to vector tiles before measured budgets fail; clustering/list already exist.

## References

- MapLibre large-data guidance: https://maplibre.org/maplibre-gl-js/docs/guides/large-data/
- Current implementation: scripts/explore/nepal/map/app.js

## UNVERIFIED / gate blockers

- Local build/test/benchmark results are unavailable in the current agent environment.
- Any rollout remains OFF until the phase's executable gate is green.
