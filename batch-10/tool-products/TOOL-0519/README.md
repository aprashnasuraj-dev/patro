# TOOL-0519: US Chapter 7 Bankruptcy Means Test Estimator

Route: `/tools/chapter-7-bankruptcy-means-test-estimator` · Family: `F0309` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Screen six months of household gross income against a user-verified US Trustee median table for the relevant filing date.

**Assumptions:** Current monthly income is average of six complete calendar months before filing, ×12; compares against externally verified DOJ state table.

**Limitations:** Not a case-filing or legal eligibility decision; statutory exemptions may alter calculation.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
