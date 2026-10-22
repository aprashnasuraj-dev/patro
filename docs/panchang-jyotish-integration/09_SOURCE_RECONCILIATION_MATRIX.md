# Source-pack reconciliation matrix — branch snapshot 2026-10-22

**Repository:** aprashnasuraj-dev/patro  
**Working branch:** feature/panchang-jyotish-fast-gate  
**Baseline used by the v3 source pack:** eff3b05031cf2134731f1b57a83953bcd59d0645  
**Evidence limitation:** this file records source-file comparison and regression guards authored. It does not claim TypeScript/Vitest/build/browser tests passed.

## Recovered inputs and identity

| Input | Materialized source artifact | SHA-256 | Role / authority |
|---|---|---|---|
| Independent Panchang v1 | drik_independent_panchang_v1_2.zip | f9f705f02fbd9a96ac118797231c87de0b216e2e2457673653394872c8810b86 | Research prototype and limited comparison fixtures; not official truth, not production runtime |
| Independent Panchang v2 | drik_independent_panchang_v2_complete_2.zip | 0b9cda21695bc68aafca6c52a662f85622cfe14c5afbd39caa89c26c59780ca8 | Feature/rulepack specs, sample extensions and incomplete engine; status labels are not proof of parity |
| Deep integration audit v3 | aafnaipatro_drik_deep_integration_audit_v3_2.zip | 47188ca64cca924d794d322705efd970eac430b2edfa39f93b4be9c390e8afc9 | Planning/reconciliation evidence. Includes 91-feature crosswalk, 64-route matrix, 9-runtime map, 96-file plan, 108-test matrix and 30-risk register |
| Branch acceptance ledger | docs/panchang-jyotish-integration/05_FEATURE_ACCEPTANCE_91.csv | Current branch file | Per-feature acceptance rows; release status columns remain blocked until execution/evidence exists |

## Reconciliation by concern

| Concern | v1 finding | v2 finding | v3 crosswalk / test obligation | Current feature-branch decision | Remaining gate |
|---|---|---|---|---|---|
| Numerical engine | Independent astronomy model, sample database, 210 engine-generated fixtures; fixtures are not independently verified truth | Python/Swiss Ephemeris path with Lahiri configuration; commercial redistribution needs license review | Do not replace existing TypeScript SPA engine; define method, observer, frame and confidence; compare only like-for-like | Uses existing TypeScript defaultPanchang and jyotishEngine; v1/v2 not copied into runtime | Independent golden fixtures, licensing decision if any dependency is ever proposed, core parity review |
| Archive authority | Limited screenshot-level Delhi check, not exact parity | Rule outputs are often partial/experimental even where a pack says “implemented” | Archive-first where covered; 22,281 master-day archive observed in v3 evidence; preserve exact UTC transition instants and confidence tiers | Browser adapter reads the existing static AD year shard only; missing static fields remain calculated fallback, no new D1/API call | Reconcile static shard schema against representative production rows; test unsupported range/confidence tiers |
| Tithi / transitions | One screenshot event approximates minute resolution; exact locality/settings unknown | Tithi transition and observance rules remain separate concerns | Exact start/end and before/at/after-boundary, wraparound, UTC/NPT conversion and 2026-10-22 reference values | Adapter accepts explicit-offset timestamps and existing archive tithi_transition.time/minutes; rejects invalid/mismatched values; calculated fallback is not promoted to official | Run authored fixtures; test real static records including midnight rollover; static shard does not contain every D1 field |
| Panchak | Prototype calculations are not an authority | v2 marks Panchak implemented but says independent reference comparison, region exceptions and confidence still unresolved | Compute exact interval start/end; do not label candidate as official | Candidate window is computed locally using sidereal Moon longitude; onset is 300° (Dhanishtha Pada 3), ending at 360°; six-hour brackets refined by bisection | Compare exact Nepal-local dates/times with independent published reference; reviewer/exception policy still mandatory |
| Ganda Moola | No definitive natal consequence supplied by the prototype | v2 explicitly says not implemented | Derive continuous intervals from six-star membership and distinguish Gandanta | Candidate intervals implemented for Ashwini, Ashlesha, Magha, Jyeshtha, Mula and Revati; consecutive star pairs remain one interval; no natal verdict | Independent Nepal-local start/end comparison, regional/source review, no official status yet |
| Muhurat and ritual rules | Not validated from a local authority | Several rulepacks are partial or unimplemented; selected regional rules explicitly unapproved | Require source edition, locality, observance window and exceptions before outputting official dates | Unreviewed yoga / parana / ritual-specific rows remain references; no bulk source copying or fabricated date tables | Named Nepal-qualified reviewer and golden event fixture sets |
| Jyotish / natal profile | Interpretive claims are not scientific or certain | Most extension packages are partial; rule definitions are incomplete | Use existing birth profile only and disclose method/limits | Read-only JanmaPatro context bridge unchanged; current Saturn sign now refreshes on focus/minute; no second profile introduced | Test invalid birth/time/timezone inputs and baseline JanmaPatro continuity |
| Bilingual UI | V1 locale dictionary does not mean a complete frontend | v2 translation status says core controls are translated but feature-specific Nepali labels need human review | Every state, table, date, method, source warning and empty/error path must use homepage language | Hubs and tools use existing useUiLanguage; Nepal Sambat archive carries separate Devanagari and transliterated labels; Panchak/Ganda Moola candidate results have NE/EN copy | Full human-language review, Unicode/mobile wrapping and live home-language switching check |
| Mobile performance | Prototype does not establish SPA latency | Runtime quality/performance remains open | Lazy imports plus responsiveness during long scans | Planetary event scans and multi-day Muhurat scans yield, cancel stale work and expose loading/errors | Measure actual 375/768/1280 layouts, run profiling and bundle/network checks |
| Route and SEO ownership | Not a routing authority | N/A | 64-route matrix assigns existing owners; five canonical hubs; retain 29-tool invariant; preserve /date/*, /moon, /eclipse, /mytime, /janmapatro, /tools/sait and reminder route ownership | Five hub routes and feature anchors are additive; navigation history uses pushState/popstate; no new per-feature canonical pages added | Run actual SPA deep links/refresh/back-forward, static prerender and sitemap/canonical tests |
| Testing and release | Validation is partial and engine-generated | V2 test cases are not equivalent to passing CI | 108 v3 test cases, 91 feature rows, 30 risks; no test row should be treated as passed from authored code | Adds targeted archive, bilingual, navigation, scan and candidate-interval regressions; no CI was triggered | Local typecheck, focused test suites, full test baseline, build/prerender, visual/browser matrix and diff review still required |

## Specific source decisions captured in code

1. **No secondary engine at runtime.** Use the existing TypeScript astrology/calendar engines. Do not port the reference Python engine or its SQLite sample dataset into the SPA.
2. **Candidate is not authority.** F021/F022 can display candidate intervals so the logic is testable and useful; catalog availability is browser-preview, while source-review is still required and acceptance rows remain BLOCKED.
3. **Panchak onset is a longitude threshold.** Do not treat every moment in Dhanishtha as Panchak: candidate interval starts when sidereal Moon longitude reaches 300° and exits at 360°.
4. **Ganda Moola is not Gandanta.** The interval uses membership in six named Nakshatras; no childbirth consequence or narrow junction claim is inferred.
5. **Archive provenance stays conservative.** NPT wall-clock fields are converted explicitly; conflicting time/minutes values are withheld; source confidence remains unverified unless a field-level audited source says otherwise.
6. **No new storage or server calculations.** No DB migration, new Worker/API arithmetic, R2/KV writes or cloud deployment is part of this branch change.
7. **The test state is truthful.** Code and tests have been authored, but no local typecheck, test run, build or browser matrix has been run in this environment; all pre-PR gates remain blocked.

## Current feature classification after candidate-only implementation

| Availability shown in hub | Count | Meaning |
|---|---:|---|
| Existing route/tool | 17 | Reuses an existing destination; still requires route smoke test |
| Browser preview/candidate calculation | 47 | Local calculation exists, but not automatically source-approved or official |
| Reference / not functional yet | 27 | Explanation or link only; not advertised as a completed calculator |
| **Total** | **91** | Source review, tests and route acceptance still have independent release gates |

F021 (Panchak) and F022 (Ganda Moola) are the two moves from reference-only to candidate calculation. Their source-review status is deliberately still not verified.

## Next validation queue (no PR/CI authorization implied)

1. Run TypeScript typecheck and focused tests for archive parsing, reviewed candidate rules, the 91-feature gate, bilingual experience, planet scans and SEO/editorial.
2. Compare complete candidate windows against the pinned independent Nepal-local reference set, particularly Panchak at 300° and Ganda Moola consecutive pairs and the 360°/0° wrap.
3. Test NPT/UTC and transition boundary cases, archive/calculated conflict UI and missing-source fallbacks.
4. Run existing calendar/JanmaPatro/My Time regression suites and verify protected-path bytes.
5. Build, prerender, measure output and run the 320/375/768/1024/1440px Nepali/English keyboard/light/dark route matrix.
6. Only after results are real, update each CSV/checklist status. Do not change a gate to PASS based on source inspection alone.


## Archive payload inspection — 2026-10-22 branch follow-up

The generated static payload was traced through `scripts/build-client-calendar.mjs` to `lib/patro.mjs` and the source row in `migration/data/public/astronomy_calendar_map/part-074.json` for AD **2026-10-22**. The observed row uses `ad`, `bs`, `ns.formatted/formatted_ne`, and `panchang.tithi` with one-based `number`, bilingual `ne/en`, and `paksha`; the transition fields are `panchang.tithi_transition.time` and `.minutes`, while daylight is `panchang.sunrise/sunset` as NPT wall clocks and `panchang.location = "Kathmandu, Nepal"`. That sample has no Nakshatra row.

The adapter mirrors that observed shape: it normalizes one-based `nakshatra.number` only when that field exists, accepts both transition key casings and explicit-offset transition aliases, rejects contradictory representations of the same boundary, and refuses to attach archive-local clocks if an explicit timezone conflicts with Kathmandu. Archive metadata is preserved separately as reported source/timestamp; it does not increase the confidence tier. The observed generated row has no independent per-field audit evidence, so archive-provided facts remain `confidence: "unverified"`. Missing elements remain calculated/unavailable rather than being relabelled as archived.

Regression tests were added for the real 2026 payload shape, the 2037 `time + minutes` boundary, Nakshatra's one-based number convention, camelCase/offset timestamps, conflicting boundaries, unqualified clocks and a conflicting timezone. **These tests have been authored but not executed.**


## Existing destination ownership review — 2026-10-22

The 17 catalogue rows classified as `reuse` retain their original `href` values; no legacy path was silently repointed. The source-level route owners are now covered by the integration gate:

- `/moon` (F014, F069) and `/eclipse` (F070, F071) are existing growth-page families. `worker/optimized-entry.ts` calls `growthPageResponse`; `worker/growth/index.ts` dispatches to the Moon/Eclipse page handlers; `scripts/prerender-growth.mjs` emits their static pages; `wrangler.jsonc` excludes those paths from `run_worker_first` so normal traffic uses static assets, with a low-cost worker fallback.
- `/tools/sait` and `/tools/baby-names` remain registered tool destinations. The existing tool registry includes both slugs, and the canonical tool-sitemap inventory remains 29.
- `/mytime`, `/janmapatro`, `/janmapatro/milan.html`, `/rashifal`, `/nepal-sambat/mandala`, `/samudaya`, and `/` remain in the established connected SPA route set. My Time and the JanmaPatro birth-context bridge are preservation-protected, not refactor targets.

**Evidence level:** this verifies source-level ownership and build/configuration wiring, not the live production HTTP response. Browser/mobile smoke checks and a built-static-asset check remain unrun, so the 17 reused routes remain `partial`, not `verified`.
