# TOOL-0482 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- 250 ad spend, 1,000 attributed sales, 45% gross margin, 12% fees = 25% ACoS, 4× ROAS, 33% break-even ACoS before fixed costs.
- ACoS = ad spend / attributed sales; ROAS = sales / spend; break-even ACoS is net contribution margin.
- Attributed sales are not incremental sales. Product margin must exclude fees entered separately; otherwise costs are counted twice. No causal profit attribution.

## Deferred cases

1. Known-answer value and calculation derivation; comparison against approved reference where relevant.
2. Each numeric field: lower/upper boundary, overflow, huge exponent, NaN, infinity, blank, negative where inappropriate.
3. Each selector: unknown value; incompatible value combination; unsupported jurisdiction/material.
4. Text fields: angle brackets, markup-like strings, control characters, very long input, newline, unsafe filenames.
5. Copy/JSON export: exact values and no formula injection; clipboard denied and no third-party request.
6. Accessibility: keyboard through all controls, one H1, semantic labels, focus visibility, aria-live result.
7. Responsive: 320px, 375px, tablet and desktop, dark mode, reduced motion; horizontal overflow.
8. Integration: lazy route loads only this source; check no unapproved external script/content transmission.
9. If reference or external requirements have changed after 2026-10-26, verify/revise before publication.
