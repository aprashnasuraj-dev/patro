# Mobile 90+ and international SEO verification — 2026-10-08

## Baseline and target

Source: [Release Gate #379](https://github.com/aprashnasuraj-dev/patro/actions/runs/37780198741), commit `2874b22725b2a2868c6fd181802e6bd47fb35462`. GitHub CI Lighthouse ran once per route with a local production build:

| Route | Lighthouse performance | Goal |
|---|---:|---:|
| `/` | **43/100** | **≥90 on mobile, repeat runs** |
| `/tools` | 57/100 | ≥90 after homepage |
| `/fm` | 39/100 | ≥90 after homepage |

Accessibility, SEO, and best-practices gates were green in #379; Lighthouse **performance** used a 75/100 warning threshold. None of these are measurements of Google's field Core Web Vitals.

## What this PR changes safely

- Split non-home route feature suites from the initial JS with `React.lazy`; the home calendar stays eager so first paint keeps the date, tithi and current month.
- Lazy-load the below-calendar quick-note/voice editor when approaching viewport or at idle. Actual note storage, microphone handlers, speech fallback, authentication and existing note controls remain in the original component; no capabilities deleted.
- Include a regression test protecting route identities, lazy boundaries, and the complete original note editor.
- Add 13 international public samples and the growth sitemap to the read-only existing HTTP SEO audit. It checks status, rendered HTML title and H1, canonicals, noindex headers, crawler parity and sitemap XML. **It does not check Search Console indexing.**
- No Worker, Cloudflare resource binding, R2 data, KV/D1 or cron updates. Existing immutable URL baseline must still pass.

## How to measure the 90+ target

1. Run the full build, typecheck, homepage functional/browser suite, and `npm run seo:audit` on the exact PR build. Require three consistent runs on a mobile configuration when diagnosing regressions; the existing release job currently uses only one run.
2. Compare the **same** mobile device class/viewport/throttling in the before/after Lighthouse JSON. Record LCP image/text node, JS execution and main-thread time, TBT, CLS, initial JS transfer, and render-blocking requests, not just the overall score.
3. Treat any drop in calendar first-paint, keyboard navigation, quick note voice/mic, route switching, accessibility, offline PWA, or authenticated data safety as a regression and revert or repair the offending lazy boundary.
4. Iterate on measured largest contributors (render-blocking external fonts, CSS, unnecessary eager hydration, below-fold widgets), avoiding fake placeholder content, deferred primary date, or reduced functionality.
5. Mark 90+ **achieved** only after mobile Lighthouse output actually reports it. Production CrUX/field p75 for LCP/INP/CLS should be checked separately once enough real-user data exist.

## Published international URLs vs Google indexed URLs

The production build reports **23,246 indexable URLs = 22,902 protected original + 344 new**. The 337-page growth family is part of the new URLs. These are published/crawl-intended, not evidence of Google index inclusion.

- Sitemap index: https://aafnaipatro.com/sitemap.xml
- New static growth sitemap: https://aafnaipatro.com/sitemap-growth.xml
- Sample: https://aafnaipatro.com/moon/london
- Sample: https://aafnaipatro.com/moon/new-york
- Sample: https://aafnaipatro.com/moon/kathmandu
- Sample: https://aafnaipatro.com/eclipse/2027-08-02
- Sample: https://aafnaipatro.com/de/mond
- Sample: https://aafnaipatro.com/fr/lune
- Sample: https://aafnaipatro.com/es/luna
- Sample: https://aafnaipatro.com/it/luna
- Sample: https://aafnaipatro.com/nepal/time
- Sample: https://aafnaipatro.com/nepal/trek-weather/everest-base-camp
- Sample: https://aafnaipatro.com/us/diwali-2026
- Sample: https://aafnaipatro.com/weather/charikot

### Official Google Search Console verification (requires owner access)

1. Log into the **Google-owned** product https://search.google.com/search-console and select the verified `https://aafnaipatro.com/` URL-prefix or domain property. An unrelated third-party GSC app is **not** an official Google connection.
2. In **Sitemaps**, submit/check `https://aafnaipatro.com/sitemap.xml` and `https://aafnaipatro.com/sitemap-growth.xml`. Record submission status and Google's *last read*, *discovered URLs* if provided, and parse errors.
3. In **URL Inspection**, inspect every representative URL above. Record `URL is on Google?`, `Crawled - currently not indexed?`, `Discovered - currently not indexed?`, last crawl, user-declared canonical vs Google-selected canonical, crawl allowed, and indexing allowed. Use **Test live URL** separately to identify current fetch/canonical issues.
4. In **Indexing → Pages**, filter and compare patterns (`/moon/`, `/eclipse/`, `/nepal/`, language prefixes, `/us/`, `/weather/`). Compare indexed/known pages over time rather than equating sitemap size to inclusion.
5. For Google Search performance, track page/query/country impressions and clicks from **Performance → Search results**, especially US/UK/DE/FR/ES/IT.
6. Authenticated GSC inspection is **not available** through the current GitHub-only connection. Leave all indexing counts and Google-selected canonicals unverified until official account results are available. Do not fabricate them.

CLI audit: `npm run seo:growth-audit -- https://aafnaipatro.com` outputs `reports/growth-http-audit.json` and may fail with local network policy 403; distinguish that from site-origin 403.

## Reference target

Google Core Web Vitals guidance: p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. These field measures and a 90+ Lighthouse lab score are distinct.
