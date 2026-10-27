# TOOL-0485 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- 18:00 serving, 8h cook, 60min rest, 90min contingency and 45min prep: preparation starts 06:45 local time.
- USDA minimum internal temperature is 145°F plus three-minute rest for whole pork/beef cuts, 160°F for ground meat and 165°F for poultry.
- Cooking duration is user-estimated, not a physical model; actual doneness requires calibrated probe temperature, resting and safe holding. Food should not be kept unsafely in temperature danger zones.

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
