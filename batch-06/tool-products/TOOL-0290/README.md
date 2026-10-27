# TOOL-0290 · Caffeine Half-Life Decay Calculator

Immutable reserved URL: `/tools/caffeine-half-life-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Estimate remaining caffeine after elapsed hours, including multiple elapsed-time checkpoints.

## Equation / procedure
Residual caffeine dose=initial·2^(−hours/half-life), representing single-compartment first-order elimination.

## Constraints
Real absorption, interactions, smoking, pregnancy and genetics alter half-life; not blood concentration or clearance advice.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
