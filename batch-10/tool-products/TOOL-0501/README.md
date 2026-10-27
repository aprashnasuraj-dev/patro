# TOOL-0501 — Medicare IRMAA Bracket and Cliff Calculator

Route: `/tools/irmaa-bracket-cliff-calculator` · family `F0295`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

2026 bracket thresholds sourced to CMS; 2024 MAGI used for 2026 premiums.
