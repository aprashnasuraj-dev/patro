# TOOL-0300 · DOTS and Wilks Score Calculator for Powerlifting

Immutable reserved URL: `/tools/dots-score-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Compare DOTS and original Wilks scores for a supported powerlifting bodyweight and competition total.

## Equation / procedure
DOTS=500×total/(a·mass^4+b·mass³+c·mass²+d·mass+e). Wilks=500×total/(a+b·mass+c·mass²+d·mass³+e·mass⁴+f·mass⁵), sex-specific published coefficients.

## Constraints
Scores are not directly comparable across scoring systems or rulebooks; outside fitted ranges blocked rather than extrapolated.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
