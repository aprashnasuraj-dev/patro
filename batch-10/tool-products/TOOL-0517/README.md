# TOOL-0517: Assumable Mortgage vs New Loan Comparison

Route: `/tools/assumable-mortgage-comparison-calculator` · Family: `F0308` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Compare remaining cash flows for an assumable fixed-rate mortgage against a replacement purchase mortgage without hiding the equity gap.

**Assumptions:** Level-payment amortization; fees and assumption equity gap displayed explicitly.

**Limitations:** Equal-house-price and equal-cash scenario require additional modeling beyond displayed lifetime totals.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
