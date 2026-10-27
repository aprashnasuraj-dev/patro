# TOOL-0470 — deferred product QA (NOT EXECUTED)

1. Known answer: `Total credits = 2.00` using provided sample; verify all secondary outputs against independent authoritative cases.
2. Boundary cases: finite numeric bounds; missing/empty/NaN/Infinity; dates and leap days; typed import lists; line length, caps, duplicates, overflows, negative input and unsupported jurisdictions.
3. Security: escape text, unsafe filenames, parser abuse, malicious strings, zip/PDF/image bombs where relevant; enforce memory and file-size budgets; ensure zero network transmissions.
4. UX: semantic unique H1 and labels, role=status / role=alert, keyboard only, 320px–desktop layouts, 200% text zoom, high contrast, reduced motion, dark theme, denied clipboard and downloads.
5. Data products: inspect print dimensions, generated invoice HTML, PNG/JPEG and PDF export previews (where relevant); color profiles, label barcode clarity and locale formatting.
6. Research: Unofficial transcript planning only; records are not signed or independently verified.
7. Integration: confirm Vite or equivalent compiles TS in HTML modules, code splits heavy pdf-lib; verify route lazy import and shared styles.

**TEST_PENDING**. No build/typecheck/unit/browser/a11y/performance/security/responsive test run in source preparation.
