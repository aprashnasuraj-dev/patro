# TOOL-0516: Australian Home Battery Payback Calculator

Route: `/tools/australia-home-battery-payback-calculator` · Family: `F0307` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Compare a home battery’s net installation expense with displaced grid imports and foregone feed-in tariffs using annual cash flows.

**Assumptions:** Annual savings = solar shifted × (round-trip efficiency × import tariff − lost export tariff) minus annual cost, with degradation.

**Limitations:** Programs, dynamic tariffs and discharge limitations can substantially change the result.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
