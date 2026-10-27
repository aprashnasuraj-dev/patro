# TOOL-0287 · FTP Zones and Power-to-Weight Calculator

Immutable reserved URL: `/tools/ftp-zones-calculator` (NOT PUBLISHED).

Core: `src/core.ts` exporting `calculate(input)`. UI: `src/ui.ts` and `page.html`; responsive CSS: `src/styles.css`.

## Function
Produce cycling threshold power zones and power-to-weight ratio from a tested FTP.

## Equation / procedure
Coggan threshold percentage bands use 55%, 75%, 90%, 105% and 120%; Zone 6 is open-ended; neuromuscular sprint power cannot be bounded with FTP alone.

## Constraints
A 20-minute trial or device estimate can misstate true FTP; zones require individualized training context.

## Integration
- Import this tool into AafnaiPatro's Vite route registry with lazy loading; resolve `../../_shared/runtime.js` to bundled TypeScript module source.
- Maintain one immutable tool ID, check route collisions, preserve existing published URL redirects.
- Treat sample examples as developer input, never factual user measurements.
- QA status `TEST_PENDING`: DO NOT declare production-ready without running deferred tests and human domain review.
