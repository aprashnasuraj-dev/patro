# Aafnai Patro — Growth distribution and indexing safety

Existing public URLs, tools, private data contracts, Cloudflare Worker bindings, and calendar archives are preserved.

## Distribution
- Existing tool pages now offer a native sharing action. It shares the canonical route only, not URL parameters, user-input text, or private saved notes.
- Other websites can voluntarily embed a static shortcut bar without API calls:
  `<script defer src="https://aafnaipatro.com/embed/aafnai-tool-links.js" data-lang="en"></script>`
- Use `data-lang="ne"` or omit it for Nepali labels. Do not pay for backlinks or insert hidden links.
- Track referral traffic in existing analytics; do not collect additional personal data in this release.

## Release verification
- `npm run build` includes the baseline and coverage gates, checking core tools and all 2,029 Advanced Tools HTML paths against their generated XML sitemap.
- `npm run test:growth-distribution` tests the widget and sharing component for network/tracking risks.
- `npm run seo:indexnow:check` verifies the existing key without rotating it or sending search-engine requests.
- For independent Worker/R2-backed sitemap families, audit the live index/child XML documents separately. A static build cannot prove all live R2 objects exist.
- Cross-check real Bingbot and Googlebot access in crawler logs. A Cloudflare Skip event alone does not prove the origin returned HTTP 200.

## Preservation and remaining QA
Check 33 total tools (including noncanonical suites), all community calendars, media, Time Machine, PWA install and saved notes. No storage keys or auth/data migrations were changed.
Current SEO release changes are additive: no private pages added to sitemaps, no blanket canonicalization, no new database, no extra Worker calls.
Validate the full build and mobile browser experience before treating production as verified. Monitor non-brand clicks, completed tool sessions and return visits over time. Rolling out editorial content and reminders is a separately reviewed product program, not a background job.
