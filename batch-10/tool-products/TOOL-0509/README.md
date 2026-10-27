# TOOL-0509 — UK Shared Parental Leave and Pay Planner

Route: `/tools/uk-shared-parental-leave-planner` · family `F0262`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

England/Wales/Scotland shared parental leave theoretical maximum 50 leave weeks and 37 pay weeks, subject to maternity leave used.
