# Phase 6 — Bali Calendar complete-product layer

## Chosen approach

Add month navigation and Rerainan discovery on top of the already-tested Pawukon engine. Keep published Saka/Purnama/Tilem facts separate from calculated Pawukon. Defer Piodalan/Dewasa.

## Rejected / deferred

Do not generate cultural auspiciousness guidance or Piodalan records without an authoritative corpus/reviewer.

## References

- Current deterministic engine/tests: worker/worldcal/engines/pawukon.ts and tests/worldcal.test.ts
- Official 2027 Nyepi reference is recorded in worker/worldcal/data/bali-saka.ts.

## UNVERIFIED / gate blockers

- Local build/test/benchmark results are unavailable in the current agent environment.
- Any rollout remains OFF until the phase's executable gate is green.
