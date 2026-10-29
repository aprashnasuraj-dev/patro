# Manual accessibility checklist — roadmap surfaces

Target: **WCAG 2.2 AA**. Automated axe/Lighthouse checks are necessary but not sufficient.

## Nepal Map

- [ ] Entire search/filter/list/route workflow is operable with keyboard only.
- [ ] Visible focus is never hidden by the map canvas or mobile sheet.
- [ ] Search results announce meaningful name + category + location.
- [ ] Map-only information has an equivalent synchronized list path.
- [ ] Marker/category meaning does not rely on color alone.
- [ ] Map zoom/pan controls have accessible names.
- [ ] “Near me” privacy disclosure is read before the browser location prompt.
- [ ] Route failure/fallback is announced without trapping focus.
- [ ] Reduced-motion preference avoids non-essential fly/transition effects.
- [ ] 200% and 400% zoom retain a usable task path.

## Bali Calendar

- [ ] Date navigation and Otonan forms have explicit labels and error text.
- [ ] Month grid has a logical reading order and each date link has useful accessible text.
- [ ] Source-status badges do not rely on color alone.
- [ ] Wewaran tables retain row/column meaning with a screen reader.
- [ ] Wuku visual ring has equivalent text/table content.
- [ ] Indonesian cultural terms remain intact and explanatory text is understandable without hover.
- [ ] Focus order follows the visual/document order.
- [ ] No motion is required to understand calendar state.

## Manual environments

Run at minimum:
1. Chromium + keyboard, 390×844 viewport.
2. Desktop Chromium at 200% zoom.
3. One screen reader/browser combination available to the reviewer.
4. Reduced-motion enabled.

Record failures and evidence in `docs/verification/RUN_LOG.md`; do not mark Phase 8 green until blocking failures are resolved.
