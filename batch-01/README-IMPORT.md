# Mission Mangal Batch 01 — Import Instructions

This is **one of exactly ten** Git-import batch directories. Import all ten batches as
`batch-01/` through `batch-10/` in the repository root. Do **not** flatten away these
directory names, and do **not** add an eleventh source folder.

Allocated IDs: `TOOL-0001` through `TOOL-0053`. Source packages: 53.

## Extract safely

The GitHub web upload interface does **not** expand ZIP archives. From a local Git
clone or GitHub Codespaces terminal, run from the **repository root**:

```sh
unzip -l MM530_GIT_IMPORT_BATCH_01.zip
unzip -n MM530_GIT_IMPORT_BATCH_01.zip -d .
```

This archive has exactly one top-level directory: `batch-01/`.
Use `-n` to prevent accidental replacement. Inspect collisions instead of overwriting
existing files. Upload/commit the extracted **directory**, not a ZIP pretending to be
website source. Keep everything private until runtime checks pass.

If you upload the ZIP itself to GitHub without extracting it, **GitHub will only store
a compressed file**; none of the tools will work on the public site.

## Reconciliation

- See `catalog.json`: exact 53 IDs, proposed hyphenated canonical routes, legacy
  reservations, category and topic tags, and cross-tool recommendations.
- See `RECONCILIATION.json`: source ZIP provenance, original file hashes, vendor
  helper scoping, and explicit unresolved conflicts.
- Source packages are in `tool-products/TOOL-XXXX/`. Tool-specific `_vendor/`
  preserves checkpoint-compatible shared helpers rather than silently merging
  incompatible `_shared` versions. Import transforms are recorded in the receipt.
- All packages are *source prepared*; `TEST_PENDING` is not an acceptance claim.
- Do not publish any route until independent compilation, fixtures, browser tests,
  legal/medical/licensing review (as applicable), live route audit and site release gate.

## Import-order and checks

After extracting **all ten** directories from the repository root:

```sh
node batch-01/publication/verify-import.mjs --quick
node batch-01/publication/verify-import.mjs --hash
node batch-01/publication/verify-import.mjs --compile  # requires existing local esbuild
```

For unit and browser QA and release gates, read
`batch-01/publication/FAST_QA.md` and `ROUTING_AND_SEO.md`.

**Routing rule:** public URLs come from `catalog.json` and the 530-tool master catalog,
not from each draft tool's original `/tools/...` reservation. Proposals must be
checked against currently published Patro URLs before canonical promotion.

**No Git commits or public deployments were made while preparing this pack.**
