# TOOL-0518: California Meal Break and Overtime Wage Claim Calculator

Route: `/tools/california-meal-rest-break-wage-claim-calculator` · Family: `F0263` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Screen California daily overtime and meal/rest premium wages using explicit non-exempt status assumptions and weekly work logs.

**Assumptions:** Daily >8h at 1.5x and >12h at 2x for ordinary nonexempt schedule; premium assumption must be verified.

**Limitations:** No automatic determination of a Labor Code violation.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
