# TOOL-0499 — HSA Contribution Limit and Midyear Eligibility Calculator

Route: `/tools/hsa-contribution-limit-monthly-calculator` · family `F0293`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

2026 annual limits $4,400 self-only, $8,750 family; catch-up $1,000 when age eligible.
