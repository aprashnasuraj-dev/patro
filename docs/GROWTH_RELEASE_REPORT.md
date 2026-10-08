# SEO and growth release — 8 October 2026

Target: at least 100,000 daily human visitors. The reported 2,500 baseline has not been independently verified. No traffic increase or ranking outcome is claimed by this code release.

## URL protection

Captured all 100 child sitemaps from the live production sitemap index: **22,902 public paths**. Compared every path to generated source sitemaps and final build sitemaps: **22,902 retained, six added, zero removed**. The baseline and a release-blocking comparison are committed. No calendar, history, festival, community or tool dataset records were removed. Existing page content is retained; improvements update metadata and add navigation. The six additions are five practical guides plus their hub. Forty thousand speculative pages are not generated and would not guarantee 100,000 visitors.

## Changes

- Replaced AppChrome’s conflicting legacy metadata updater with one shared resolver. Preserved initial prerender metadata/schema, corrected navigation metadata, kept private/preview pages noindex, and removed stale schema when navigating.
- Added crawlable full-text guides, a dedicated sitemap, links from the footer and tool guidance, safe public-link sharing with campaign tags, and up to six local saved shortcuts.
- Added a read-only browser/crawler HTTP audit, URL preservation checks and mobile browser regression checks to the existing release process.
- Documented acquisition assumptions, owner-side Search Console work, measurement limitations and capacity implications in `GROWTH_100K.md`.

## Validation

| Check | Result |
|---|---|
| Production build, TypeScript, SEO/artifact checks | Passed |
| Cloudflare Worker dry run and migration snapshot checks | Passed |
| URL preservation, source and dist | 22,902 retained; six added; zero removed |
| Growth semantic tests | Six passed |
| Cloudflare/product contract suite | 122 passed |
| Full-product suite | 43 passed |
| Core / tool / community suites | 17 / 45 / 61 passed |
| Typing / release-safety and account suites | Five / 11 + five passed |
| Mobile browser | Guide navigation, one canonical, route titles, back navigation, saved shortcuts, native/copy sharing without private query inputs, private noindex boundary, and horizontal overflow checks passed |
| Pre-release HTTP sample | Existing sampled routes passed for browser, Googlebot and OAI-search user-agent requests; new guide endpoints were correctly absent before publication |

HTTP user-agent simulation does not prove actual Googlebot access or Google indexing. Field Core Web Vitals and Search Console coverage remain unmeasured. The browser checks test the built SPA; the Worker dry run validates packaging, not a live Cloudflare deployment.

Publish one source commit. Let the existing GitHub release workflow validate and deploy it; do not trigger repeated independent Cloudflare builds. Confirm new guide responses and sitemap preservation after deployment.
