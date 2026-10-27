# Exact ten-folder Git import

Import only `batch-01/` ... `batch-10/`. A ZIP file stored in Git is **not** automatically extracted.

1. Use a private local clone or GitHub Codespaces terminal. Preserve current site repository separately.
2. Copy the 10 provided ZIPs to a temp location. Compare SHA-256 against the supplied Drive receipt.
3. From repo root inspect every ZIP with `unzip -l`, then `unzip -n ZIP -d .`. Never use `unzip -o`.
4. Confirm `find . -maxdepth 1 -type d -name 'batch-??'` finds ten folders. No other source folder is required to upload.
5. Execute `node batch-01/publication/verify-import.mjs --quick` and then `--hash`; failures block integration.
6. Execute `--compile` **only after local esbuild is available** (no automatic npm installs). Then run deferred tests with the repository's existing Vitest/Node test runners. `TEST_PENDING` does not imply PASS.
7. Connect to Patro's existing Vite/Cloudflare route pipeline using an adapter which reads `batch-*/catalog.json`, outputs static HTML shells, and lazy-imports the selected tool's compiled entry. Do not import all 530 implementations into the landing-page JS.
8. Audit live route collisions and the pre-existing published URL baseline before activating proposed canonical or legacy redirects.
9. Stage progressively (e.g. 10–25 accepted pages per rollout); no indexing or sitemap entries until each page is runnable and verified.
10. Owners control actual Git commit, review and deployment. This source pack makes no Git changes.

**Integrity:** each batch `RECONCILIATION.json` tracks source hashes and transformed helper import references. Check with the verifier before trusting it. Shared code was scoped per tool to avoid version overwrites.

**Conflict policy:** if a proposed canonical URL already belongs to a different published AafnaiPatro page, quarantine that candidate. Preserve the existing page. Manually adjust the canonical proposal, regenerate the route catalog, and then create redirect rules only for *previously served routes*.
