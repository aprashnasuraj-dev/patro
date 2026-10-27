# TOOL-0528: Quilt Yardage, Backing and Binding Calculator

Route: `/tools/quilt-yardage-binding-batting-calculator` · Family: `F0316` · status: **TEST_PENDING**

Source-only browser route intended for lazy-loading when opened. HTML entrypoint references `src/ui.ts` for the later application bundler and `../../_shared/runtime.ts` for bounded input validation. It is not a compiled standalone deployment.

Size quilt backing, batting and binding strips with width-of-fabric assumptions, seam allowances and edge margins.

**Assumptions:** Backing panels = ceil((quilt width + overhang) / (usable fabric width net seams)); strip count uses perimeter and diagonal joins.

**Limitations:** No motif-match, shrinkage or bias-binding algorithms.

No builds, tests, Git writes, worker deployments, account creation, or publication executed in source preparation.
