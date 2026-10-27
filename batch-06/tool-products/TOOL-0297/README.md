# TOOL-0297 · Steps to Distance and Calories Converter

Immutable reserved URL: `/tools/steps-to-km-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Convert a step count into an estimated distance, elapsed time and activity energy.

## Equation / procedure
Distance=steps×step length. Minutes=steps/cadence. kcal≈MET×3.5×bodyweight×minutes/200.

## Constraints
Activity calories are gross estimates including resting expenditure; trackers vary; MET assumes constant effort and cadence.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
