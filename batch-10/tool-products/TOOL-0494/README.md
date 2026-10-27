# TOOL-0494 — Chicken Coop Size & Feed Calculator

Route: `/tools/chicken-coop-size-feed-calculator` · family `F0291`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Space per bird is supplied by the user; feed is an editable consumption estimate.
