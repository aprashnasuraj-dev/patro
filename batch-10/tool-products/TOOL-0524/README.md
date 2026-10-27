# TOOL-0524: Credit Card Application Rules and 5/24 Date Checker

Route: `/tools/chase-5-24-credit-card-application-rules` · Family: `F0314` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Track the rolling 24-month count of newly opened personal cards as a conservative, unofficial Chase 5/24 planning aid.

**Assumptions:** Count self-classified card openings inside prior rolling 24 months, not application inquiries.

**Limitations:** Chase 5/24 is an unofficial reported practice, not guaranteed underwriting law.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
