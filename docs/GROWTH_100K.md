# Aafnai Patro: 100,000 daily human visitors

## Target and evidence

The owner reports approximately 2,500 visitors and requests at least 100,000. This plan assumes both figures mean daily human visitors in Asia/Kathmandu: a 40× increase, or 97,500 additional visitors/day. Confirm the baseline period before treating that calculation as measured growth. No analytics/Search Console export was available during implementation. Public HTTP pages and repository source cannot establish search impressions, index coverage, retention, or traffic sources.

The repository already produces more than 22,000 factual indexable URLs, 29 canonical public tools, festival pages and sourced history records. Sitemap size and query-alias count are implementation inventory, not evidence of search demand or indexed pages. Google indexing and ranking remain external outcomes. More technically correct pages can still receive zero traffic when demand, differentiation or links are weak.

## Published URL preservation

A live snapshot of all 100 sitemap segments captured 22,902 public URLs. `seo/published-url-baseline.json` records that exact set; it is a sitemap inventory, not a claim that Google has indexed every URL. The build compares every path against both generated source sitemaps and the final dist artifact and fails if even one baseline URL is absent. A same-count replacement also fails. Existing calendar/history/festival/community/tool route identities and dataset records are retained; only six new guide URLs are added in this release.

Never shrink this baseline to bypass a release failure. The existing rolling calendar-year window could otherwise drop an old discovery cohort in a future year; the guard makes that loss explicit. Any future migration must preserve the old public destinations and their indexing policy, or obtain explicit owner direction. Forty thousand extra pages do not guarantee 100,000 visitors and are not generated here.

## What this release implements

- Route metadata updates on SPA navigation, reusing the Worker metadata resolver and replacing AppChrome’s conflicting legacy updater. Initial server metadata and factual schema are preserved; stale schema is removed when changing routes. Canonicals are deduplicated, preview/private routes retain noindex, and share previews use raster images.
- Five original, full-text Nepali practical guides and a guide hub. Both static HTML and the SPA show the same instructions. Guides link to real conversion, typing, Preeti, age and voice tools; they are included in a dedicated sitemap.
- Public-page native sharing/copy with campaign tags. Birth details, notes, query strings and other user input are excluded from generated share URLs.
- Up to six on-device saved utility shortcuts, useful cross-links and guide discovery. No new database calls, daily email subscriptions or forced notification prompts.
- A read-only HTTP audit covering browser/crawler status, canonical/title/H1 presence, sitemap MIME types and unknown-page status. It does not consume deployment builds.

## Acquisition model — assumptions, not a forecast

| Channel | Illustrative daily human visitors | Required evidence |
|---|---:|---|
| Organic search | 55,000 | At 5% click-through, approximately 1.1M search impressions/day; measure by query, route and country |
| Direct / returning | 25,000 | Approximately 125,000 retained users at 20% daily activity; requires consent-based cohort analytics |
| Shared links / referrals | 15,000 | At 1% productive sharing and 2 new visitors/share, approximately 750,000 eligible visits/day; this is unlikely to bootstrap itself |
| Embeds / partners | 5,000 | 100 relevant placements averaging 50 genuine visits/day; placements are not acquired by writing code |
| Total | 100,000 | Deduplicate users across channels; channel session totals are not unique daily visitors |

The sharing assumption deliberately exposes a bottleneck: with only 2,500 visits/day, that model generates about 50 referral arrivals/day. Sharing needs initial distribution or a much stronger rate to drive 40× growth. Do not report this table as a traffic promise.

## Work to run after release

| Stage | Action | Decision gate |
|---|---|---|
| Baseline, days 1–7 | Confirm daily human visitors vs Cloudflare requests/uniques. Export 90 days from Search Console and 28 days of landing-page/referrer data. Inspect representative tool/guide/calendar URLs. Submit the existing sitemap index once. | Find whether the bottleneck is discovery, indexing, ranking, click-through, usability or repeat use. |
| Search, weeks 2–4 | Prioritize tools and near-term festival pages with actual impressions. Improve examples, screenshots and source freshness on the 10 highest-opportunity pages. Check Google-selected canonicals and mobile Core Web Vitals. | Compare 28-day clicks and impressions, allowing for festival seasonality; do not expand low-demand pages solely to raise URL count. |
| Distribution, weeks 2–8 | Owner-approved outreach to schools, offices, Nepali diaspora communities and publishers for useful tool links or existing calendar widgets. Tag each campaign. Publish demonstrations on channels the owner controls. | Track engaged referral visitors and returning use per placement. No unsolicited outreach or fabricated backlinks is part of this release. |
| Retention, weeks 4–12 | Promote relevant existing PWA installation, reminders and saved tools after successful use. Investigate mobile error reports. | Measure 7-day/28-day repeat use with an appropriately disclosed stable identifier; the current daily-hash analytics cannot measure longitudinal cohorts. |
| Scale | Increase investment only in routes/channels with measured demand and successful use. | Progress gates: 5k → 10k → 25k → 50k → 100k daily humans; no date for 100k is promised without observed acquisition rates. |

Core Web Vitals targets: p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, measured in field data. A local Lighthouse score is diagnostic, not proof of field performance.

## Measurement and capacity limitations

Existing first-party analytics rotates its visitor hash daily and includes IP/user-agent in the hash. Multi-day distinct totals are visitor-days rather than true unique people; shared networks, changing IPs and blocked JavaScript can under/overcount. Cloudflare edge uniques can include bots. Neither number alone proves 100,000 human daily users.

At 100,000 visitors/day and an assumed 3 pageviews/visitor, the site serves about 300,000 HTML pageviews/day. At 10 minutes active per visitor, a one-minute analytics heartbeat can add roughly 1M beacon requests/day. The current backend writes presence on every beacon and pageviews on navigation: caching HTML does not eliminate those writes. Check Worker requests/CPU, D1 writes/reads, cache hit rate and analytics retention before scaling. No Cloudflare free-tier survival claim or capacity configuration change is made here; the earlier capacity optimization hold remains respected.

Alternative: paid acquisition can generate arrivals sooner, but at an illustrative NPR 5–20 per visitor, adding 97,500/day costs NPR 487,500–1,950,000/day. These are scenario inputs, not ad-price quotes. No campaign spending is authorized or implemented; organic utility demand, retention and earned distribution are the initial path.

Avoid bought links, fake traffic, keyword stuffing, copied news and automatically generated doorway pages. They do not establish durable demand and can damage search visibility.

## Verify

Run `npm run build`, `npm run test:growth`, the existing release checks and `npm run seo:growth-audit -- https://aafnaipatro.com`. Use Search Console URL Inspection for rendered content, indexing and canonical selection. Network 403 responses in the execution environment require independent validation; they do not by themselves prove Googlebot is blocked at Cloudflare.

Primary references: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics ; https://developers.google.com/search/docs/fundamentals/get-started-developers ; https://web.dev/articles/vitals .
