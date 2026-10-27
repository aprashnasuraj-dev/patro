# TOOL-0284 · Heart Rate Zone Calculator (Karvonen and %Max)

Immutable reserved URL: `/tools/heart-rate-zone-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Compare heart-rate reserve training ranges with percentage-of-maximum targets.

## Equation / procedure
Estimated HRmax=208−0.7·age unless measured maximum supplied; Karvonen target=resting+fraction·(maximum−resting); %Max=maximum·fraction.

## Constraints
Medical conditions and medications can invalidate generic heart-rate zones. HRmax from age is an estimate.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
