# Aafnai Patro 10-Step Implementation Status

Updated: 2026-10-06

This file maps the expanded 10-step enhancement plan to the repository as it exists now. The rule is additive preservation: existing routes, tool engines, six community suites, private notes/letters, auth/storage keys, and data contracts are not replaced merely to increase page count.

## Runtime/storage constraint

D1 read quota is currently constrained. New public-reference work must **not add new direct D1 read dependencies**. Use, in order of suitability:

1. deterministic build/static assets for immutable archive documents;
2. existing Cache API/KV for low-cost hot/reference cache state;
3. `ARCHIVE` R2 for durable public-reference/history snapshots and packaged fallback data;
4. D1 only where an existing mutable/runtime contract still requires it and a cached/static path is not available.

The repository already contains the Cache → KV/R2 → connected-runtime mechanism in `worker/quota-cache.ts`, and history has a packaged/R2 fallback path. Do not duplicate those systems.

## Step-by-step status

| Step | Requirement | Repository evidence/current state | Status | Required change |
|---|---|---|---|---|
| 1 | Inventory, preservation contract, stable identity/URL semantics | `docs/INVENTORY.md`, migration inventory checks, release-safety tests and current route registries already protect the working product. Current date canonical is `/date/YYYY-MM-DD`; do not mass-migrate it just to match a design example. | PARTIAL / EXISTING | Add a cross-family canonical entity/publication registry; no destructive URL migration. |
| 2 | Permanent useful date pages from validated data | `scripts/calendar-snapshot.mjs`, `lib/patro.mjs`, `scripts/prerender-days-seo.mjs`, `seo-config.mjs` and phase-gate tests already produce factual date pages from the validated archive. | EXISTING, SCALE-GATED | Keep wider years non-indexed until the existing independent accuracy gate passes. Do not create hand-written date articles. |
| 3 | Festival identity + annual occurrence + real-event separation | Date pages already link to festival-year routes; dynamic festival rendering exists, but connected legacy redirects make those routes ineffective and the dynamic path would consume D1. | REQUIRED | PR #78 adds deterministic festival identity/year pages from validated holiday data and serves them as static assets before the legacy redirect. Separate organizer-event pages remain source-gated. |
| 4 | Six community calendar hubs/archives without flattening native rules | The six suites are registered (`lhosar`, `tharu`, `mithila`, `kirat`, `hijri`, `chakra`) and existing community functionality is covered by migration/readiness tests. | EXISTING / DATA-GATED | Do not synthesize native year/month/day mappings by fixed offsets. Expand archive depth only from each suite's real source coverage. |
| 5 | 33 tools as task systems, with one canonical working tool per identity | Current verified public inventory is 29 canonical tool identities; tool engines, tool shell, SEO intents and behavior tests already exist. | PARTIAL / BLOCKED BY IDENTITY GAP | Reconcile the four missing tool identities from product/source evidence. Do **not** invent four names just to reach 33. Guides/reference pages may be added only where they solve a distinct task. |
| 6 | Today in History + permanent archive + contextual workflows | Main now includes packaged/R2 On This Day fallback and recurring month/day archive work. Existing date/tool links provide workflow connections. | SUBSTANTIALLY EXISTING | Historical-event identity pages require source-backed event records; add only when the current history dataset provides stable IDs/evidence. |
| 7 | Deterministic read-only publication pipeline | Build-time SEO/day generation, shared source adapters, validated local archive and deterministic templates already exist. | PARTIAL | Add one canonical publication/entity manifest over the existing generators; do not create a second content DB. |
| 8 | Midnight freshness, cache hierarchy, performance and private-state preservation | `worker/quota-cache.ts`, calendar/history fast paths, R2 history fallback, release-safety tests and existing private route handling cover most of this. | EXISTING / MONITOR | With D1 quota constrained, prefer static/R2/KV for new public reads. Do not clear localStorage/IndexedDB or move private state into public cache objects. |
| 9 | Canonicals, crawlable archives, sitemaps and measured 10k+ scaling | `scripts/generate-seo.mjs`, SEO intent/discovery tests, date prerendering and phase gates already provide the discovery framework. | EXISTING / SCALE-GATED | 10k–50k is capacity, not an indexing target. Expand cohorts only after date/source validation and indexing diagnostics; no blind cross-product generation. |
| 10 | Reversible release, regression gates and monitoring | PR/release workflows, `release:verify`, production release safety tests and previous-artifact discipline already exist. | EXISTING | Keep each new PR narrow. No PR in this program should combine framework migration, DB migration, route migration and cache changes. |

## Required implementation sequence

Only gaps that still require code should create PRs:

1. **Festival identity/occurrence route repair without D1 reads** — PR #78.
2. **Canonical publication/entity graph + validation** — required, additive, generated from existing source registries/datasets.
3. **Tool inventory reconciliation** — blocked until the missing four identities are proven from product/source evidence; no invented tools.
4. **Optional event/history entity expansion** — only when stable source IDs and rights/evidence exist.

Everything else should be treated as preservation, verification, or scale-gate work rather than rewritten.

## Canonical entity rules

The publication graph must use stable internal IDs independent of presentation URLs and should minimally support these types:

- `day`
- `calendar-year`
- `calendar-month`
- `festival`
- `festival-occurrence`
- `event` (only verified organizer/scheduled events)
- `community`
- `history-day`
- `history-event` (only where stable source identity exists)
- `tool`
- `guide`

Each published entity needs: stable ID, type, canonical route, aliases if truly equivalent, source/version references, coverage status, publication status, indexability decision, and dependencies/relations.

Equivalent presentation state is not a new entity. Personal inputs, notes, future letters, uploaded OCR documents, account tokens, saved results and arbitrary filter permutations are never public entities.

## Scale policy

The architecture may safely support 10,000–50,000 routable documents, but route capacity and index eligibility are separate.

- Core validated dates may be routable from shared data/templates.
- Current independently validated/indexed cohorts remain the indexable subset.
- Community daily cross-products are not generated merely to increase count.
- Search aliases remain aliases, not cloned pages.
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
- new public traffic creates an avoidable D1-read dependency while static/R2/KV coverage is available.
