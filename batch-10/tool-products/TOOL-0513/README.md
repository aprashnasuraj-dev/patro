# TOOL-0513: Canada Vacation and Stat Holiday Pay Calculator

Route: `/tools/canada-vacation-statutory-holiday-pay-calculator` · Family: `F0304` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Separate federal annual vacation percentage from federally regulated general-holiday pay and a distinct Ontario illustration.

**Assumptions:** Federal annual vacation 4%, 6%, 8% based on completed service; Ontario ordinarily 4% or 6%. Enter legal qualifying wages.

**Limitations:** This is not an automatically validated province-wide entitlement calculator.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
