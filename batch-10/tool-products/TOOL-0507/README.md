# TOOL-0507 — UK Pension Annual Allowance Carry-Forward Calculator

Route: `/tools/uk-pension-allowance-carry-forward-calculator` · family `F0300`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Standard allowance £60,000 in 2026/27; user may lower for taper.
