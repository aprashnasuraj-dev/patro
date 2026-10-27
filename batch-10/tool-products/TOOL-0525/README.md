# TOOL-0525: Heat Pump vs Gas Boiler Payback Calculator

Route: `/tools/heat-pump-vs-gas-boiler-payback-calculator` · Family: `F0288` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Compare delivered-space-heat cost per year for a heat pump versus a gas boiler and show incremental investment payback.

**Assumptions:** Cost_HP = useful heat / seasonal COP × power price; cost_gas = useful heat / boiler efficiency × gas energy price.

**Limitations:** Apples-to-apples demand and accurate seasonal metrics required.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
