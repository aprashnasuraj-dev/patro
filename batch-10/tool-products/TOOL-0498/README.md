# TOOL-0498 — RSU State and Employer Withholding Gap Calculator

Route: `/tools/rsu-state-withholding-gap-calculator` · family `F0105`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Tax gap uses user-entered rates, rather than an assumed universal state withholding table.
