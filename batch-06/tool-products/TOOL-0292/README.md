# TOOL-0292 · Box Breathing and 4-7-8 Breathing Pacer

Immutable reserved URL: `/tools/box-breathing-timer` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Choose box or 4-7-8 breathing and follow a paced, cancelable browser animation.

## Equation / procedure
Box phases: inhale 4s, hold 4s, exhale 4s, hold 4s. 4-7-8: inhale 4s, hold 7s, exhale 8s. Total derived exactly from phase durations.

## Constraints
Stop if dizzy or uncomfortable. This is not a respiratory treatment or evidence of clinical benefit.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
