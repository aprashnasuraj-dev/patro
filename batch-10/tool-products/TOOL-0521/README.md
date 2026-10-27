# TOOL-0521: US N-400 Physical Presence and Filing Date Calculator

Route: `/tools/us-n400-physical-presence-calculator` · Family: `F0311` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Count US physical-presence days from entry/exit logs and compare with standard 3-year or 5-year naturalization thresholds.

**Assumptions:** 30 months/913 days in 5 years or 18 months/548 days in 3 years; USCIS counts departure and return days in US.

**Limitations:** Continuous residence, tax and morality conditions not certified.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
