# Aafnai Patro logo refresh

Source: Cloudflare R2 bucket `patro`, object `आफ्नै_ Himalayan Calendar Logo.png` (corresponding uploaded artwork).

This overlay replaces `public/favicon.svg`, `public/favicon.ico`, icon-192, icon-512, maskable-512, Apple touch icon and optional logo assets. The repository's existing manifest already references these paths, so it is deliberately left unchanged to preserve all routes, shortcuts, and PWA configuration.

## Apply
From a fresh checkout of `aprashnasuraj-dev/patro`:
1. Copy the contents of this package's `public/` into your repository's `public/`, overwriting matching files.
2. Copy `apply-brand-refresh.py` into the repository root and run `python apply-brand-refresh.py`.
3. Review icon usage in React and any generated site assets, then run `npm run build` and `npm run test:release-safety`.
4. Commit and deploy only after checks pass.

## Important
This package is NOT yet committed to GitHub or deployed to Cloudflare. R2 bucket public access is currently disabled, so use bundled local static files, not a direct R2 URL.
Small-size browser favicons necessarily simplify intricate art. Existing installed PWAs may require a restart or reinstall to refresh OS-level icons.
