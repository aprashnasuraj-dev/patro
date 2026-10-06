# Aafnai Patro — Janma Patro / Guna Milan release report

Date: 2026-10-06

## Implemented

- Preserved `packages/engine/src` byte-for-byte from the supplied bundle; calculation defaults and renderers are unchanged.
- Reworked only the outer Janma Patro / Milan pages into an Aafnai Patro-style Nepali interface with Nepali/English switching.
- Added direct compatibility mounts for the existing site entry points:
  - `/jyotish/china` -> Janma Patro UI
  - `/jyotish/matchmaking` -> Guna Milan UI
- Kept canonical module URLs:
  - `/janmapatro/`
  - `/janmapatro/milan.html`
- Added client-side `Download PDF` and `Download JPEG` actions which export the already-rendered `.jp` report. The report itself is still produced only by `renderJanmaPatroHTML()`, `renderMilanHTML()` and `renderChartSVG()`.
- Retained browser-only calculations. Save still calls the store-only API (`compute:false`) only after the user explicitly chooses Save.
- R2 remains the only persistence binding. No D1 binding was added for this module.
- Kept `SSR = "off"`.
- Added delete control for saved Milan reports as well as Janma Patro.
- Added print A4 page sizing and kept header, hero, form, actions and footer hidden in print.

## Verification

- Engine source comparison against supplied ZIP: **no differences** in `packages/engine/src`.
- `npm test`: **20/20 passed** in the standalone validated bundle.
- Sample Janma Patro verified: Dhanu lagna, Kumbha rashi, Dhanishtha pada 4, namakshar `गे`, ishtakal 22 ghadi 0 pala, Adhika Bhadra, Bhadra karana, Mars dasha balance 0y 4m 16d.
- Birth-detail Milan: **28.5/36**.
- Name mode `राम × सीता`: **26/36**.
- 390 px layout: no horizontal overflow.
- Print verification: A4, with form/nav hidden.

## Integration branch

The module is integrated on `feature/janmapatro-gunamilan` before merge to production `main`.
