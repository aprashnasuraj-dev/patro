# MM530 all-tool PR QA contract

This single GitHub PR CI job examines all 530 TOOL IDs and never stops its inventory loop because one package fails. It uploads:
- reports/mm530-qa/all-tools.json: every ID, every check, untested and blocked stages
- reports/mm530-qa/failed-tools.json: broken tools for sequential repair
- reports/mm530-qa/repair-shortlist.md: sorted machine-derived shortlist

Checks include: catalog integrity, source and semantic HTML, bounded esbuild source bundling, per-package compatible Node unit tests, Chromium source-preview mobile rendering, exact existing Vite-tool/route/sitemap collisions, current live sitemap collision probe (clearly not authoritative for routes omitted from sitemaps), and bilingual regulatory notices.

Not all draft suites are necessarily runnable in the current runner. Vitest-specific suites without a compatible runner are NOT_RUN, not PASS. Source-page browser smoke is NOT functional calculation testing. Existing PatroRouter, Vite output chunks, Cloudflare Worker routing, canonical URL prerender, live data correctness, desktop/browser device matrix and final SEO remain BLOCKED or review-needed until actual integration. No draft URL is automatically published or indexed, and source ZIPs are not rewritten.

Tax, legal, customs, employment and similar tools are retained. They show bilingual estimation and changes-in-law notices in staged tool previews, with clear distinction from professional legal/tax advice. The released Vite adapter MUST reuse this same policy before any regulated tool goes live. Per tool, verify applicable jurisdiction, date, official citations and formulas; check TOOL-0527 formula licensing. A disclaimer does not make a bad calculation safe or correct.

Repair sequence: fix global runner/environment blockers first, then per-ID failures grouped by compile/unit/browser/URL collision. Add deterministic calculation and browser fixtures, connect approved lazy modules to existing Patro routing and Cloudflare asset generation, and re-run the whole 530-tool PR CI. No automatic merges, main commits, redirect or sitemap changes.
