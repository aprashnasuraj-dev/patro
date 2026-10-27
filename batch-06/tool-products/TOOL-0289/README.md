# TOOL-0289 · Sleep Cycle Bedtime Calculator

Immutable reserved URL: `/tools/sleep-cycle-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Plan an adult bedtime around realistic total sleep duration, without treating 90-minute cycles as fixed.

## Equation / procedure
Work backward from wake time by 7, 8, or 9 hours of sleep plus individual sleep-onset latency; clock calculations wrap across midnight.

## Constraints
No fixed 90-minute cycle guarantees an optimal wake time; adult needs differ; shift workers should seek tailored advice.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
