# TOOL-0294 · Endurance Fueling Calculator (Carbs per Hour)

Immutable reserved URL: `/tools/endurance-fueling-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Plan carbohydrate intake across an endurance event and break it into practical feeding intervals.

## Equation / procedure
Total grams=hours×g/hour. Carbs per feeding interval = g/hour×minutes/60; portions=total/grams per portion.

## Constraints
Sports nutrition commonly cites 30–60g/h for 1–2.5h and up to ~90g/h longer with gut training; diabetes and metabolic conditions need tailored advice.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
