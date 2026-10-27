# TOOL-0489 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- For 2,000 ft², 0.75 net inches, 80% efficiency, 8 gal/min over four equal zones, runtime is approximately 36.5 minutes per zone.
- One inch of water over one square foot is 0.6233 US gallons; applied gallons = net irrigation depth × area × 0.6233 / efficiency.
- This is an equal-size zone estimate: actual run times should use catch-can precipitation-rate measurements, local evapotranspiration, soil infiltration and watering restrictions. Water balance cannot be fixed by runtime alone.

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
