# TOOL-0281 · One-Rep Max Calculator (Multi-Formula)

Immutable reserved URL: `/tools/one-rep-max-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Compare three established equations for predicting an estimated single maximal repetition from a weight and completed reps.

## Equation / procedure
Epley = W(1+reps/30); Brzycki = 36W/(37−reps); Lombardi = W·reps^0.1. One actual repetition returns W.

## Constraints
These are estimates, not safe lifting prescriptions; results weaken for many repetitions and different lifts.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
