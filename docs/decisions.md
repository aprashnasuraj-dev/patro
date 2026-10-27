# Client Tools 350 — Decisions

## Scope and branch strategy
- Base: existing 300-tool client-side suite on `feat/client-seo-tools-300`.
- Integration branch: `feat/client-tools-350`.
- Category branches are cut from integration: image, finance, dev.
- Category branches are implementation branches only. The integration branch is the single release PR target.
- Target: exactly 50 net-new canonical pages: 10 image, 20 finance, 20 dev. Combined suite target: 350.

## Duplicate and merge decisions
The repository already contains a 530-tool master catalog plus the 300-tool client catalog. We do not create a second canonical URL for the same primary intent.

### Image
- “HEIC to JPG with location data stripped” merges into existing TOOL-0122 HEIC→JPG behavior; metadata is not preserved by default. Replacement: HEIC to PNG.
- “Batch HEIC to ZIP” overlaps TOOL-0122 HEIC to JPG Batch Converter. Replacement: AVIF to PNG.

### Finance
- Coast FIRE duplicates TOOL-0224. Replacement: Barista FIRE.
- Freelancer quarterly estimated tax + self-employment tax are merged into one Freelancer Quarterly Tax page with separate SE-tax and safe-harbor sections. Replacement slot: 1099 vs W-2 Take-Home Pay.
- Debt snowball vs avalanche duplicates TOOL-0222. Replacement: Mortgage Points Break-Even.
- Rental cash-on-cash/cap rate overlaps TOOL-0272/TOOL-0273. Replacement: House Hacking Rent Offset.
- RSU withholding gap duplicates TOOL-0498. Replacement: RSU Sell-to-Cover.

### Dev
- Cron to GitHub Actions/Kubernetes overlaps TOOL-0011. Export snippets move into the new Cron Expression Explainer.
- .env to Docker/Kubernetes secret overlaps TOOL-0009. Replacement: .env Quote and Escape Validator.
- JSON to TypeScript with Zod overlaps TOOL-0002. Replacement: JSON Patch RFC 6902 Generator.
- Semantic JSON diff duplicates TOOL-0020. Replacement: JSON Pointer RFC 6901 Tester.
- YAML to JSON with anchors overlaps the 300-suite YAML anchor expander. Replacement: Snowflake ID Decoder.
- CSP generator/evaluator overlaps TOOL-0044. Replacement: CalVer Version Parser and Comparator.
- robots.txt tester duplicates TOOL-0072. Replacement: SPKI Certificate Fingerprint Generator.
- UUIDv7 generator/decoder duplicates TOOL-0336. Replacement: GitHub Actions Permissions Checker.
- Semver range calculator duplicates TOOL-0040. Replacement: Kubernetes Requests/Limits Ratio Calculator.
- CSR/SSL certificate decoder duplicates `/tools/csr-and-certificate-decoder`. Replacement: URLPattern Tester.
- CORS Preflight Simulator fills the final dev replacement slot after consolidation.

## Architecture
- Reuse the repo's static client-tool generator and lazy engine loader; do not introduce a second framework.
- Every new page is a static asset. Normal input processing must not invoke Worker/API routes.
- HEIC and other heavy file parsing runs in Web Workers and lazy-loads only when invoked.
- Small, non-sensitive result state may be encoded in URL parameters. Files, secrets, PEM bodies, prompts and large JSON are never put into URLs.
- No user input is sent to analytics or logs.

## SEO
- Canonicals use only `/converter/`, `/calculator/`, or `/tools/`; lowercase, hyphenated, no trailing slash.
- One primary keyword per URL; three related-tool links.
- Visible FAQs remain on every page.
- FAQPage JSON-LD is intentionally omitted: Google deprecated FAQ rich results in 2026 and the repository sanitizer rejects deprecated FAQ/HowTo markup. Keep SoftwareApplication + BreadcrumbList JSON-LD.
- Build gates enforce title <60 chars and meta description <155 chars.

## Finance data
- Tax year: 2026; values live in a versioned config, not calculator code.
- Standard deduction: single/MFS $16,100; MFJ $32,200; HOH $24,150.
- Self-employment tax: 92.35% net-earnings factor, 12.4% Social Security + 2.9% Medicare, $184,500 2026 Social Security wage base; Additional Medicare handled separately when applicable.
- Estimated-tax logic follows IRS Publication 505: 90% current-year / 100% prior-year general safe harbor, with 110% prior-year threshold for higher-income taxpayers.
- AMT values use IRS Rev. Proc. 2025-32 / IRB 2025-45.
- PMI estimates use the federal 80% borrower-request and 78% automatic-termination concepts for covered conventional loans; FHA/VA/investor rules are explicitly outside the generic calculator.
- RMD logic separates owner RMDs from inherited-account rules and uses IRS tables in config.
- Every finance page shows: “Estimate only — not financial, tax, legal, investment or lending advice.”

## Performance/accessibility
- Mobile-first, 360px minimum.
- Heavy decode/parse in workers; lazy-loaded category code.
- Every field has a visible label and keyboard focus state.
- Lighthouse release target: 95+ performance, accessibility and SEO on representative pages.
