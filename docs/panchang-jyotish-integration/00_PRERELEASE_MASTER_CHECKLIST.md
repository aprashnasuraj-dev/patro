# Panchang & Jyotish integration — pre-release master checklist

Status: planning gate, first commit on `feature/panchang-jyotish-fast-gate`. This document must be completed before a PR is opened, PR CI is expected, or any merge is considered. It is intentionally stricter than a normal feature checklist because the existing product and calendar archive must not regress.

## 0. Immutable constraints — stop-ship rules

- [ ] Work only on `feature/panchang-jyotish-fast-gate`; do not create a pull request in this phase.
- [ ] Do not dispatch, rerun, or otherwise trigger GitHub Actions/PR CI/Fast Gate/release workflows during preparation.
- [ ] Do not call any Cloudflare write/deploy operation. No Worker upload, route mutation, D1 write/migration, R2/KV upload, Pages deployment, cache purge, or cron change.
- [ ] Do not modify the production Cloudflare control plane or any environment/configuration binding.
- [ ] Do not modify `src/features/my-time/**`, `src/features/my-time/MyTimePage.tsx`, `src/features/my-time/PersonalAstrologyObservatory.tsx`, `src/features/my-time/my-time-personal-settings.ts`, `src/patro-tools/core/my-time-*.ts`, `worker/my-time/**`, `tests/my-time-*.test.ts`, or `src/jyotish/my-time-bridge.ts`. My Time is out of scope, not a target for refactoring, and must be verified byte-for-byte unchanged by the final diff.
- [ ] Do not change the existing JanmaPatro birth-profile storage shape, context key, or data hand-off. New features may read the existing public chart result/context through current integration points but may not add another birth profile or migration.
- [ ] Do not replace, rewrite, rename, or delete the existing BS/AD converter, Nepal Sambat engine, festival overrides, daily archive, Guna Milan, Rashifal, Moon, Eclipse, community-calendar, or media functionality.
- [ ] Do not use any user-visible phrase suggesting competitor cloning, source scraping, internal implementation details, or developer-only labels. Product copy must sound native to आफ्नै पात्रो/AafnaiPatro.
- [ ] Every new or changed frontend string must respect the single home-level language selection. No new language selector, separate language state, or separate persisted language preference may be added.
- [ ] All new calculators/finders and all calculations that can be carried out from already-loaded local input must execute in the browser. Do not add a Worker/API call for arithmetic, recurrence searches, planetary event scanning, scoring, ranking, or rendering.
- [ ] No existing URL is removed or silently repointed. A route already owned by another Worker remains owned by that Worker unless its owner-specific migration is fully designed and separately approved.
- [ ] The work is not ready for PR CI until every P0 gate is checked, every test is authored, source provenance is captured, and the branch diff is reviewed against the protected-path list.

## 1. Branch and no-deploy gate

- [ ] Branch base is the reviewed `main` commit captured in the branch metadata.
- [ ] Branch name is distinct from existing feature branches that have automatic import/deploy behavior.
- [ ] Verify that no new workflow is bound to a push event on this branch.
- [ ] Any future focused gate is PR-only and/or manual-dispatch-only; never auto-deploy on a feature-branch push.
- [ ] Future PR CI is test/build only. No Cloudflare deployment command is added to PR CI.
- [ ] Release/deploy remains a post-merge operation under the existing main-branch release gate; do not modify that workflow for this feature.
- [ ] Before opening a PR, inspect workflow run history and workflow changes; do not rely on assumptions about trigger filters.
- [ ] Keep a read-only activity log with branch head, file list and proof no Cloudflare write endpoint was called.
- [ ] No PR URL, workflow URL or deployed preview is claimed before one actually exists.

## 2. Repository inventory and protected baseline

- [ ] Re-fetch current main and verify that the feature branch is not behind before final review.
- [ ] Capture the base commit SHA; never use a floating main reference for review notes.
- [ ] Inventory the current route owners in `src/PatroRouter.tsx`, `worker/optimized-entry.ts`, `worker/connected-entry.ts`, `worker/connected-seo.ts`, and the `patro-day-atlas` worker.
- [ ] Inventory current static generators, sitemap builders, prerender builders and route-preservation tests before editing them.
- [ ] Inventory the existing feature surfaces in `src/AafnaiPages.tsx`, `src/HomePageCurrent.tsx`, `src/components/HomePanchang.tsx`, `src/components/FeatureHub.tsx`, `src/components/FeatureLauncher.tsx`, `src/patro-tools-integration/**`, `src/patro-tools/**`, and `src/jyotish/**`.
- [ ] Verify baseline protected routes: `/`, `/tools`, `/tools/astro`, `/date/*`, `/calendar/*`, `/rashifal`, `/janmapatro`, `/janmapatro/milan.html`, `/jyotish/china`, `/jyotish/matchmaking`, `/moon`, `/eclipse`, all community-calendar routes, and all 29 canonical tool routes.
- [ ] Preserve the current 29-tool canonical inventory invariant unless a deliberate single migration updates every inventory and related test in the same branch.
- [ ] Record the original sitemap/robots/canonical behaviour before changing SEO generation.

## 3. Scope inventory — all 91 features in five groups

The 91 features are coverage obligations, not a mandate to create 91 duplicate pages. Each feature must map to a canonical route, an owning implementation, a source/method statement, bilingual UI and tests. Existing working pages must be linked/reused rather than copied.

- [ ] Group A — Daily Panchang, elements and day windows: 26 feature rows.
- [ ] Group B — Muhurat and auspicious combinations: 14 feature rows.
- [ ] Group C — Jyotish calculators and birth-chart utilities: 19 feature rows.
- [ ] Group D — Planetary positions, events and astronomy: 20 feature rows.
- [ ] Group E — Nepal calendars, observances and regional calendars: 12 feature rows.
- [ ] Every row of the 91-row crosswalk has exactly one of: reuse-as-is, enhance-existing, browser-only new tool, static explainer, route redirect/alias, or intentionally deferred-with-reason.
- [ ] No row is marked complete because only a card/link exists; the underlying algorithm and expected output must be tested.
- [ ] Avoid feature duplication where an existing route already performs the job; especially Guna Milan, baby names, Sait, Tithi reminders, Moon/Eclipse, BS conversion and My Time (which must stay untouched).

## 4. Panchang engine contract and numerical correctness

- [ ] Define one versioned browser-facing DTO for: Gregorian ISO date, BS date, Nepal Sambat date/format, weekday, location, timezone, solar method, source, confidence, computation version, Tithi/Paksha, Nakshatra/Pada, Yoga, Karana, Sun/Moon Rashi, sunrise/sunset, moonrise/moonset, element start/end instants, lunar-month metadata, and ritual-window candidates.
- [ ] Keep UTC instants as the canonical stored/internal time representation; derive localized wall-clock display at the UI boundary.
- [ ] For dates covered by the existing validated D1 archive, archive transition instants win over recomputed fallbacks.
- [ ] Do not quietly override a published/verified date with a raw formula. Return candidate date, published/official date, provenance, and discrepancy separately.
- [ ] When the archive lacks an element/instant, fall back to the existing TypeScript `src/patro-tools/core/astro.ts` and shared names tables, not the independent Python v2 engine at runtime.
- [ ] The v2 package is reference/research material until its license, data source, algorithm assumptions, build footprint and numerical parity are resolved.
- [ ] Explicitly declare Lahiri/ayanamsha assumptions, sidereal vs tropical frame, geocentric vs topocentric position, evaluation instant (sunrise/noon/selected time), solar horizon/refraction policy and timezone.
- [ ] Validate circular angle wraparound at 0°/360° for Tithi, Nakshatra, Yoga, Karana, ingress, aspect and station searches.
- [ ] Validate both Pakshas, month-boundaries, Amanta/Purnimanta difference, Adhika/Kshaya Masa, Kshaya/Vriddhi Tithi, repeated sunrise Tithi, multi-day windows, DST dates outside Nepal, date rollover and polar/no-sunrise conditions.
- [ ] Never show a guessed sunrise, tithi end, eclipse visibility, published date or Muhurat as exact. Return unavailable/provisional plus method and reason if necessary.
- [ ] Every fallback displays that it is calculated, identifies place/timezone and never masquerades as an official published calendar value.
- [ ] Comparison fixtures use the same observer, timezone, civil date, ayanamsha, horizon/refraction policy and evaluation anchor before any numerical discrepancy is scored.
- [ ] Keep the 22 Oct 2026 reference comparison as a regression fixture with the displayed IST values converted to NPT—not as hard-coded correction factors.

## 5. Five-group route discovery and navigation

- [ ] Add five group hubs with polished AafnaiPatro visual language and semantic names: `/panchang`, `/muhurat`, `/jyotish`, `/planets`, and `/nepal-calendar`.
- [ ] All 91 feature entries are reachable from a group hub and from `/tools`; related features are also linked in their natural parent pages (Panchang, calendar/day, and existing tools).
- [ ] Homepage quick-access cards expose Panchang, tool directory and the five group hubs without removing existing links.
- [ ] Panchang homepage summary gets an attractive compact enhancement: clear BS-first today title, Tithi/Nakshatra/Yoga/Karana highlights where data exists, next transitions, sunrise/sunset, and “full Panchang” link.
- [ ] The homepage enhancement is compact, responsive and above/below existing content without replacing the calendar grid, festival highlights, My Time entry or community features.
- [ ] The homepage tools section exposes four/five group cards and selected quick tools, not an overwhelming list of 91 cards.
- [ ] Group pages provide search, categories, short descriptions, data-source/method note, and consistent breadcrumb/back links.
- [ ] Mobile navigation remains stable; every tool can be reached in two taps where possible; avoid introducing a new primary-nav item that pushes out current navigation.
- [ ] Keep `/astrology` existing canonical behaviour intact; do not create a conflicting canonical URL.
- [ ] Keep `/moon` and `/eclipse` under the existing Day Atlas route owner and link to them.
- [ ] Add sensible aliases only when they are deliberate, tested and canonicalized; never let unknown routes fall through to a generic calculator and look “working”.

## 6. Browser-only execution and lazy loading

- [ ] Arithmetic, conversions, dates, finders, local calculations, interval searches, name/rashi lookup, chart-derived calculations, ranking/scoring and printable/report generation run in browser code after the page loads.
- [ ] Each heavy tool is separately lazy-loaded with `React.lazy`/dynamic import; never add all algorithms to the homepage entry bundle.
- [ ] Tool landing pages and group hubs load their shell first; heavy ephemeris and chart UI loads only when that tool is opened.
- [ ] No fetch/API request is made for arithmetic, simple date math, recurrence search, chart scoring, or operations that use already-available local data.
- [ ] Use bundled/static source tables or existing prebuilt public static assets for read-only reference data; do not create a new endpoint just to serve a calculation result.
- [ ] If a feature necessarily reads the existing D1 archive, label it as an archive-backed existing route and cache at client/page level. Do not add per-field or per-transition API fan-out.
- [ ] For archive use, prefer one consolidated response per date/range (existing route) over several queries. Do not re-query when the home page already has the day DTO.
- [ ] No analytics events, storage writes, identity calls or network requests are introduced just to run a calculation.
- [ ] Personal birth inputs stay local to the browser unless an existing product function explicitly needs an account-synced action; no new service receives a birth profile.
- [ ] Avoid serializing private birth details in URLs, logs, search, static HTML, sitemaps or telemetry.
- [ ] Use workerized browser computation only when profiling shows main-thread blocking; pass data, not user identity, to a Web Worker.
- [ ] Set performance budgets: no heavy astronomy/calculator module in initial homepage chunk; record bundle-size delta; target fast mobile first paint and no long main-thread tasks on home.

## 7. Static HTML, storage and deployment budget

- [ ] Publish five static group-hub pages and static entry/landing HTML for every new tool route owned by the main app; reuse the existing canonical URL for already-working routes rather than cloning pages.
- [ ] Rebuild the existing static `/` and `/tools` HTML outputs with bilingual copy and valid metadata.
- [ ] Add fixed evergreen feature/explainer pages to the existing prerender pipeline when they have meaningful text and reviewed calculations.
- [ ] Keep the many date/calendar archive pages served through their current verified archive/worker architecture; do not materialize a second copy of the 22,281-day archive.
- [ ] Keep `/moon` and `/eclipse` in Day Atlas; do not duplicate their full data source or route owner.
- [ ] New Cloudflare storage tables: **0**.
- [ ] New D1 migrations for these features: **0**.
- [ ] New Worker/API calculation endpoints: **0**.
- [ ] New R2/KV/database publication writes introduced by this feature: **0**.
- [ ] Existing archive/D1/Worker storage usage remains exactly as-is; do not migrate or rewrite existing payloads in this feature branch.
- [ ] Static output is served as normal build assets. Report the exact generated HTML file count, total bytes, added JS/CSS bytes and route list from the completed build artifact before PR.
- [ ] If the final route audit finds a page cannot safely become static without changing a protected route owner, document the exception explicitly rather than secretly using D1.
- [ ] No build script may sync generated files to production Cloudflare. Build outputs remain local/CI artifacts only.

## 8. Nepal-first rules, data lineage and language

- [ ] Nepal defaults to `Asia/Kathmandu`, current city data, Nepal time labels and BS-first date presentation. AD remains visible where useful; Nepal Sambat remains present in calendar/Panchang context.
- [ ] No India-specific default location/timezone or IST display is reused for Nepal results.
- [ ] Nepal Panchanga Nirnayak Samiti / government-published dates and source notices are represented as published/official with source URL, source title and checked date; calculated dates remain separate.
- [ ] Use per-observance rule windows—udaya/sunrise, aparahna, pradosh, nishitha, madhyahna, moonrise, parana—not merely “tithi falls on date”.
- [ ] Dashain Tika, Ghatasthapana, Laxmi Puja, Maha Shivaratri, Ekadashi Parana, Shraddha Tithi and regional observances require a rule-specific reviewed fixture before being called correct.
- [ ] Retain official overrides and archive confidence flags.
- [ ] For cross-cultural/Regional modules, state the supported tradition/system and uncertainty rather than treating every custom as one universal Hindu rule.
- [ ] Nepali and English have parity in every button, input label, validation, error/loading/empty state, tool result, explanatory paragraph, page title, SEO description, print/share output and source note.
- [ ] The current home language selection is the only language state. Reuse `useUiLanguage`/current language functions and existing home-selected preference; no separate selector.
- [ ] Nepali number glyphs are used consistently in NE mode where the current product does so; dates and times remain copyable/searchable.
- [ ] Avoid mixed-language strings outside domain terms; ensure readable Devanagari, Unicode normalization, long Nepali labels, screen reader labels and mobile wrapping.

## 9. Sitemap, canonical URL and SEO contract

- [ ] Inspect the live current `/sitemap.xml`, robots.txt and the existing sitemap generation pipeline before editing; preserve all current canonical URLs.
- [ ] All newly added/modified indexable tool URLs are listed in one consolidated feature URL set and are also reachable from the canonical sitemap URL submitted in Google Search Console.
- [ ] Prefer one canonical master sitemap URL with a single URL set if the full inventory stays within the sitemap 50,000-URL/50-MB limits. If existing site-wide sitemap architecture cannot safely be flattened, use one dedicated feature sitemap for every changed route and include it in the existing master index; document this as the only exception.
- [ ] Do not create overlapping duplicate sitemaps, query-parameter duplicates, or multiple canonical versions of the same tool.
- [ ] Each page gets one canonical HTTPS URL, language-correct title and description, useful page content, appropriate structured data, and correct robots/indexing policy.
- [ ] Calculators with thin output-only content are indexable only when their explanatory content and stable intent add real value; otherwise noindex until useful.
- [ ] Avoid indexable pages with generic titles such as “UtilitySuite”/“Tools”; include human title in Nepali/English based on home language and a stable canonical URL.
- [ ] Generate/verify sitemap entries in build time, not by making runtime write operations.
- [ ] Keep `sitemap.xml` free of private routes, utility query-state URLs, API URLs, temporary demos and unreviewed dates.
- [ ] Check sitemap count, parseability, canonical alignment, status codes, duplicate URLs, date-lastmod validity, robots reachability and route preservation.
- [ ] Include the exact sitemap update instruction and final sitemap URL in the pre-PR handoff; do not claim submitted to Google Search Console because no Search Console action is in scope.

## 10. Existing feature preservation and privacy

- [ ] Before/after route test proves all protected existing paths continue to resolve to the same components/owners.
- [ ] Home calendar grid, festival card, My Time entry, community calendar, rashifal, BS date conversion, Nepal Sambat, Tithi reminder, Sait, JanmaPatro, Guna Milan, Moon/Eclipse and all existing utilities keep their current features.
- [ ] No change to My Time route, feature components, timing score, Choghadiya, personalization settings, browser keys, API use, ranking or visual layout.
- [ ] Do not rename a route or change a canonical to solve discovery issues; add navigation links and test aliases instead.
- [ ] No new third-party service sends user birth data, query history or calculator inputs.
- [ ] Browser state for new tools is short-lived by default; persistent settings are added only when necessary and documented.
- [ ] Check XSS, URL encoding, untrusted text, open redirects, local-storage schema and any imported rule JSON.
- [ ] Source/license notices are retained. Do not directly copy protected website copy, visual assets or proprietary content.

## 11. Detailed test/validation checklist — must be complete before PR

- [ ] TypeScript typecheck passes.
- [ ] Core calendar tests pass.
- [ ] All existing `test:patro-tools`, Sait/baby-name, Tithi-event, Guna Milan/JanmaPatro, language and URL-preservation tests pass.
- [ ] My Time source files are unchanged and all current My Time tests pass using the base source; any failures are a release blocker, not an excuse to edit My Time.
- [ ] All 91 crosswalk features have at least one functional test or an approved existing-test reference.
- [ ] Panchang DTO schema validates; one-day and range payload normalization are tested.
- [ ] Reference tests include 22 Oct 2026 Delhi and Kathmandu archive rows; compare like-for-like timezones/coordinates/methods.
- [ ] Year boundaries, Nepali BS month lengths, NS year/format, leap/date edge cases and official override precedence are tested.
- [ ] Sait/muhurat windows are checked at start, end and just outside interval boundaries; all windows carry method/source.
- [ ] Planetary ingress, aspect, station, combustion, eclipse and visibility searches test no-event, event crossing, duplicate, year-boundary and fallback cases.
- [ ] Chart-related utilities use existing chart profile and reject invalid date/time/timezone/coordinates; no duplicate profile state.
- [ ] UI tests cover Nepali and English chosen from the home language, loading/error/empty states, keyboard navigation, screen-reader labels, 320px/375px/mobile/tablet/desktop.
- [ ] Lazy-loading tests prove new calculator bundles are not in the initial home bundle and do not request calculation APIs.
- [ ] Network/performance audit proves no new calls to Worker, D1, R2/KV or third-party endpoints are required to calculate a feature.
- [ ] SEO build test proves all changed URLs appear in one declared sitemap set/master sitemap; no broken canonical/duplicate/noindex conflicts.
- [ ] Static artifact budget report exists: number of added/rebuilt HTML files, total output bytes, JS/CSS chunks and lazy-loaded chunks.
- [ ] Visual smoke tests show AafnaiPatro's existing visual identity; no generic unstyled “developer demo” tool.
- [ ] All feature routes tested as deep links, refresh, browser back/forward, share and print.
- [ ] Build and all tests must be run before PR CI is authorized. In this prep phase, do not invoke CI to substitute for missing local validation.

## 12. Final branch-review checklist (do not skip)

- [ ] Run `git diff --check` equivalent / whitespace checks and inspect every changed file.
- [ ] Check `git diff --name-only main...HEAD` contains no protected My Time files, deployment configuration, D1 migrations, Worker runtime, secret, dataset snapshot, generated archive or unrelated product files.
- [ ] Confirm no references to competitor brand names/internal source names appear in user-facing UI copy, titles, meta descriptions, alt text or structured data.
- [ ] Confirm all new pages have bilingual UI and use only home-level language choice.
- [ ] Confirm 91/91 feature rows assigned and no feature is just a static mock or card without functional behaviour.
- [ ] Confirm 5/5 groups, all routes, all navigation links and sitemap entries align.
- [ ] Confirm exactly 0 new Cloudflare storage writes/configuration changes/deployment commands.
- [ ] Produce a single PR-readiness report listing test commands and true results, not intended results.
- [ ] Stop here until the entire branch is ready. Only then ask for the separate explicit instruction to open a PR and run PR CI. Merge is a later, separately authorized step.

## Exit criteria

**PR-ready** means all items above are verified, not merely documented. No PR, CI, workflow dispatch, production write or merge is authorized by this checklist itself.
