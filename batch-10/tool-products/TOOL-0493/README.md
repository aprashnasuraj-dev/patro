# TOOL-0493 — Horse & Livestock Hay Needs Calculator

Route: `/tools/livestock-hay-feed-needs-calculator` · family `F0290`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Feed calculations use user-selected body weight and dry matter; no universal intake is implied.
