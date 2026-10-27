# TOOL-0295 · Grade-Adjusted Pace Calculator

Immutable reserved URL: `/tools/grade-adjusted-pace-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Normalize observed running pace to a flat-equivalent pace using Minetti grade energy-cost factors.

## Equation / procedure
Minetti cost C(g)=155.4g⁵−30.4g⁴−43.3g³+46.3g²+19.5g+3.6, g=grade/100; flat-equivalent seconds/km=observed·C(0)/C(g).

## Constraints
Steep downhill, surface, terrain, cadence and course changes can invalidate energetic equivalence. Formula is a model, not an individual calibration.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
