# Phase 1 — Telemetry and measurement foundation

## Chosen approach

Use a vendor-neutral typed event envelope and sink interface; precise coordinates and raw address-like queries are forbidden. Start with Noop transport until consent/sink deployment is explicitly configured.

## Rejected / deferred

Do not wire analytics directly to a vendor or collect lat/lng, IP, raw UA, full referrer or raw potentially-address-bearing searches.

## References

- Google Analytics implementation is repository-specific and intentionally abstracted behind a sink.
- Mission privacy contract: no precise coordinates in analytics.

## UNVERIFIED / gate blockers

- Local build/test/benchmark results are unavailable in the current agent environment.
- Any rollout remains OFF until the phase's executable gate is green.
