# Reconciliation audit v2 — branch against master checklist, v1/v2 and deep v3 audit

**Branch:** `feature/panchang-jyotish-fast-gate`; base `eff3b05031cf2134731f1b57a83953bcd59d0645`.

**Scope of evidence:** branch source diff inspected through the connected GitHub reader, v1 integration pack, independent reference packages v1 and v2, and deep v3 audit crosswalk (91 rows), route matrix (64), change plan (96), proposed test matrix (108), risk register (30). This document records code inspection and authored test coverage, **not successful test execution**. The reference Python/FastAPI bundle remains unported and not a source of production numerical truth.

## Executive verdict

**Not PR-ready, not CI-ready, not merge-ready.** The branch has substantial additive implementation, but all 91 rows are not independently complete. Current implementation is a mixture of existing canonical links, browser calculations, explanatory/reference sections and features awaiting Nepal-rule/source validation. A visible catalog entry is not a test-passing calculator.

## Verified branch-side work

- `00_PRERELEASE_MASTER_CHECKLIST.md` exists and remains the stop-ship authority.
- Five React hub routes exist: `/panchang`, `/muhurat`, `/jyotish`, `/planets`, `/nepal-calendar`.
- Catalog has 91 entries split 26 + 14 + 19 + 20 + 12. Group shell uses the current `useUiLanguage` hook; no group-local language selector.
- `FeatureGroupHub` and its five workspaces are dynamically imported; the home page uses small discovery cards without importing their calculation engines into its own module.
- Home, HomePanchang, Tools and FeatureLauncher received discovery links.
- Panchang uses the existing `defaultPanchang` fallback and now tries the existing *static calendar-year archive* via `archiveDay` under `PANCHANG_CONTRACT_VERSION = 1.0.0`. Incomplete or ambiguous archive timestamp fields are not asserted to be official. No new Cloudflare endpoint is used by the workspace.
- JanmaPatro's saved birth input is read via existing `readJanmaPatroBirthInput`; no new profile storage key or write path.
- The 29 existing canonical tool route invariant is retained. The five hubs are added to `CORE_INDEX_ROUTES` in `sitemap-pages.xml`, which is listed under the existing `/sitemap.xml` master index. This is **one Search Console submission URL**, not a promise to flatten the entire established multisitemap site into one URL set.
- Two main Worker source files were edited *only* for static SPA route allowlisting and human metadata: `worker/connected-entry.ts` and `worker/connected-seo.ts`. This is code in a Git feature branch, **not a Worker deployment**. There is no change to `worker/optimized-entry.ts`, Wrangler configuration, D1 schema, R2/KV bindings, scheduled triggers or release workflow.

## Immediate defects found during this audit

1. Planet event finder used `"Sun"` while the engine returns `"sun"` keys. Corrected within the feature branch. This was a functional defect even though the catalog counted those items.
2. Original contract existed but the UI ignored archive results and only displayed calculated fallback. Added adapter and wired it into the Panchang workspace for the existing static archive source, with conservative field precedence.
3. A generic `browser` catalog disposition was not proof that a dedicated calculation existed. The 91-row checklist remains open until every row has a test/reference and a functional result, with source review for tradition-specific cases.
4. A large component can be lazy loaded yet still block the browser during long synchronous search. The 180-day planetary search and 1000-full-moon path need profiling and yielding/workerization if slow.
5. Current static asset archive records are not equivalent to the complete 22,281-row D1 master-day payload: many exact boundary fields in D1 are not represented in the public `archiveDay` shape. Do not pretend those boundaries have already been successfully wired. Only available, unambiguous fields are overlaid; remaining values stay explicitly calculated and unverified.
6. Current main SEO architecture uses a master index plus independent existing family sitemaps. Avoid flattening or deleting independent indexes without a global URL-count/limit and route-ownership audit. The new five hubs are already in the canonical master URL path.
7. The five hub pages are intended to be prerendered; the *measured* HTML/JS bytes and output count remain unavailable because a full build has not run.

## Status by checklist section

| Checklist section | Source inspection status | Release gate |
|---|---|---|
| 0 Protected scope | No protected My Time implementation file has appeared in the branch diff reviewed | Final baseline/diff test pending |
| 1 No-deploy branch | Git feature branch only; no PR/dispatch/Cloudflare write made by this work | Verify workflow history and automatic triggers again before PR |
| 2 Baseline inventory | Reviewed key main SPA/Worker/tool paths | Full preservation smoke not run |
| 3 91-feature coverage | 91 catalog rows and five category surfaces wired | 91/91 *functional* acceptance not met |
| 4 One Panchang data contract | Versioned contract and static archive adapter authored | Exact D1 boundary adapter, golden tolerance and source confidence still open |
| 5 Group navigation | Main routes, Tools, Home and launcher updated | Mobile/keyboard/deep-link click-through pending |
| 6 Browser-only/lazy | Workspaces lazy, engine runs browser-side, no new calculation API | Bundle/network/performance measurement pending |
| 7 Static and storage | Five new hub static-route targets; zero new schema/endpoints/writes | Actual `dist` count and size not measured |
| 8 Nepal-first/i18n | Shared home language hook, Kathmandu time default, scoped source cautions | Complete NE/EN review and official rulepack review pending |
| 9 SEO | Five hub URLs included in existing master sitemap's pages cohort | Generated XML and canonical/robots tests not run |
| 10 Preservation | My Time source not edited; bridge imported read-only | Full regression still pending |
| 11 Tests | Catalog, contract, source precedence and preservation test files authored | Test suite **not run** |
| 12 Final release | Branch is preparation-only | BLOCKED |

## 91-feature disposition and priority

The crosswalk has 91 independent feature acceptance rows, not 91 promised new URL pages. Current count is **91 cataloged, fewer than 91 fully functioning/verified**. Group sizes are 26 daily Panchang, 14 Muhurat, 19 Jyotish, 20 planets/astronomy and 12 Nepal calendars/traditions.

Important incomplete rows:
- **P0**: F010 Kshaya/Vriddhi observance; F011 full archive timeline; F020 day/night Choghadiya must reuse My Time without editing it; F067 My Time re-link only; F080 BS calendar reuse. Some are linked but full archive contract and acceptance still open.
- **P1**: F008 Amanta/Purnimanta naming in UI, F009 Adhika/Kshaya validation, F014 Moon exact archive details, F025 solar ingress parity, F026 Shraddha rules, F048 Nakshatra ingress, F052/F077 validated Graha Asta thresholds, F053 personal transit parity, F055–F059 official Sait/property category, F068 Ekadashi Parana.
- **P2/P3**: F024 Abhijit Nakshatra, F029 Pancha Pakshi, F030 Gemstone, F031 Rudraksha, F041 Sahasra Purna Chandrodaya acceptance, F060–F066 source-reviewed Yoga combinations, F082–F089 source-reviewed regional calendar dates.
- Current UI must continue to label unreviewed items as information/source-review pending. It must not present provisional rules or generated fixture data as official.

## Correct static/storage accounting

- **Five newly planned static hub HTML outputs**, plus rebuilding the existing `/` and `/tools` HTML (two modified pages, not two new URLs).
- Feature-specific route count: not final. Catalog fragments within hubs do not produce a separate indexable HTML page per feature. Existing canonical pages stay where they are.
- **New Cloudflare D1 tables/migrations: 0. New Worker calculation APIs: 0. New R2/KV writes: 0.**
- Existing archive-backed `/date/*`, calendar, Moon/Eclipse and community pages remain unchanged in route ownership; existing public static assets can still incur normal static-asset requests. “Browser-only calculation” does not mean zero bytes served over the network.

## Partially addressed archive-boundary integration — release gate remains open

The public static year shard exposed through `archiveDay` uses the existing `panchang.tithi_transition` shape (`time` plus `minutes`), and on some records includes `sunrise`, `sunset`, and `location`. The feature-branch adapter now normalizes these NPT wall clocks explicitly, validates civil dates/clocks, cross-checks `time` against `minutes`, maps Kathmandu solar values with provenance, and keeps archive fields labelled `unverified` until independently audited. It does not silently fabricate a boundary when these fields disagree or are absent.

This closes the earlier parser-shape mismatch in code, but **not the release validation gate**: the new tests have been authored but not run here; the adapter’s field coverage still needs comparison against actual static archive rows over representative dates. Nakshatra/Yoga/Karana exact transitions and additional master-day-only fields remain calculated fallback unless the public archive supplies an unambiguous value. Do not add a new D1 request or Worker arithmetic endpoint to fill these gaps. If representative-row verification proves a materially necessary field is absent, propose a build-time immutable projection or a separately approved existing archive projection—never a production database read added just for this UI.

## Follow-up implementation batch recorded after this audit

- Browser feature-topic navigation now records history entries and syncs selection on both `hashchange` and `popstate`; source guard added, browser execution still pending.
- Panchak candidate start is explicitly 300° sidereal Moon longitude (Dhanishtha Pada 3), not the beginning of the entire Dhanishtha Nakshatra; the scanner runs beyond the requested range edge to report complete overlapping windows. Its outputs remain candidate-unverified until exact Nepal-local reference comparisons pass.
- Planetary event scans yield control, cancel stale searches, expose localized running/error states, and sample Nakshatra boundaries every six hours so a fast-moving Moon does not collapse two same-day crossings into a false direct jump; regression guards authored, not yet executed.
- Muhurat date ranges calculate progressively with cancellation and localized loading/error states rather than synchronously building all days during render.
- The existing JanmaPatro summary still reads its prior context only; the live Saturn sign now refreshes on focus and once per minute instead of freezing at mount time.
- Nepal Sambat retains separate Devanagari and English/transliterated archive labels; the UI selects the correct representation from the single homepage language state.


- Static-calendar year asset reader integrated into the browser Panchang via a versioned DTO; missing source values are not invented, and UTC-offset-qualified transition instants are preserved as UTC.
- All four core elements have browser-calculated start and end transition solvers. If an archive label disagrees with its calculated fallback, unverified fallback boundary times are withheld rather than shown beside a potentially different element.
- Clock display supports 12h, 24h and a date-aware 24+ display without mutating stored UTC timestamps; a rollover test was authored.
- BS and Nepal Sambat are surfaced where provided by the existing archive; lunar month naming now distinguishes Amanta and Purnimanta, with Adhika/Kshaya labels explicitly calculated.
- An initial sunrise-sequence Kshaya/Vriddhi indicator was authored; **it is not a substitute for a reviewed ritual observance decision**.
- Planet search now uses the engine's canonical lowercase keys. Sadesati checks twelve-sign modular distance (rather than treating signs as degrees); a planet-key/Sadesati test was authored.
- New Jyotish reads the timezone actually saved in the existing JanmaPatro context via a read-only adapter, without changing `src/jyotish/my-time-bridge.ts`.
- `05_FEATURE_ACCEPTANCE_91.csv` records all 91 entries with their independent v3 audit priority, canonical destination, implementation class and *unrun* release gates. Current hub availability is 17 existing links, 47 browser previews (including two candidate-only Nakshatra interval tools), and 27 reference-only entries. The underlying source-review disposition remains on 26 items; F021/F022 expose candidate math but stay source-review-required and BLOCKED.
- `scripts/panchang-prepr-audit.mjs` is a read-only local gate to check protected paths, 91 unique entries, 5 hub routes, 29 existing tool routes, generated static HTML and master sitemap presence after a completed build. It has not been executed here.

**No source-related gate was changed to PASS merely because this implementation work was authored.** In particular the full master-day boundary projection, genuine completion of reviewed calculators, full build artifacts and comprehensive regression results are still missing.

## No PR/CI/deploy authorization

None of this audit, these commits, or the existence of test files authorizes PR creation, CI execution, merge, Worker deployment or production writes. After every gate truly passes, obtain an explicit separate instruction for PR/CI, and again for merge.
