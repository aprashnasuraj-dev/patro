# Aafnai Advanced Tools — complete design and implementation package

This ZIP adds all five collections under `https://aafnaipatro.com/advancetools/`. It does not replace the Patro app. Nothing has been pushed to GitHub, submitted to search engines or deployed to Cloudflare.

| Collection | Canonical path | Included |
|---|---|---|
| Knitting and crochet | `/advancetools/knittingcalculators/` | 41 calculators, 3 reference charts, gauge worksheet and calculation PDFs |
| Chord library | `/advancetools/chordlibrary/` | 11 tunings, 14 chord types, 12 roots, 1,848 complete chord pages, diagrams, audio preview and chord PDFs |
| Workshop reference | `/advancetools/workshopreference/` | 99 metric/UNC/UNF thread pages, 6 calculators, thread geometry and measured-limit fits |
| Font converters | `/advancetools/fontconverters/` | Hindi, Bengali, Sinhala, Tamil and Myanmar conversion; 6 directions, TXT import/export, ambiguity reporting |
| Printable paper | `/advancetools/printablepaper/` | 8 vector paper types, A4/A5/Letter, orientation, spacing, colour, margins, PDF/SVG |

**Redesigned across all five collections:** original vector illustration headers, individual colour themes, editorial typography, responsive navigation, light/dark appearance, result cards, conversion editors and a paper canvas. `docs/FRONTEND_DESIGN.md` explains the design and verification limits.

**Total: 2,029 indexable HTML pages.** The misspelled `/advancetools/kinitingcalculators/` path has an included 301 redirect to the correct spelling.

## Before uploading

1. Unzip the package on your computer. Keep `START_HERE.md`, `docs/`, `scripts/` and the source for reference.
2. Use Node.js 24 or newer. There are no required npm dependencies for this module.
3. Preview locally:

```bash
cd advancetools-package
npm run serve
```

Open `http://localhost:4173/advancetools/`. The server is only a development preview; production uses static files.

## Recommended local installation into Patro

The installer only reads/writes local files. It does not run git, npm builds, deployment tools or cloud APIs.

```bash
node /absolute/path/advancetools-package/scripts/install.mjs /absolute/path/patro --check
node /absolute/path/advancetools-package/scripts/install.mjs /absolute/path/patro
```

It copies the prepared static pages into `public/advancetools`, installs editable source under `tools/advancetools`, preserves the existing build command, and merges scoped headers/redirects and asset-first routing exclusions, and adds links to the existing tools rail and footer. Existing settings are backed up in `.advancetools-local-backup/` on your computer. Do not commit that backup folder.

Then, inside the Patro repository:

```bash
npm run advancetools:test
npm run build
```

The build generates the module, runs the existing Patro build, and then adds the module sitemap to the **built** root sitemap index and robots file. Full Patro checks still need to pass in your actual checkout before you upload/deploy later.

For manual GitHub upload, follow `docs/IMPLEMENTATION.md`. **Uploading only the HTML folder is insufficient:** the existing Worker otherwise handles these paths as unknown routes. The routing and build integrations are required.

## What has been verified here

- 104 automated engine/integration tests passed.
- 23 DOM event-flow simulation checks passed, including all 146 calculator/thread default flows and conversion/export actions.
- All 2,029 pages have unique titles, valid canonical targets and matching sitemap entries.
- 55,331 internal page links resolve to prepared pages.
- Twelve exported PDFs were parsed, dimension-checked, rendered and visually inspected.
- Static checks passed for 4,058 in-page anchors, 4,243 associated labels and sampled text/button contrast across six palettes.
- Six original SVG illustration assets were rendered and inspected. These are illustration assets, not browser screenshots.

**Remaining verification:** actual Chromium/mobile rendering and audio playback, the complete existing Patro build, deployed Cloudflare redirects/headers, and real AdSense account/CMP integration. Chromium was unavailable here and its download could not be installed, so the included browser check has NOT passed. The DOM simulation is not a browser rendering test.

Ads are disabled by default. The consent-gated ad adapter is present, but your approved publisher ID, ad-slot ID, CMP integration and advertising CSP must be configured before serving ads. Indexing, rankings, approval and earnings are not guaranteed.

## Package layout

- `upload/public/advancetools/`: prebuilt files to copy into the repository.
- `src/`: editable browser modules and original calculation engines.
- `scripts/build.mjs`: regenerates all pages and content-hashed assets.
- `scripts/install.mjs`: guarded, idempotent local installation.
- `scripts/postbuild.mjs`: root discovery integration and final asset-budget check.
- `tests/`: numerical, conversion, generated-chord and integration tests.
- `integration/`: additive headers, typo redirects and optional advertising configuration.
- `licenses/`: third-party mapping licenses.
- `docs/qa/`: export examples, illustration asset previews, transfer estimates and verification reports.
- `scripts/package.py`: reconstructs the manual-upload source tree and complete ZIP (Python standard library only).
- `docs/`: implementation, methods, SEO, monetization and acceptance instructions.

## Loading and Worker behavior

There is no tool API, Worker function, database, timer job or server-side calculation. Every generated page is a real static HTML asset. The hub and category pages load only the small interface/search entry module; they do not import calculation engines. Opening a tool page dynamically imports only its family engine. Font pages import one selected converter and its mapping, not all six mappings. Shared number validation is a separate tiny module.

PDF code is imported only after a PDF download click. SVG downloads reuse the paper engine. Synthesized chord audio starts only after a user clicks Hear voicing, using the browser AudioContext. No external font, audio or mapping download is required. Ad code remains unloaded while advertising is disabled.

