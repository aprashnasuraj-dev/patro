# TOOL-0508 — UK Inheritance Tax Seven-Year Gift Planner

Route: `/tools/uk-inheritance-tax-seven-year-gift-planner` · family `F0301`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Assumes full net list of non-exempt potentially exempt gifts and hypothetical date of death.
