# TOOL-0296 · Nutrition Facts Label Generator

Immutable reserved URL: `/tools/nutrition-facts-label-generator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Create a browser-only illustrative Nutrition Facts panel from per-serving user-entered nutrients.

## Equation / procedure
Daily Value percentages use current US FDA adult reference amounts (fat 78g, sat fat 20g, sodium 2300mg, carb 275g, fiber 28g, added sugar 50g).

## Constraints
Preview/mockup ONLY; not FDA-compliant labeling. Mandatory fields, approved rounding, RACC, allergens, declarations and lab evidence are outside this calculator.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
