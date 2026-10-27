# TOOL-0500 — Medicare Enrollment Window and Late Penalty Calculator

Route: `/tools/medicare-enrollment-window-penalty-calculator` · family `F0294`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Uses standard age-65 IEP; excludes disability, ESRD and ALS pathways.
