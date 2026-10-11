# Frontend design revision - complete package

All five collections and all 2,029 pages use the revised design. This is a full implementation package, including prebuilt HTML, original CSS/SVG, editable sources, numerical engines and installation files. Do not combine the previous ZIP's assets with the new HTML. Hashed asset directories ensure the existing Patro service worker does not serve the old design scripts under the new paths.

## Visual direction

An editorial creative workspace: warm neutral background, large serif headlines, illustrated studio panels, colour-coded collections, clear working surfaces and visible calculation methods. Workshop headlines switch to a precise sans-serif style on desktop. No stock photographs or externally fetched fonts are used.

| Collection | Identity | Workspace treatment |
|---|---|---|
| Knitting and crochet | Copper / apricot; illustrated yarn and needles | Measurement panel, large result number, calculation notes and working-sheet downloads |
| Chord library | Indigo / lilac; illustrated fretboard and waveform | Real generated voicing cards, prominent audio controls, fret/span settings and chord sheets |
| Workshop | Teal / steel; caliper and thread schematic | Explicit measurement fields, striped reference tables, precise estimates and method notes |
| Font converters | Plum / lavender; legacy-to-Unicode illustration | Numbered source/output editors, output tint, sample/import/copy/export and review warnings |
| Paper studio | Olive / pale lime; overlapping grid and dot sheets | Page settings beside a framed patterned canvas, physical spacing and PDF/SVG export |

The home page uses an evergreen palette with a large introduction, a five-collection card layout, illustrated collection cards and a compact navigation rail. Each tool page carries its collection's palette. Collection navigation remains available on smaller screens using horizontal scrolling. Desktop controls can remain beside the result while the user reads it.

## Interaction and accessibility

- A light/dark switch uses the device preference on first visit, then remembers the user's choice in `aafnai-tools-theme`. Storage failures do not block tools. No tool inputs or pasted text are stored.
- Hover/focus treatment, button feedback and a single brief illustration entrance provide motion. The interface disables motion and smooth scrolling when reduced motion is preferred; no perpetual animation or flashing effect is used.
- Labels are connected to fields, focus is visible, there is a skip link, and calculation values have an announcement region.
- Default reading and drawing surfaces stay legible in both appearances. Real chord diagrams and paper remain white to preserve notation/printing clarity.
- At narrower widths, controls and output stack. Decorative tool-page headers are hidden on phones so the actual tool is reached sooner. Collection illustrations remain visible.
- Native print styles remove navigation, decoration, settings and buttons. Downloads preserve the existing vector PDF geometry.

## Loading and performance

The illustrations are inline SVG generated at build time. They cause no image requests. Colour, surfaces, responsive layouts and motion are CSS. The complete stylesheet is 27,570 bytes before compression and is shared/cacheable across pages. The theme switch is part of the small interface entry; there is no animation framework, webfont request, background video or WebGL canvas.

Runtime calculations still load only after their corresponding tool page is opened. Category pages load no engines. Each converter loads exactly one mapping. The PDF writer loads only after a PDF-download click. The supplied Cloudflare asset-first exclusions and cache headers remain required: matching assets can avoid Worker execution, whereas unknown paths and other site routes can still use existing routing.

Representative first-page gzip estimates are approximately 17.2-19.2 KB for the home, knitting, chords, workshop, Kruti Dev, Zawgyi and graph-paper samples. These sum actual file compression sizes for the HTML, shared interface, stylesheet, disabled ad configuration and required engine dependencies. They exclude optional PDF modules, real ads/CMP, request headers, the parent site's service worker and other parent-site resources. They are estimates, not measured browser transfers. The larger uncompressed full-site output is about 55.9 MB because each static page contains its own content and SVG diagrams; visitors do not download that entire output.

See `docs/qa/design-report.json` for per-page estimates and sampled contrast ratios. The minimum sampled accent/button ratio is 4.98:1; those specific samples pass a 4.5:1 target. This is not a complete accessibility certification.

## Verification limits

104 engine/integration/loading tests and 23 DOM event-flow simulations passed. The simulations include appearance toggle state, preference restoration across pages, input validation, conversion and exports. All page links, IDs and form-label references were checked. Twelve PDFs were parsed and rendered. The six original vector assets were rendered and visually inspected using a SVG renderer.

**Browser layout, mobile touch use and real audio playback remain pending.** The managed browser-control capability is unavailable; earlier Chromium installation also failed. The included optional `scripts/browser-check.mjs` now checks light/dark persistence and records actual desktop/mobile screenshots when run in a suitable browser environment. Do not treat illustration renders as full-page screenshots or proof of mobile layout.

## Editable design files

- `src/style.css`: layout, collection palettes, light/dark colours, reduced motion and print styles.
- `src/design.mjs`: build-time original icons, vector scenes and collection navigation markup.
- `scripts/build.mjs`: page composition and collection/tool templates.
- `src/app.mjs`: appearance preference plus tool interaction and selective runtime imports.
- `scripts/design-check.mjs`: static structure, sample contrast and compression estimates.
- `scripts/design-assets.mjs`: optional illustration QA using Sharp (development only).

After edits, run the verification commands, rebuild and run `python3 scripts/package.py`. The upload directory is regenerated with the same current source. The new package contains the local-only installer and the manual integration patches; it has not been pushed or deployed.
