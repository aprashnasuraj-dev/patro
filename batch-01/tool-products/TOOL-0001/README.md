# TOOL-0001 · CSV to GraphQL Schema Generator

Reserved route: `/tools/csv-to-graphql-schema`. Private source draft. **TEST_PENDING: not product accepted.**

## Run the prepared static package

Serve the containing directory using an HTTP static server, for example `python -m http.server 8765 --directory .` from the directory containing `tool-products`. Open `http://127.0.0.1:8765/tool-products/TOOL-0001/page.html`. The included dist bundles need no CDN or runtime package installation. File URLs may block workers. No deployment is authorized.

## Later private import checks (not executed under V2)

From the directory containing tool-products:

```sh
npm ci --prefix tool-products/_shared
node tool-products/_shared/setup.mjs
node tool-products/_shared/node_modules/typescript/bin/tsc -p tool-products/TOOL-0001/tsconfig.json
node --test tool-products/TOOL-0001/tests/core.test.mjs
node tool-products/_shared/build.mjs TOOL-0001
```

Node 24.22.1 was used for the earlier core tests. The `.ts` import uses Node's native type stripping. For browser QA install Playwright in a separate test environment; set PLAYWRIGHT_MODULE to its module path if it is outside normal resolution. Set CHROMIUM_EXECUTABLE only if supplying a browser binary, and TEST_URL if using a different server. Run `node tool-products/TOOL-0001/tests/browser.cjs` while the static server is running. The runner writes screenshots and results under qa, so run it on a fresh validation checkout and compute new hashes after acceptance.

## Known validation status

Before the source-first change, 20 core tests passed, the build succeeded, and an earlier UI revision passed typecheck. A browser run exercised several interactions and captured six responsive/theme screenshots but failed during the large-input cancellation test: Playwright's textarea fill timed out. There is no final browser PASS. Do not treat partial screenshots as acceptance. UI overrides were adjusted after the initial typecheck; current-revision typecheck is deferred. Future testing must address the timeout and retest the final source.

Review `qa/acceptance.json` for exact evidence. The final QA stage must also assess browser compatibility, real mobile behavior, screen-reader announcements and live integration. Core Web Vitals and cross-browser behavior are not measured.

## Integration

Independent typed core, tool-specific DOM UI and worker. Later import can dynamically load this page or adapt the UI to the existing React/Vite router. Inspect current Patro before adding an explicit route: the existing `/tools/*` fallback is not this converter. The included HTML is a static noindex draft and contains no live canonical or publication metadata. Global application analytics must never capture CSV input.

## Rights

Original tool source/UI prepared for the owner's private project, with no public license granted here. Bundled Papa Parse and graphql-js retain their MIT notices in licenses. No copied template, external font, stock image or private user dataset is included.
