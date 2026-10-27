# TOOL-0520: UK ILR and Citizenship Absence Calculator

Route: `/tools/uk-ilr-citizenship-absence-calculator` · Family: `F0310` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Check whole-day UK absences against a rolling 12-month ILR screen or nationality total/last-year limits.

**Assumptions:** Whole days outside UK counted between departure/return. ILR uses rolling 12 calendar months; citizenship uses 3/5-year total and final 12 months.

**Limitations:** Applications with exempt absences, special routes or overlapping trips require review.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
