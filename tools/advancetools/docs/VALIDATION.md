# Validation and release checks

Completed against the included final source:

- 104 Node engine/integration/loading tests. Includes numerical golden results, invalid ranges, exhaustive pitch-class checks for all 1,848 chord combinations, six font samples plus regression fixtures, paper boundaries and PDF cross-reference integrity.
- 23 simulated DOM event-flow checks against generated pages. All 146 calculator/thread defaults, six converter samples and text import/export, eight paper previews/exports, chord/gauge/calculation PDF export.
- 2,029 unique titles, matching canonical URLs and sitemap entries; 55,331 resolving internal page links; generated-file hashes checked.
- 12 exported PDFs parsed as single pages, page dimensions and text bounds verified, rendered, and visually inspected in the contact sheet.
- Loading dependency checks: the page entry has no static engine imports; each calculator family avoids unrelated engine imports; each converter adapter imports exactly one vendor mapping. There are no input-fetch, XMLHttpRequest or WebSocket calls in the interface.
- Local installer/postbuild tested for preserving existing settings, idempotence, navigation integration, discovery and static-file limits. A read-only snapshot of the current Patro configuration was also used for a local installation rehearsal. Nothing was deployed.

Additional design checks: unique DOM identifiers, matching in-page anchors, associated labels and sampled contrast. The design report measures representative gzip-compressed file sizes, not live network transfers or complete WCAG compliance. Six illustration asset renders were inspected; they are not browser layout renders.

Not completed: actual Chromium/mobile rendering and audio playback, full Patro production build and deployed Cloudflare behavior. Chromium installation failed because the provided download was truncated; a DOM simulation does not substitute for a real browser.

Reproduce in the extracted package using Node 24+:

```bash
npm run verify
node scripts/dom-check.mjs
node scripts/design-check.mjs
python3 scripts/pdf-check.py
```

PDF QA is a development-only check requiring PyMuPDF, pypdf and Pillow. Production has no such dependencies.

Optional real-browser checks, in two terminals:

```bash
npm run serve
```

```bash
npm install --no-save playwright
npx playwright install chromium
node scripts/browser-check.mjs
```

The browser script exercises desktop/mobile controls, exports, audio activation, blocked external requests, lazy engine boundaries, offline operation after assets load, aliases and missing-path 404. Audio activation checks do not assess human-perceived sound quality. Report status remains pending until that script passes in a real browser environment. Do not treat included PDF contact-sheet images as browser screenshots.

In the actual Patro checkout, run `npm run advancetools:test` and the entire `npm run build`, then the existing repository's required release checks. The resulting total static asset count must remain below 19,500. This module contributes 2,067 assets; the other build output must be below 17,433.
