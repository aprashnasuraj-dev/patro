# TOOL-0530: Card Surcharge vs Cash Discount Pricing Calculator

Route: `/tools/card-surcharge-cash-discount-calculator` · Family: `F0318` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Show merchant net revenue under a cash-discount model versus card surcharging, with mathematical break-even fee recovery.

**Assumptions:** Card proceeds = sticker price×(1+surcharge)×(1−processor %) − flat processing fee; cash proceeds = sticker×(1−cash discount).

**Limitations:** Legal compliance cannot be inferred solely from numeric economics or processor contracts.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
