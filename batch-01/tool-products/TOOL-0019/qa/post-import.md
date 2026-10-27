# package-lock.json Duplicate Dependency Finder — Git-import test plan

1. Verify exact extracted hashes, route /tools/package-lock-duplicate-finder, noindex and absent live canonical.
2. Install any declared pinned dependency under repo control; check license and framework compatibility.
3. Run tests/core.test.ts with Vitest, then actual TS typecheck and isolated production build.
4. Verify representative and adversarial cases, especially Multiple versions of the same package are not automatically a vulnerability or redundant install; deduplication can break semver constraints.
5. Browser check 320/375/768/1440px, dark/light contrast, focus, keyboard, screen reader output, reduced motion, copy and download, and check zero tool-engine network calls.
6. Fix and rerun; record evidence with date/versions. Never unlock publication.
