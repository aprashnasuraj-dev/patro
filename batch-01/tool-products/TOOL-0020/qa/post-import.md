# Semantic JSON Diff (Ignore Key and Array Order) — Git-import test plan

1. Verify exact extracted hashes, route /tools/json-diff-ignore-order, noindex and absent live canonical.
2. Install any declared pinned dependency under repo control; check license and framework compatibility.
3. Run tests/core.test.ts with Vitest, then actual TS typecheck and isolated production build.
4. Verify representative and adversarial cases, especially Unordered arrays implement multiset semantics (duplicates matter); array sorting may erase meaningful sequence semantics. Large nested values are bounded to prevent resource exhaustion.
5. Browser check 320/375/768/1440px, dark/light contrast, focus, keyboard, screen reader output, reduced motion, copy and download, and check zero tool-engine network calls.
6. Fix and rerun; record evidence with date/versions. Never unlock publication.
