# TOOL-0497 — Wash Sale CSV Lot Matcher and Form 8949 Helper

Route: `/tools/wash-sale-lot-matching-csv-form-8949` · family `F0112`.

Prepared sources: metadata, HTML with custom fields, TypeScript logic and local UI, responsive CSS, fixtures, primary research, claims and deferred tests.

Status: **TEST_PENDING**. No built artifact, no live route, no publication. The consuming application must bundle `src/ui.ts` per route and resolve `../../_shared/runtime.js` to shared `runtime.ts`. No external requests are made by the calculation or page.

FIFO opening lots assumed complete; exact symbols screened as possible identical securities.
