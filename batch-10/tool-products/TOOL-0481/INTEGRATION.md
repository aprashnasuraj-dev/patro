# Integration handoff for TOOL-0481

Immutable route: `/tools/tracking-number-carrier-identifier`. Family `F0281`, Batch 10.

Use the existing TypeScript route bundler for `src/ui.ts`, which imports `src/core.ts` and existing `_shared` files. `page.html` intentionally does not ship a compiled JS bundle; directly serving `.ts` with an unconfigured static host is unsupported.

Do not build or typecheck during source preparation. During later integration, bundle lazily on route activation and ensure the compiled asset resolves relative shared dependencies.

Source data never intentionally transmit user inputs to an external service; external references are navigation only.

Keep `robots=noindex`, no canonical, no sitemap and publication gate LOCKED until approved.
