# Phase 4 — Routing resilience

## Chosen approach

Put routing behind a provider interface with normalized failure/fallback behavior. Keep the existing straight-line/external navigation fallback. Do not self-host merely for architectural purity.

## Rejected / deferred

Do not promise SLA on FOSSGIS public routing and do not choose a paid/self-hosted provider without a human cost decision.

## References

- FOSSGIS routing usage/privacy: https://routing.openstreetmap.de/about.html
- OSRM: https://project-osrm.org/

## UNVERIFIED / gate blockers

- Local build/test/benchmark results are unavailable in the current agent environment.
- Any rollout remains OFF until the phase's executable gate is green.
