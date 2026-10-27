# TOOL-0514: Australian Super Concessional Carry-Forward Calculator

Route: `/tools/australia-super-concessional-carry-forward-calculator` · Family: `F0305` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Model unused concessional contribution capacity across five prior financial years, consuming oldest eligible unused cap first.

**Assumptions:** Unused concessional cap amounts from five prior years are generally usable if total super balance was under $500,000 at previous 30 June.

**Limitations:** Prior-year amounts must be entered from official ATO records; no ATO account lookup.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
