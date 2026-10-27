# TOOL-0529: Puppy Adult Weight Estimate and Growth Curve

Route: `/tools/puppy-adult-weight-growth-predictor` · Family: `F0317` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Illustrate puppy growth uncertainty from a veterinarian-supplied fraction of mature weight; do not force breed-independent forecasts.

**Assumptions:** Adult weight = current measured weight divided by user-supplied estimate of fraction of mature weight.

**Limitations:** This tool does not diagnose growth, nutritional status or orthopedic risk.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
