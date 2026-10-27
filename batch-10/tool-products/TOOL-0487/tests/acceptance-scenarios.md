# TOOL-0487 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- Two 8×4×1 ft raised beds need 64 ft³ before allowance; at 35% compost, ~22.4 ft³ compost before settling.
- UMN Extension suggests roughly 1/3–1/2 plant-based compost and 1/2–2/3 topsoil for raised beds.
- Volumes assume fully rectangular uniform depth, settled geometry and user-entered compost ratio; monitor soil tests, phosphorus and salts. Bulk yards and bags vary by compaction/settling.

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
