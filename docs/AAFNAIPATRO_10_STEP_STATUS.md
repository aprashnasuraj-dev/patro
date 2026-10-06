# Aafnai Patro 10-Step Implementation Status

Updated: 2026-10-06

This file maps the expanded 10-step enhancement plan to the repository as it exists now. The rule is additive preservation: existing routes, tool engines, six community suites, private notes/letters, auth/storage keys, and data contracts are not replaced merely to increase page count.

## Runtime/storage constraint

D1 read quota is currently constrained. New public-reference work must **not add new direct D1 read dependencies**. Use, in order of suitability:

1. deterministic build/static assets for immutable archive documents;
2. existing Cache API/KV for low-cost hot/reference cache state;
3. `ARCHIVE` R2 for durable public-reference/history/calendar snapshots and packaged fallback data;
4. D1 only where an existing mutable/runtime contract still requires it and a cached/static path is not available.

Main already contains Cache → KV/R2 → connected-runtime response caching plus packaged/R2 On This Day fallback. Recent main commits also enforce/reconcile production KV/R2 bindings. PR #81 applies the same D1-independent availability rule to immutable calendar reads. Do not duplicate these systems.

## Step-by-step status

| Step | Requirement | Repository evidence/current state | Status | Required change |
|---|---|---|---|---|
| 1 | Inventory, preservation contract, stable identity/URL semantics | `docs/INVENTORY.md`, migration inventory checks, release-safety tests and current route registries already protect the working product. Current date canonical is `/date/YYYY-MM-DD`; no mass URL move is required. PR #80 adds stable cross-family identities without changing existing presentation routes. | IMPLEMENTED / PR-GATED | Validate and merge PR #80 after CI/review; no destructive URL migration. |
| 2 | Permanent useful date pages from validated data | `scripts/calendar-snapshot.mjs`, `lib/patro.mjs`, `scripts/prerender-days-seo.mjs`, `seo-config.mjs` and phase-gate tests already produce factual date pages from the validated archive. PR #81 adds R2 + packaged static calendar shards before D1 fallback. | EXISTING, SCALE-GATED | Keep wider years candidate/non-indexed until the existing accuracy/indexing gates pass. Do not create hand-written date articles. |
| 3 | Festival identity + annual occurrence + real-event separation | Date pages already link festival-year routes. PR #78 adds deterministic festival identity/year pages from the validated holiday map and serves them as static assets before legacy redirect handling. | IMPLEMENTED / PR-GATED | Merge only after combined build/release gates stay green. Organizer-event pages remain separately source-gated. |
| 4 | Six community calendar hubs/archives without flattening native rules | The six suites are registered (`lhosar`, `tharu`, `mithila`, `kirat`, `hijri`, `chakra`) and existing community functionality is covered by migration/readiness tests. | EXISTING / DATA-GATED | Do not synthesize native year/month/day mappings by fixed offsets. Expand archive depth only from each suite's real source coverage. |
| 5 | 33 tools as task systems, with one working identity per task | Public HTML/SEO registry verifies 29 canonical public tools. Repository evidence also contains four enabled, non-private legacy/source identities outside that public 29: `tithi`, `diaspora`, `card`, `api`. PR #80 reconciles them as candidate identities while excluding private `family`/`my-data`, disabled legacy font routes, hubs and aliases. | IDENTITY RECONCILED / FUNCTION-GATED | Keep 29 public + 4 gated = 33 source-backed identities. Do not publish/index the four candidates until each proves a distinct working public task rather than an alias/private redirect. Do not invent replacements. |
| 6 | Today in History + permanent archive + contextual workflows | Main includes packaged/R2 On This Day fallback over the 5,454-row archive. PR #80 adds 366 reusable month/day identities and all 5,454 stable history-event identities to the canonical graph as non-indexable candidates. | SUBSTANTIALLY IMPLEMENTED / PUBLICATION-GATED | Existing `/on-this-day` remains live. Per-event pages stay gated until evidence-qualified rendering is explicitly approved; records without source evidence must not be promoted automatically. |
| 7 | Deterministic read-only publication pipeline | Build-time SEO/day generation, shared source adapters, validated local archive and deterministic templates already exist. PR #80 adds a single publication/entity manifest plus validation instead of another content DB. | IMPLEMENTED / PR-GATED | Validate/merge PR #80; future page families must derive from this identity/source model. |
| 8 | Midnight freshness, cache hierarchy, performance and private-state preservation | `worker/quota-cache.ts`, packaged/R2 history fallback, recent main KV/R2 reconciliation work, release-safety tests and private route handling cover the core requirement. PR #81 removes avoidable cold D1 calendar reads through R2/static fallback. | IMPLEMENTED / MONITOR | Keep private/local state out of public caches and continue cache/date-boundary regression checks. |
| 9 | Canonicals, crawlable archives, sitemaps and measured 10k+ scaling | `scripts/generate-seo.mjs`, SEO intent/discovery tests, date prerendering and phase gates already provide discovery. PR #80 builds a >19k-entity candidate graph while preserving a much smaller indexable cohort; history/tool candidates are not automatically put in sitemaps. | IMPLEMENTED / SCALE-GATED | 10k–50k is route/data capacity, not an indexing target. Expand cohorts only after validation and indexing diagnostics; no blind cross-products. |
| 10 | Reversible release, regression gates and monitoring | PR/release workflows, `release:verify`, production release-safety tests, storage-binding guards and previous-artifact discipline already exist. | EXISTING | Keep each PR narrow. No PR in this program should combine framework migration, DB migration, route migration and cache changes. |

## Required implementation sequence

Only gaps that still require code should create PRs. Current required PRs are:

1. **PR #78 — Festival identity/occurrence route repair without D1 reads.**
2. **PR #80 — Canonical publication graph, history identities and 33-tool identity reconciliation.**
3. **PR #81 — R2 + packaged calendar shards before D1 fallback.**

No additional PR is justified solely to reach a numeric page/tool target. The four reconciled legacy tool identities need a separate implementation PR only if repository/product review confirms a distinct public task can be restored without duplicating an existing engine or exposing private state. History event pages likewise remain optional/source-gated rather than automatically generated.

## Canonical entity rules

The publication graph uses stable internal IDs independent of presentation state and supports these source families:

- `day`
- `calendar-year`
- `calendar-month`
- `festival`
- `festival-occurrence`
- `community`
- `history-day`
- `history-event`
- `tool`

Future `event` or `guide` entities are permitted only when real organizer/source evidence or a genuinely distinct reviewed task exists.

Each published entity needs: stable ID, type, canonical route, aliases only when truly equivalent, source/version references, coverage status, publication status, indexability decision, and dependencies/relations.

Equivalent presentation state is not a new public page. Personal inputs, notes, future letters, uploaded OCR documents, account tokens, saved results and arbitrary filter permutations are never public entities.

## Tool reconciliation decision

The original plan correctly states that 29 tool links were observed publicly while earlier project scope requested 33; the difference is a reconciliation ticket, not permission to invent names. Repository evidence resolves the identity gap as follows:

- **29** remain the verified canonical public tool set.
- **4** additional enabled/non-private source identities exist in the checked-in tool catalog: `tithi`, `diaspora`, `card`, `api`.
- `family` and `my-data` are explicitly private and are excluded from public-growth counts.
- `typingtools` is a hub, not a separate task identity.
- disabled `preetitounicode` / `unicodetopreeti` records are legacy directions of the unified Preeti converter, not extra canonical tools.

Therefore the graph may safely retain **33 source-backed identities**, but only 29 are currently approved public/indexable tools. The four candidates require distinct-task parity before promotion. This satisfies preservation/reconciliation without manufacturing duplicate public URLs.

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
