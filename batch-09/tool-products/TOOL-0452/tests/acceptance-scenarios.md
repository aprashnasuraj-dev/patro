# TOOL-0452 — deferred acceptance tests (NOT EXECUTED)

## Known answer
- Verify Available chlorine mass needed = 100.00 g using sample fixture.
- Check all secondary results against independent hand calculation, exact units, rounding rules, edge values and zero cases.
- Check positive-only and bounded numeric fields, NaN, Infinity, 1e309, invalid dates, malformed negative values and unsupported choices.
- Verify protected conditions fail with explicit errors rather than invented numerical output.

## Browser and accessibility
- 320px, 375px, 768px, 1280px, desktop zoom 200%, narrow landscape, large system fonts; no clipped controls or horizontal viewport overflow.
- Tab / Shift+Tab, Enter, focus outlines, semantic unique H1, associated form labels, screen-reader results and alert errors.
- Light/dark modes, Windows high contrast, prefers-reduced-motion, keyboard-only copy/download and clipboard-denied fallback.
- Ensure repeated submissions never attach duplicate listeners; SVG preview revokes old object URLs; reduced-motion support; no inline HTML injection.
- Copy includes visible results and limitations; JSON export includes inputs, outputs, steps, notes and safe generated filename.
- Assert client-side execution only; route-level module loading; no network requests or user-content uploads.

## Domain-specific adversarial cases
- Does not account for chlorination chemistry demand, unstabilized vs stabilized concentration dynamics, actual product-specific treatment directions or shock/dosing safety.
- Confirm no legal, medical or safety certification is implied by visually formatted results.
- Source URL effective date, restrictions and current vendor/source guidance must be rechecked before publication.

Status: TEST_PENDING. Test files prepared; build, lint, TypeScript, unit, E2E, security, accessibility, visual and benchmark suites NOT RUN.
