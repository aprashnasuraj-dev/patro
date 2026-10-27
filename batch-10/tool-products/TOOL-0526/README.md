# TOOL-0526: Generator Sizing and Starting Watts Calculator

Route: `/tools/generator-sizing-running-starting-watts` · Family: `F0289` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Estimate sustained generator load plus one or more motor starting surges from an appliance roster with explicit simultaneous-start groups.

**Assumptions:** Peak = total steady running watts plus the largest simultaneous starting extra watts; applies user-entered reserve.

**Limitations:** Does not size fuel tank, neutral bonding, grounding, power factor or transfer switch.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
