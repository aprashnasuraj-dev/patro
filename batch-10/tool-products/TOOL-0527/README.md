# TOOL-0527: Astrophotography NPF Exposure Calculator

Route: `/tools/astrophotography-npf-exposure-calculator` · Family: `F0315` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Estimate untracked star-exposure duration from focal length, aperture, pixel pitch and declination using explicitly attributed NPF formulas.

**Assumptions:** Attributed full NPF: k(16.856N +0.0997f +13.713p)/(f cos δ); simplified estimate (35N+30p)/f.

**Limitations:** NPF developer lists attribution and permission restrictions; no commercial publication without licensing review.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
