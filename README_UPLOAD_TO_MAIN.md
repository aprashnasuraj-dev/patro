# PATRO Cloudflare Recovery Bundle

This is a **safe overlay/recovery package** for the current `aprashnasuraj-dev/patro` `main` branch.

Why overlay instead of replacing the repository:
the current `main` already contains newer Cloudflare Worker, D1, 29-tool, community,
SEO, FM/TV and release-gate code. Replacing it with an older archived bundle could
delete working features. Copy this bundle into the repository root, preserving existing files.

## Apply

1. Download/backup the current `main`.
2. Extract this ZIP.
3. Copy its contents into the repository root.
4. Keep existing application source unless a reference is intentionally used to repair it.
5. Do **not** copy raw secrets or proprietary calendar master archives into public Git.
6. Run:

```bash
npm ci
npm run release:verify
npm run build
```

7. Confirm `wrangler.jsonc` has production `DB` binding and optional `CACHE`.
8. Deploy from `main` through Cloudflare or run the repository's `deploy:cloudflare` script.

## What this bundle adds

- Claude's 16-page Aafnai Patro UI audit and target UI/IA.
- Sep-29 UI/UX enhancement specification.
- Exact 29-tool product contract.
- Six-community + Chakra contract.
- Calendar validation/recovery references.
- Legacy implementation references for lost behavior.
- Time Machine implementation bundle.
- Complete 5,454-record Today-in-History JSON recovery dataset.
- Patro tools implementation kit.
- Cloudflare-oriented product and release verification scripts.

## Important

Files under `references/` are recovery/reference sources. They must not blindly replace newer
production files. Use them only when a current feature is missing or degraded.
