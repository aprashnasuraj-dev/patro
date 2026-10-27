# TOOL-0282 · Running Pace Calculator with Split Export

Immutable reserved URL: `/tools/running-pace-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Calculate pace, speed and evenly paced kilometer or mile splits; export training splits as CSV.

## Equation / procedure
Pace = total seconds/distance. Splits derive from exact final partial segment (not a full extra split).

## Constraints
Even pacing is a theoretical target, not a prediction; road measurements and GPS differ.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
