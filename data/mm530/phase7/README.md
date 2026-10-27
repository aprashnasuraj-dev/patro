# Phase 7 — routes and dashboard

Canonical ownership remains sourced from the frozen 530-tool inventory. Individual tool routes are not renamed: routes such as `/generators/<slug>`, `/calculators/<slug>`, and the other frozen category prefixes remain the canonical leaf URLs.

Discovery is integrated into the existing Aafnai advanced-tools product instead of a new `/toolbox` surface:

- master dashboard: `/advancetools/`
- 530-tool discovery hub: `/advancetools/web-tools/`
- category discovery: `/advancetools/web-tools/<category>/`

The existing knitting/crochet, chord-library, workshop-reference, font-converter, and printable-paper collections remain intact. Existing Patro/Nepali routes under `/tools` remain a separate product surface. Dashboard/category pages are discovery pages only and never claim individual-tool canonical ownership.
