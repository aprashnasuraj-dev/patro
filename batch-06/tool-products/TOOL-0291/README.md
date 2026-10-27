# TOOL-0291 · HIIT and Tabata Interval Timer

Immutable reserved URL: `/tools/tabata-interval-timer` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Build and run a customizable high-intensity interval workout with warm-up, repeats and cool-down.

## Equation / procedure
Total = warmup + sets×rounds×work + sets×(rounds−1)×rest +(sets−1)×between + cooldown. Audible notification requires user gesture.

## Constraints
High-intensity training should be scaled to fitness; browser throttling can delay timers in background.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
