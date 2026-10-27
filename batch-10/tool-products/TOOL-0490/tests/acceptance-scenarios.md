# TOOL-0490 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- A measured 8×4×4 ft well-stowed stack is exactly one cord; at $350, 20 million BTU/cord and 70% efficiency, cost is $25 per useful million BTU.
- NIST/NCWM describes a cord as 128 cubic feet of ranked and well-stowed firewood.
- 128 ft³ cord measures well-stowed stacked wood including air spaces, not solid wood. Species, seasoning/moisture and appliance performance drive BTU figures; values are user-supplied, not authoritative fuel certification.

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
