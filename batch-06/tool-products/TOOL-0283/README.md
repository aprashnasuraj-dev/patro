# TOOL-0283 · Race Time Predictor (Riegel and Cameron)

Immutable reserved URL: `/tools/race-time-predictor` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Compare Riegel and Cameron forecasts from one known race to a second distance.

## Equation / procedure
Riegel T₂=T₁(D₂/D₁)^1.06; Cameron T₂=(T₁/D₁)D₂·a(D₁)/a(D₂), a(d)=13.49681−0.000030363d+835.7114/d^0.7905, d in metres.

## Constraints
Both extrapolate from race performances; fitness, course and conditions dominate over long jumps. Model valid ranges differ.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
