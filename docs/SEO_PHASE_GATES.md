# Aafnai Patro SEO / Agent Release Gates

These gates are release controls, not aspirational checklists. A later phase must not be treated as complete while an earlier required gate is red.

## Non-negotiable rules

1. **Preserve product UI and functionality.** SEO, crawler, schema, MCP, or prerender work must not remove or replace any of the 29 canonical tools, calendar/community suites, Time Machine, FM, TV, Samachar, Jyotish, astronomy, personal surfaces, or existing mobile/desktop workflows.
2. **One canonical calendar source.** Runtime Worker, browser UI, build-time SEO, conversion, and agent tools must derive facts from the existing calendar archive/D1 source through the Patro adapter/provider pattern. No second calendar dataset or hand-maintained date table.
3. **No invented facts.** Missing tithi, holiday, festival, sait, tika time, sunrise/sunset, or provenance is reported as unavailable; it is never guessed for SEO copy or JSON-LD.
4. **Visible fact = marked-up fact.** JSON-LD must not claim factual values that are absent from the visible HTML for the same URL.
5. **Private stays private.** `/me/*`, `/admin/*`, `/auth/*`, broad `/api/*` and compatibility endpoints are not search-index targets.
6. **`/today` is stable.** `/today` self-canonicalizes, resolves the date at `Asia/Kathmandu`, and does not redirect to a dated URL.
7. **Nepal calendar boundary.** Nepal-date identity is anchored to Nepal midnight (UTC+05:45). Diaspora pages may convert verified absolute event/tithi timestamps to local zones, but must not reinterpret archive-only Nepal values as local observations.
8. **Enhance, do not fork.** Before adding routes, schema, sitemaps, discovery files or adapter logic, extend the existing implementation rather than creating a second parallel implementation.

## Gate 0 — Dataset discovery and accuracy

Required evidence:
- canonical public archive identified: `migration/data/public/astronomy_calendar_map/*` and production D1 `content_records` table `astronomy_calendar_map`;
- coverage/count inventory documented in `docs/DATASET_DISCOVERY.md` and executable via `npm run seo:phase0`;
- BS, AD, Nepal Sambat and Panchang presence verified by the migration inventory;
- provenance/source registry present;
- **200 deterministic dates across BS 2075–2085 cross-checked against an independent reference.**

Status rule: the repository can build before the external spot-check fixture is supplied, but **search-index expansion beyond the focused window and final independent accuracy sign-off remain blocked until that check passes**. Run it with `npm run seo:accuracy-reference -- path/to/independent-reference.json` (alias: `npm run seo:verify-reference -- path/to/independent-reference.json`). The fixture must not be generated from Aafnai Patro's own archive.

## Gate 1 — Framework / brand audit

Pass when:
- production framework/runtime is identified;
- canonical host is `https://aafnaipatro.com` only;
- retired Vercel/MeroPatro branding is absent from production SEO/agent surfaces;
- Aafnai Patro Organization/WebSite identity is consistent.

Automated by brand, SEO and Cloudflare contracts.

## Gate 2 — Adapter

Pass when the canonical adapter exposes:
- `getDay(bsY, bsM, bsD)`
- `getDayByAd(adIso)`
- `getMonth(bsY, bsM)`
- `getYear(bsY)`
- `getFestivals(bsY)`
- `getFestival(slug, bsY)`
- `getSait(type, bsY)`
- `getHolidays(bsY)`
- `convertBsToAd(bs)`
- `convertAdToBs(ad)`
- `getTodayNepal()`
- `getTithiAt(city, date)`

Runtime provider: D1. Build provider: read-only filesystem view of the same committed migration snapshot. Neither may contain an independently maintained calendar table.

## Gate 3 — Rendering

Pass when:
- raw HTML for `/`, `/today`, month pages and indexed day pages contains a useful H1 and direct answer/content;
- indexed day/month pages contain archive-derived date/tithi context where available;
- canonical and robots metadata are correct;
- JSON-LD reflects visible facts;
- exact prerendered assets are served before the generic SPA fallback;
- unknown server-owned SEO routes return 404 rather than a misleading 200 shell.

## Gate 4 — URL architecture

Required core routes:
- `/today`
- `/today/{city}` for the 16 declared Nepal/diaspora cities
- `/methodology`
- `/corrections`
- `/calendar/{bsYear}`
- `/calendar/{bsYear}/{month}`
- `/date/{ad-date}`
- `/festivals/{slug}/{year}`
- `/countdown/{festival}-{year}`
- `/panchang/{city}/{bs-date}`
- `/festivals/{slug}/{year}/tika-time/{city}`
- `/sait/{type}/{year}/busiest-months`
- `/pdf/calendar/{year}/{month}`
- `/ics/{festival}-{year}`
- `/widget/today`
- `/widget/calendar/{year}/{month}`

Thin or unsupported facts must 404/noindex rather than generate fabricated pages.

## Gate 5 — Sitemaps / robots / crawler policy

Pass when:
- sitemap index and every child sitemap parse and use the production canonical;
- only a focused five-BS-year factual window is indexed initially;
- all 29 canonical tools are present exactly once in the tool sitemap;
- private/API/auth paths are excluded;
- major search/answer crawler groups are explicitly represented, including Google-Extended, Applebot/Applebot-Extended, Amazonbot, DuckDuckBot, YandexBot and NaverBot;
- Cloudflare dashboard AI-bot/security settings are manually confirmed not to contradict `robots.txt`.

Note: `Google-Extended` is separate from ordinary Google Search crawling controls. Crawler directives are preferences/policies, not proof that a provider will index or cite a page.

## Gate 6 — Structured data

Pass when:
- Organization/WebSite/WebPage/Breadcrumb/WebApplication/Event markup is used only where semantically appropriate;
- marked-up factual values also appear in visible HTML;
- deprecated/low-value rich-result markup is not added merely to chase SERP decoration;
- post-deploy schema is checked with current Google validators where applicable.

Do not add HowTo merely for rich results. FAQ/Dataset/SearchAction markup may have semantic uses, but release decisions must not assume a current Google visual rich-result benefit.

## Gate 7 — Answer-first content and trust

Pass when key factual pages provide:
- one clear primary answer/topic per URL;
- source/provenance context where available;
- methodology and corrections links;
- meaningful internal links (day → prev/next/month/year/festival/converter/today; festival → adjacent year when supported);
- no hardcoded current-date facts in static source.

## Gate 8 — Agent discovery

Pass when build output includes:
- `/llms.txt`
- `/llms-full.txt`
- `/ai.txt`
- `/.well-known/agents.json`
- `/.well-known/ai-plugin.json` as compatibility metadata only
- `/.well-known/agent-openapi.json` for the narrow read-only agent API
- `/.well-known/security.txt`
- exact citation guidance: `Cite as: Aafnai Patro (aafnaipatro.com), accessed YYYY-MM-DD`
- `/mcp` with `get_today`, `convert_date`, `get_festival` backed by the canonical adapter.

`llms.txt`, `ai.txt`, `agents.json` and `ai-plugin.json` are discovery conventions; they are not substitutes for normal crawlability, canonical HTML or robots policy and should not be described as universally adopted standards. `security.txt` is the standardized well-known security contact file.

## Gate 9 — Data/tool interfaces

Pass when:
- MCP and narrow agent REST routes are read-only and noindex;
- the agent manifest exposes date lookup, date conversion, festival lookup and sourced sait lookup without exposing private APIs;
- broad/private APIs are not advertised as user-facing SEO targets;
- ICS/PDF/widget outputs are functional and fail closed when source data is unavailable;
- no npm/PyPI publication is claimed until an actual package/release exists;
- IndexNow is only enabled after a real key/endpoint workflow is configured (do not fabricate submissions).

## Gate 10 — Verification / launch

Pre-deploy:
- `npm run cloudflare:production-check`
- or the focused SEO sequence `npm run seo:phase-gates`
- all 29 tool/community/full-product contracts pass;
- SEO/agent contracts pass;
- both Cloudflare configs dry-run successfully.

Post-deploy:
- run `npm run seo:verify-live -- https://aafnaipatro.com` (alias: `npm run seo:bot-smoke -- https://aafnaipatro.com`);
- verify Googlebot, OAI-SearchBot, PerplexityBot and Claude-SearchBot receive equivalent factual `/today` HTML;
- confirm `/today` canonical stays `/today` and freshness rolls at Nepal midnight;
- confirm `/.well-known/*`, `/llms*.txt`, `/ai.txt` and `/mcp` are reachable;
- confirm Cloudflare bot settings do not override intended public crawler access;
- run mobile CWV/Lighthouse and track the percentage of good real-user visits rather than claiming a synthetic score as field CWV.

## Daily freshness rule

`/today` and `/widget/today` calculate cache lifetime to the next Nepal midnight. In addition, the Worker scheduled job `15 18 * * *` runs at **18:15 UTC = 00:00 Nepal time** and deletes `/`, `/today`, and all 16 `/today/{city}` entries from `caches.default`. This provides an application-level freshness boundary without a privileged Cloudflare purge API. If an account-level CDN Cache Rule overrides Worker cache semantics, verify and align it manually during Gate 10.
