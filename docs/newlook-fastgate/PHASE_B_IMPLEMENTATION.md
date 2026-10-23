# Phase B implementation evidence — tasks 08–14
Branch-only implementation: `src/newlook-foundations.css` imported from `src/main.tsx` with **opt-in** `.nl-*` selectors. Existing screens remain visually unchanged until components adopt classes.
08 Semantic palette: paper/ink/blue/crimson, independent today/selected/holiday/observance/Saturday/focus/info/success/warning roles. Exact flag-red is not used as ordinary text because contrast must be tested; accessible contrast verification pending.
09 Dark: dedicated backgrounds, raised surfaces, ink, muted, borders, semantic accent roles and shadow. Existing AppChrome sets both data-theme and data-mode.
10 Seasonal accent: **not implemented**. Must resolve only from verified existing festival dataset, never from inferred dates.
11 Typography: five responsive roles, Devanagari fallback stack and line height 1.4–1.7. No font asset distributed or remote font loaded.
12 Spacing: 4/8/12/16/24/32/48 tokens, 1240px container, 12/4-column grid, cards and 44px controls.
13 Icons: shared `.nl-icon` SVG class and Lucide already installed in application. Legacy glyphs remain; replacement not completed.
14 Motion: 140/220ms tokens, focus-visible, reduced motion overrides, disabled active transform.
## Outstanding acceptance
- Verify computed AA contrast in both themes for normal/large text, selected, holiday, focus and muted.
- Adopt tokens into real homepage and shell; test both languages/dark/mobile; replace legacy Unicode glyphs.
- Implement seasonal resolver with unit tests against festival source.
- Run TypeScript, build and browser/accessibility regression; no such pass is claimed yet.
