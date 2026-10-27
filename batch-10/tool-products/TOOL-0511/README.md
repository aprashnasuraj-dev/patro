# TOOL-0511: Canadian OAS Clawback and RRIF Planner

Route: `/tools/canada-oas-clawback-rrif-planner` · Family: `F0302` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Estimate Canadian OAS recovery tax and the incremental effect of an RRIF withdrawal, keeping the income year and payment period explicit.

**Assumptions:** Recovery tax = min(OAS received,15% of annual net world income above threshold); not the total marginal tax.

**Limitations:** Non-resident and income-year exceptions, RRIF minimum percentages and pension splitting need external review.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
