# TOOL-0488 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- 1.4 kg over 3 m × 20 m gives 2.33 kg per 100 m². Against a 3 kg target, the measured flow is about 22.2% below target.
- Calibrated material delivery uses measured mass divided by actually treated strip area, then scales linearly to desired surface area.
- Actual width needs overlap correction; walk/vehicle speed and gate characteristics are equipment-specific. Rate ratios are directional only; no universal dial number or seed viability inference.

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
