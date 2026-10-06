# Aafnai Patro 10-Step Implementation Status

Updated: 2026-10-06

This file maps the expanded 10-step enhancement plan to the repository as it exists now. The rule is additive preservation: existing routes, tool engines, six community suites, private notes/letters, auth/storage keys, and data contracts are not replaced merely to increase page count.

## Runtime/storage constraint

D1 read quota is currently constrained. New public-reference work must **not add new direct D1 read dependencies**. Use, in order of suitability:

1. deterministic build/static assets for immutable archive documents;
2. existing Cache API/KV for low-cost hot/reference cache state;
3. `ARCHIVE` R2 for durable public-reference/history/calendar snapshots and packaged fallback data;
4. D1 only where an existing mutable/runtime contract still requires it and a cached/static path is not available.

Main already contains Cache → KV/R2 → connected-runtime response caching plus packaged/R2 On This Day fallback. PR #81 applies the same D1-independent availability rule to immutable calendar reads. Do not duplicate these systems.

## Step-by-step status

| Step | Requirement | Repository evidence/current state | Status | Required change |
|---|---|---|---|---|
| 1 | Inventory, preservation contract, stable identity/URL semantics | `docs/INVENTORY.md`, migration inventory checks, release-safety tests and the canonical publication graph protect the working product. Current date canonical is `/date/YYYY-MM-DD`; no mass URL move is required. | COMPLETE | Regression-only. Do not rebuild Step 1. |
| 2 | Permanent useful date pages from validated data | `scripts/calendar-snapshot.mjs`, `lib/patro.mjs`, `scripts/prerender-days-seo.mjs`, `seo-config.mjs`, phase-gate tests and PR #81 provide factual date pages plus R2/static calendar fallback before indexed D1. | CORE COMPLETE / SCALE-GATED | Keep wider years candidate/non-indexed until accuracy/indexing gates justify expansion. |
| 3 | Festival identity + annual occurrence + people/community observance semantics | PR #78 provides deterministic festival identity/year pages from the validated holiday map. Festival identity pages use `CollectionPage`; annual occurrences use `WebPage` + observance subject semantics. Ordinary festivals are modeled as observances celebrated in homes, families and communities, not as concert-style scheduled `Event` records. | COMPLETE | Regression-only. Keep festival dates source-backed and do not reintroduce Schema.org `Event` for ordinary festival observances. |
| 4 | Six community calendar hubs/archives without flattening native rules | The six suites remain registered and functional with migration/readiness tests. | CORE COMPLETE / DATA-GATED | Do not synthesize native dates by fixed offsets. Expand only from trustworthy native-source coverage. |
| 5 | 33 source-backed tool identities with one public canonical per real task | Public HTML/SEO registry verifies 29 canonical public tools. The four additional source-backed identities are parity-reviewed in `migration/data/public/tool_identity_review.json`, and the graph validator requires their explicit disposition. | PARITY REVIEW COMPLETE / 29 PUBLIC | No promotion is justified now: `diaspora` maps to `/tools/clock`; `tithi` and `card` bridge into private `/me/*` state; `api` is a developer/reference surface kept noindex and outside the end-user tool count. Preserve 29 working canonical tools. |
| 6 | Today in History + permanent archive + evidence classification | Live `/on-this-day` remains unchanged. `scripts/prerender-history-days.mjs` renders all 366 permanent `/on-this-day/MM-DD` routes from packaged monthly history shards; hydrated archive views use the same static shards. All 5,454 records remain visible. The 3,307 source-backed records retain source links; all 2,147 `unverified` records are shown with `Needs further verification / थप प्रमाणीकरण आवश्यक`. `scripts/classify-history-evidence.mjs` deterministically records `publishable`, `needs-source`, `duplicate`, or `uncertain` evidence disposition without deleting or hiding records. | COMPLETE | Regression-only. Individual thin history-event detail pages remain non-indexed candidates; archive visibility must never depend on source URL presence. |
| 7 | Deterministic read-only publication pipeline | Build-time SEO/day generation, shared source adapters, validated local archive and the canonical publication graph provide one deterministic publication path. | COMPLETE | Future page families must use the graph rather than separate uncontrolled route registries. |
| 8 | Midnight freshness, cache hierarchy, performance and private-state preservation | `worker/quota-cache.ts`, packaged/R2 history fallback, storage-binding guards, release-safety tests and PR #81 cover the core requirement. Permanent history month/day pages are immutable and do not depend on Nepal midnight. | COMPLETE / MONITOR | Keep private/local state out of shared caches and preserve Kathmandu date-boundary behavior for live routes. |
| 9 | Canonicals, crawlable archives, sitemaps and measured 10k+ scaling | SEO generation/validation and the >19k-entity candidate graph provide route capacity without making every entity indexable. The 366 history archive routes remain deliberately `noindex,follow` while still being complete and navigable. | CORE COMPLETE / SCALE-GATED | 10k–50k is capacity, not an indexing target. No blind cross-products or duplicate aliases. |
| 10 | Reversible release, regression gates and monitoring | GitHub Release Gate, `release:verify`, browser functional checks, Lighthouse, deployment smoke checks and previous-artifact safeguards are working. | COMPLETE | Keep PRs narrow and merge only with a green Release Gate. |

## Remaining implementation sequence

There is no remaining Step 3 or Step 6 implementation gap in the 10-step plan.

Future work is quality expansion only:

1. improve or add sources for the 2,147 history records currently labeled `Needs further verification` without hiding them in the meantime;
2. widen date/community/indexable cohorts only when their existing accuracy and release gates pass;
3. keep ordinary festival pages as people/family/community observances and preserve their validated calendar dates.

No additional PR is justified solely to reach a numeric page/tool target.

## Canonical entity rules

The publication graph uses stable internal IDs independent of presentation state and currently supports these source families:

- `day`
- `calendar-year`
- `calendar-month`
- `festival`
- `festival-occurrence`
- `community`
- `history-day`
- `history-event`
- `tool`

Festival identity and festival-occurrence entities represent calendar observances. They do not require an organizer, venue, ticket, concert, or scheduled-event model. A future unrelated event feature, if ever added for a genuinely distinct product need, must not change the meaning of festival observance entities.

Each published entity needs: stable ID, type, canonical route, aliases only when truly equivalent, source/version references, coverage status, publication status, indexability decision, and dependencies/relations.

Equivalent presentation state is not a new public page. Personal inputs, notes, future letters, uploaded OCR documents, account tokens, saved results and arbitrary filter permutations are never public entities.

## Tool parity decisions

The parity review is machine-readable in `migration/data/public/tool_identity_review.json` and is enforced by `scripts/reconcile-tool-identities.mjs` plus `scripts/validate-publication-graph.mjs`.

| Identity | Current behavior | Distinct public task? | Decision |
|---|---|---:|---|
| `tithi` | `/tools/tithi` resolves to private `/me/reminders`; public `/tools/tithi-reminder` already exists | No | Keep candidate/private compatibility identity; do not publish a duplicate. |
| `diaspora` | `/tools/diaspora` resolves to `/tools/clock` | No | Treat as an alias/equivalent intent of the canonical clock/timezone tool. |
| `card` | `/tools/card` resolves to private `/me/cards` | No | Keep candidate/private; do not expose saved card/user state as a public task. |
| `api` | `/tools/api` renders the same developer/reference surface as `/developers` and is intentionally noindex | No, not as an end-user tool | Keep as candidate/reference and outside the public tool count. |

Therefore the repository retains **33 source-backed identities = 29 public canonical tools + 4 explicit non-promoted identities**. The four candidates must not replace or remove any of the verified 29.

## History archive publication policy

The permanent recurrence archive preserves the complete canonical history dataset while being explicit about evidence quality.

- `/on-this-day` remains the live/current-date-capable feature and may use the existing cached API path.
- `/on-this-day/MM-DD` is generated from the packaged public history shards and performs no D1 read.
- All 366 valid month/day keys exist, including `02-29`.
- All **5,454** canonical history records remain visible in the recurrence archive; records are not omitted merely because a source URL is missing.
- **3,307** records are currently source-backed and retain their source link.
- **2,147** records are currently `unverified` and are explicitly labeled **`Needs further verification / थप प्रमाणीकरण आवश्यक`**.
- Evidence classification is deterministic and stored on history-event graph entities as `publishable`, `needs-source`, `duplicate`, or `uncertain`.
- Permanent archive HTML does not copy long archive summaries.
- The 366 recurrence pages remain `noindex,follow`; individual history-event detail routes remain non-published candidates, so completing the archive does not create 5,454 thin SEO pages.

## Scale policy

The architecture may safely support 10,000–50,000 routable/candidate documents, but route capacity and index eligibility are separate.

- Core validated dates may be routable from shared data/templates.
- Current independently validated/indexed cohorts remain the indexable subset.
- Community daily cross-products are not generated merely to increase count.
- Search aliases remain aliases, not cloned pages.
- History identities can exist in the graph without 5,454 thin event pages being published.
- A source correction must map deterministically to affected entities/pages and leave unrelated archives unchanged.

## Release acceptance

A wider cohort is blocked if any of the following occurs:

- an existing route/tool/community suite disappears;
- AD↔BS boundary or leap-day tests regress;
- a historical route mutates into today's date;
- a private value appears in public HTML/cache/manifest output;
- canonical/status/sitemap disagree;
- an invalid date returns a successful generic document;
- saved state, export, reminders or offline behavior regress;
- a gated tool alias is mislabeled as a new distinct public tool;
- an ordinary festival occurrence is emitted as Schema.org `Event` rather than an observance page;
- any unverified history record is hidden instead of being retained with an explicit further-verification label;
- new public traffic creates an avoidable D1-read dependency while static/R2/KV coverage is available.
