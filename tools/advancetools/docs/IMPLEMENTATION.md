# Integration into the existing Patro repository

## Observed project layout

Read-only inspection of `aprashnasuraj-dev/patro` on 10 October 2026 found:

- A React/Vite build with `public/` copied into `dist/`.
- `worker/optimized-entry.ts` as the production entry point.
- Asset binding `ASSETS`, `not_found_handling: "none"`, and selective `run_worker_first` patterns.
- `scripts/prepare-cloudflare-config.mjs` preserving base asset-first exclusions when it generates deployment configuration.
- A final static-file budget guard rejecting builds at or above 19,500 files.
- A root service worker that caches script assets. The new module uses content-hashed asset directories to avoid stale calculator code.

This is an additive static module. It adds navigation entries in AppChrome, with no changes to calendar, news, community tools, account routes, database, scheduled jobs or Worker implementation.

## Manual Git upload route

Work in a local checkout first whenever possible. If uploading through GitHub later, include every new file and all configuration changes together.

1. Copy the **contents of** `upload/` into the repository root. This creates `public/advancetools/` and `tools/advancetools/`. Do not upload a top-level `upload/` folder.
2. Merge `integration/headers.fragment` into `public/_headers`. Keep the existing lines. The scoped block removes the inherited CSP only for this module, then adds a restrictive module policy. Its scripts are local; inline JSON data is non-executable.
3. Merge `integration/redirects.fragment` into `public/_redirects`. If a catch-all redirect exists, put the exact typo rules before the catch-all. No typo URL belongs in the sitemap.
4. Add these patterns to `assets.run_worker_first` in `wrangler.jsonc`, preserving the other patterns:

```json
"!/advancetools",
"!/advancetools/*"
```

This makes existing module assets eligible for asset-first delivery. It avoids executing the Patro Worker for ordinary matching module files. Unknown paths still need to return a real 404; never introduce an SPA fallback for this subtree.

5. Add these npm scripts to the existing `package.json`:

```json
"advancetools:build": "node tools/advancetools/scripts/build.mjs --repo",
"advancetools:test": "node --test tools/advancetools/tests/*.test.mjs",
"advancetools:postbuild": "node tools/advancetools/scripts/postbuild.mjs"
```

6. Preserve the entire existing build command. Prepend `npm run advancetools:build && ` and append ` && npm run advancetools:postbuild`.
7. Run the module tests, full Patro build and current product release checks locally. Do not use remote bootstrap/import commands for this module.
8. Apply `integration/navigation.patch.json` to `src/components/AppChrome.tsx`: it adds a normal link to the featured tools rail and the footer. The local installer performs this with exact-anchor guards. If the UI file changes later, review the small patch rather than replacing the whole component.

The package does not supply replacement versions of `package.json`, `_headers`, `_redirects` or `wrangler.jsonc`: their other content may have changed by the time you implement it. The installer merges them instead.

## Regeneration

Within the standalone package, `node scripts/build.mjs` emits `upload/public/advancetools/`.

Within the installed repository, `npm run advancetools:build` emits `public/advancetools/`. Vite then copies those pages and assets. The build cleans only the module output directory, not the surrounding `public/` tree.

`SITE_ORIGIN=https://aafnaipatro.com` is the default. Override only with an HTTPS origin without a path when building for a different domain.

No database migrations, environment secrets, scheduled tasks, external APIs or runtime npm packages are needed. The original converter sources are bundled with their license notices; browser code does not fetch mappings from a CDN.

## URLs and indexing

- Canonical HTML uses trailing slashes, with real `index.html` files in directories.
- Sitemap: `https://aafnaipatro.com/advancetools/sitemap.xml`.
- The postbuild script adds the module sitemap into the built root `<sitemapindex>` and appends its discovery line to built `robots.txt`.
- If a future root sitemap is a `<urlset>` instead, the postbuild script stops rather than replacing it. Convert it to an index while preserving its URLs, or add the module sitemap only via robots/Search Console.
- Do not add fake `lastmod` dates. They are intentionally omitted.
- Module JSON inventory, licenses and script assets receive `X-Robots-Tag: noindex` in the supplied scoped headers. Downloadable PDFs are not listed in the sitemap.
- If robots already disallows `/advancetools`, resolve that exclusion deliberately; the postbuild script detects it.

## File and traffic budget

The prepared module adds 2,067 files, including 2,029 HTML pages. The existing project rejects a total build of 19,500 or more, so before adding this module the other output must stay below 17,433 files. The postbuild script checks the combined output again.

The generated module is about 55.9 MB uncompressed before its JSON inventory. Most of that is HTML and repeated SVG chord diagrams. Runtime dependencies are shared, hashed and cacheable. A visitor normally downloads one tool page plus its shared modules, not the entire site.

A rough bandwidth illustration: at 150 KB transferred per first tool visit, 500,000 visits/day would imply roughly 75 GB/day before cache reuse. This is not a measured bundle transfer figure or a hosting price estimate. Actual compressed transfers, caching and browser reuse must be measured after deployment.

Matching static-asset requests avoid the module's own compute/database use. That does not guarantee all traffic fits an account's plan: other Patro features, unknown routes, bots and existing Worker paths have separate costs.

## Rollback

Before committing later, inspect the local diff. To remove this module, restore the original local backed-up configuration files, remove the two new module directories, and remove the module discovery entry from the build. No schema or stored user data has been introduced. Keep the original backup out of Git.

## Release limitations

The installer and postbuild behavior were tested on isolated representative local fixtures. The full existing Patro build and production routing were not executed. Browser rendering remains pending. Git upload/deployment remains entirely with you; this package triggers neither.

## Loading and Worker behavior

There is no tool API, Worker function, database, timer job or server-side calculation. Every generated page is a real static HTML asset. The hub and category pages load only the small interface/search entry module; they do not import calculation engines. Opening a tool page dynamically imports only its family engine. Font pages import one selected converter and its mapping, not all six mappings. Shared number validation is a separate tiny module.

PDF code is imported only after a PDF download click. SVG downloads reuse the paper engine. Synthesized chord audio starts only after a user clicks Hear voicing, using the browser AudioContext. No external font, audio or mapping download is required. Ad code remains unloaded while advertising is disabled.

The two `run_worker_first` exclusions in the integration guide are required to make matching `/advancetools/` files asset-first. Page navigation still makes a static asset request; this is not zero network traffic. Existing asset caches reduce repeat transfers. Unknown paths, existing site routes and bots requesting missing files can still reach existing routing logic. This module does not add a service worker or prefetch all tools. The existing site's service worker may still mediate requests if a visitor already installed it; hashed script directories avoid stale module code.

After required engines have loaded, changing inputs and exporting already-loaded formats works without network requests. A first PDF export needs one local static module download. Normal navigation to a different tool still needs that tool's static assets.
