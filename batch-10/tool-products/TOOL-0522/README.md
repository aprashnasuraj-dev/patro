# TOOL-0522: UK EU and Canada Flight Delay Compensation Checker

Route: `/tools/flight-delay-compensation-uk-eu-canada` · Family: `F0312` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Screen eligible flight-arrival delay compensation using distinct EU, UK and Canadian regimes and carrier-control assumptions.

**Assumptions:** EU/UK compensation uses distance bands with long-flight sub-4-hour reduction; Canadian uses arrival delay and carrier size.

**Limitations:** Connections, rerouting, claims windows and the airline fault category may materially change compensation.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
