# TOOL-0515: Australian Long Service Leave Calculator

Route: `/tools/australia-long-service-leave-calculator` · Family: `F0306` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Calculate an auditable long-service-leave accrual scenario only after entering the relevant state, award or contract rate.

**Assumptions:** Accrued weeks = eligible service years × legally verified accrual rate; pay at entered ordinary weekly rate.

**Limitations:** Entitlement vesting and pro-rata payout cannot be inferred solely from service years.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
