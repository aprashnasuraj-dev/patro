# TOOL-0285 · Barbell Plate Loading Calculator

Immutable reserved URL: `/tools/barbell-plate-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Build a balanced barbell loading plan from available matched plate pairs, including collars.

## Equation / procedure
Bounded pair-count subset sum in quarter-kilogram precision, target=(total−bar−collars)/2 per side; exact combinations favored over greedy.

## Constraints
Requires symmetric matching pairs; fractional plate increments below 0.25 kg and uneven specialty bars are unsupported.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
