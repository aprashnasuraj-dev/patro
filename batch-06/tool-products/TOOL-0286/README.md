# TOOL-0286 · Critical Swim Speed (CSS) Calculator

Immutable reserved URL: `/tools/critical-swim-speed-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Calculate swim threshold pace from one 400-metre and one 200-metre time trial.

## Equation / procedure
CSS seconds/100m = (T400−T200)/2. This is the slope of time versus distance between the two swims.

## Constraints
Requires maximal swims in comparable conditions; intervals differ from training prescriptions and turns/pool length affect comparisons.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
