# TOOL-0298 · Hiking Time Estimator (Naismith and Tobler)

Immutable reserved URL: `/tools/hiking-time-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Compare Naismith and Tobler walking-time models for a trail with recorded ascent and descent.

## Equation / procedure
Naismith: distance/5km/h+ascent/600m/h. Tobler speed=6 exp(−3.5·abs(slope+0.05)), slope≈(ascent−descent)/(distance×1000).

## Constraints
Tobler requires local slopes along the route; using net slope is a rough proxy and can badly underestimate rolling terrain, breaks and hazards.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
