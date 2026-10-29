# Phase 5 — Durable Nepal geographic data

## Chosen approach

Add stable internal place identity and rebuild-stability tests before expanding place-detail surfaces. Preserve OSM/source IDs as source identity and names as mutable attributes.

## Rejected / deferred

Do not bulk-generate place pages and do not use names as identity.

## References

- OpenStreetMap data provenance: https://www.openstreetmap.org/copyright
- Current builder: scripts/explore/nepal/build-map.mjs

## UNVERIFIED / gate blockers

- Local build/test/benchmark results are unavailable in the current agent environment.
- Any rollout remains OFF until the phase's executable gate is green.
