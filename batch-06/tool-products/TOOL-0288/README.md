# TOOL-0288 · TDEE Calculator Comparing Equations

Immutable reserved URL: `/tools/tdee-calculator-compare-equations` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Compare two basal metabolic-rate equations and an activity-factor estimate of daily expenditure.

## Equation / procedure
Mifflin-St Jeor 10W+6.25H−5A+(5 male/−161 female); revised Harris–Benedict alternative; TDEE≈BMR×user-chosen factor.

## Constraints
Population estimates, not measured metabolism or personalized nutrition targets; binary coefficients may not fit all people.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
