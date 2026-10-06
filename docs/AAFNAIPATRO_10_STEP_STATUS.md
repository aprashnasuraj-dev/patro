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
| 3 | Festival identity + annual occurrence + real-event separation | PR #78 provides deterministic festival identity/year pages from the validated holiday map. Festival observances are represented separately from future organizer-event entities. | PARTIAL — EVENT SCHEMA REMAINS | Add a real `event` entity type/source gate only; do not fabricate organizer events. Add a renderer later only if source-backed organizer records already exist. |
| 4 | Six community calendar hubs/archives without flattening native rules | The six suites remain registered and functional with migration/readiness tests. | CORE COMPLETE / DATA-GATED | Do not synthesize native dates by fixed offsets. Expand only from trustworthy native-source coverage. |
| 5 | 33 source-backed tool identities with one public canonical per real task | Public HTML/SEO registry verifies 29 canonical public tools. The four additional source-backed identities are now parity-reviewed in `migration/data/public/tool_identity_review.json`, and the graph validator requires their explicit disposition. | PARITY REVIEW COMPLETE / 29 PUBLIC | No promotion is justified now: `diaspora` maps to `/tools/clock`; `tithi` and `card` bridge into private `/me/*` state; `api` is a developer/reference surface kept noindex and outside the end-user tool count. Preserve 29 working canonical tools. |
| 6 | Today in History + permanent archive + contextual workflows | Main includes packaged/R2 On This Day fallback over the 5,454-row archive. The publication graph contains 366 reusable month/day identities and 5,454 stable history-event candidates. | PARTIAL — ARCHIVE RENDERER REMAINS | Add deterministic `/on-this-day/MM-DD` pages first, without D1 and without individual event-detail publication. Then classify event evidence quality before any event pages. |
| 7 | Deterministic read-only publication pipeline | Build-time SEO/day generation, shared source adapters, validated local archive and the canonical publication graph provide one deterministic publication path. | COMPLETE | Future page families must use the graph rather than separate uncontrolled route registries. |
| 8 | Midnight freshness, cache hierarchy, performance and private-state preservation | `worker/quota-cache.ts`, packaged/R2 history fallback, storage-binding guards, release-safety tests and PR #81 cover the core requirement. | COMPLETE / MONITOR | Keep private/local state out of shared caches and preserve Kathmandu date-boundary behavior. |
| 9 | Canonicals, crawlable archives, sitemaps and measured 10k+ scaling | SEO generation/validation and the >19k-entity candidate graph provide route capacity without making every entity indexable. | CORE COMPLETE / SCALE-GATED | 10k–50k is capacity, not an indexing target. No blind cross-products or duplicate aliases. |
| 10 | Reversible release, regression gates and monitoring | GitHub Release Gate, `release:verify`, browser functional checks, Lighthouse, deployment smoke checks and previous-artifact safeguards are working. | COMPLETE | Keep PRs narrow and merge only with a green Release Gate. |

## Remaining implementation sequence

Only gaps that still require code should create PRs. After the Step 5 parity review, the remaining sequence is:

1. **Step 6 recurring history archive renderer** — `/on-this-day/MM-DD`, deterministic/static, 366 valid keys including Feb 29, no D1, no event-detail pages yet.
2. **Step 6 history publication-quality classifier** — classify all 5,454 records as `publishable`, `needs-source`, `duplicate`, or `uncertain`; do not auto-publish pages.
3. **Step 3 real-event schema + source gate** — add organizer-event entity support and validation, with source evidence mandatory before `public/indexable`.
4. **Step 3 event renderer only if data already exists** — stop at the schema/source gate if the repository lacks sufficient organizer-event records.

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

A future `event` entity is permitted only when real organizer/source evidence exists. A future `guide`/reference entity is permitted only when it has distinct reviewed public intent.

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
- new public traffic creates an avoidable D1-read dependency while static/R2/KV coverage is available.
