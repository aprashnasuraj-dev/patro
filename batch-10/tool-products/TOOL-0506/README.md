# TOOL-0506 — Buy-to-Let Interest Coverage Stress Test

Route: `/tools/buy-to-let-icr-stress-test-calculator` · family `F0299`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

Interest-only stress formula: monthly rental income / (loan balance × annual stress rate / 12).
