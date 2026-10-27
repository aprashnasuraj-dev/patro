# TOOL-0523: Airline Carry-On and Personal Item Checker

Route: `/tools/airline-carry-on-size-weight-checker` · Family: `F0313` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Compare actual hand-luggage dimensions against explicitly entered airline allowance limits, with configurable dimension-rotation.

**Assumptions:** Measured packed bag is compared in cm/kg; optional dimension rotation handles orientation changes.

**Limitations:** No airline-specific policy database or guarantee of boarding acceptance.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
