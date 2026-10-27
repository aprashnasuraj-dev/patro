# TOOL-0293 · Weekly Mileage Progression Planner

Immutable reserved URL: `/tools/weekly-mileage-planner` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Draft a progressive running-volume plan with optional cutback weeks and rounded weekly totals.

## Equation / procedure
For regular weeks volume←previous×(1+growth/100); every cutback week volume←previous×(1−drop/100). No automatic rebound spike.

## Constraints
Load tolerance varies by injury history, terrain and intensity; the “10% rule” is not a universal safety threshold.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
