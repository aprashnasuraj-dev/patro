# TOOL-0512: Canada FHSA and RRSP Home Buyers Plan Planner

Route: `/tools/canada-fhsa-rrsp-home-buyers-plan` · Family: `F0303` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Compare first-home savings account remaining room and RRSP Home Buyers’ Plan withdrawal capacity with a repayment preview.

**Assumptions:** FHSA annual room $8,000 plus up to $8,000 carryforward; $40,000 lifetime combined contributions/transfers. HBP cap $60,000.

**Limitations:** Complex excess FHSA repairs, withdrawal year exemptions and RRSP qualification excluded.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
