# TOOL-0486 — Deferred product acceptance

**Never run during source preparation. Runtime status: TEST_PENDING.**

## Domain expected behavior

- A Spain applicant alone with €4,200 monthly abroad-sourced income and 12 months work relationship passes the listed income and prior-relationship checks, not visa eligibility.
- Spain telework income for single applicant is €2,442/month in consular 2026 guidance; Estonia official schedule lists €3,960/month; Portugal requires a user-verified current income threshold.
- Screen excludes nationality, criminal record, documentation, taxes, dependents rule nuances, local work permission, consulate-specific consular jurisdiction, appointment availability and currency sourcing; thresholds can change. Portugal income minimum must be independently verified.

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
