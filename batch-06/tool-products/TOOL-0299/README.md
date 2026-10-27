# TOOL-0299 · Altitude Pace Adjustment Calculator

Immutable reserved URL: `/tools/altitude-pace-adjustment-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Apply an explicit user-controlled altitude pace penalty as a transparent sensitivity model.

## Equation / procedure
Pace at target=baseline pace×(1+input slowdown fraction×positive altitude rise/1000). Result varies linearly with chosen assumption.

## Constraints
Not a validated universal physiology equation: acclimatization, race duration, exertion and oxygen pressure alter performance.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
