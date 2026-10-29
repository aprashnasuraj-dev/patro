# PR_READY.md

## 1. Summary

This WIP branch implements the safe, reversible foundation of the Nepal Map + Bali Calendar critical-path roadmap without changing `main`. It hardens geolocation/routing privacy, introduces privacy-safe telemetry contracts, shared provenance/status models, source-derived Nepal dataset manifests and source IDs, a flagged Web Worker search path, a flagged routing-provider/circuit-breaker layer, durable place-ID/correction/anomaly primitives, flagged Bali month/Rerainan/Wewaran improvements, disabled RFC 5545 feeds, URL-family SEO policy, accessibility tooling, and Phase 9–10 preparation docs. User-visible roadmap features default OFF; the only unconditional visible change is the strict privacy disclosure before precise geolocation and external route-coordinate transfer. The branch is **not merge-ready** because the required local runner could not execute in the current agent environment.

## 2. Scope by phase

| Phase | Status | Shipped on branch | Still required before phase gate |
|---|---|---|---|
| 0 Discovery | Completed as documentation | `docs/discovery/REPO_MAP.md`, `CURRENT_BASELINE.md`, provider/dependency risks, measured-vs-blocked baseline separation | Re-measure baseline on executable checkout |
| 1 Telemetry | **Partial** | Typed event vocabulary/envelope, forbidden-field sanitizer/validator, memory-only session ID, Noop/Console/Http sinks, same-origin HttpSink, sendBeacon/fetch-keepalive fallback, batching/drop controls, consent OFF default, report script, tests | Wire product events behind flag; choose sink/consent policy; collect real events; run report against real data; gate cannot currently answer country/task-success with real numbers |
| 2 Trust/provenance | **Partial** | Shared manifest/status model; JSON Schema; OSM + official Nyepi provenance records; map build manifest; source-derived OSM replication timestamp; privacy disclosures; SourceBadge; attribution register; flagged About-data surface | Complete manifest coverage for every published dataset/admin source; verify local-states-nepal revision/license chain; run schema/UI/privacy gates |
| 3 Nepal performance | **Partial** | Existing clustering/list preserved; deterministic bilingual search core; module worker `init/query/cancel/result/error`; worker path OFF; synchronous fallback; worker assets versioned; tests | Run structured-clone/mobile benchmarks; route autocomplete still uses synchronous search; no measured proof that worker beats baseline; transferables intentionally not claimed for mixed string/number rows |
| 4 Routing resilience | **Partial** | Provider abstraction; normalized errors; timeout; 1 req/s token bucket; circuit breaker/half-open; provider swap; FOSSGIS adapter; straight-line/external-nav fallback preserved; tests; rollout OFF | Human provider/spend decision; execute fault tests; route-safety warnings need real data; true road-network detour buckets/add-stop are not implemented (current Along-the-Way remains route proximity, not mislabeled as detour time) |
| 5 Durable Nepal data | **Partial** | Upstream typed OSM IDs preserved; persistent ULID mapping core; explicit mapping updater; builder fail-closed stable-ID wiring behind OFF flag; source-ID anomaly detection; correction state machine; identity tests | Generate/commit mapping only from a real current ingest; signed-distance-to-boundary ambiguity QA not implemented; category refresh cadence remains design-only; no bulk place pages |
| 6 Bali product | **Partial** | Month model/grid route OFF/noindex; Rerainan search OFF/noindex; Wewaran guide OFF/noindex; Wuku sequence links; source-status separation; Nyepi/Purnama/Pawukon badges; existing Otonan sunrise behavior preserved; tests | Execute correctness/a11y/regression gates; broaden source badges where needed; verify all month/search edge cases in real build; no Piodalan/Dewasa/Dauh Ayu live surfaces |
| 7 Repeat use | **Partial** | Disabled ICS renderer + feeds for major holidays, Purnama/Tilem, Otonan, selected Rerainan; stable UID/DTSTAMP/all-day DTSTART/SEQUENCE/escaping/folding; Otonan cache-query isolation; tests | Real third-party ICS parser validation; Nepal GPX/GeoJSON/KML exports not implemented; offline own-data caching not implemented; reminders remain deferred pending demand |
| 8 Discovery/a11y/SEO | **Partial** | Flagged Nepal visitor terminology guide; Indonesian-first Bali policy in research; URL-family indexability policy; built-page/sitemap/thin-page checks; WCAG 2.2 AA manual checklist; axe/Lighthouse scripts | Run automated/manual a11y; English bridge remains evidence-gated; run production SEO gate; no index expansion until cohort evidence |
| 9 API/embeds | Prepared only — as required | `docs/future/PHASE_09_API_EMBEDS.md`, OFF flags, licensing/design-partner gates | Do not build live until 3–5 serious design partners and licensing review |
| 10 Long-term moat | Prepared only — as required | `docs/future/PHASE_10_MOAT.md`, OFF flags, evidence gates, monetization guardrails | Do not build live without evidence/cultural source model |

## 3. How to verify

Required checkout sequence on a machine with repository/network access:

```bash
git checkout wip/roadmap-critical-path
git status --short
./scripts/verify.sh
```

The one-command gate runs, fail-fast:

1. `npm ci` and verifies `package-lock.json` is unchanged.
2. `npm run typecheck`
3. `npm run lint`
4. roadmap unit/contract tests
5. existing Nepal Explore tests
6. existing World Calendar tests
7. provenance schema validation
8. privacy assertions
9. production build
10. static-file budget
11. Phase 8 SEO policy
12. throttled mobile Playwright E2E
13. Lighthouse performance benchmark
14. axe + Lighthouse accessibility checks

Individual commands:

```bash
./scripts/e2e.sh
./scripts/bench.sh
./scripts/a11y.sh
npm run test:roadmap
npm run roadmap:phase1-report -- path/to/events.ndjson
```

Reference browser profile committed for E2E: 390×844 viewport, DPR 2, Pixel 5 UA, 4× CPU slowdown, 150 ms latency and throttled cellular throughput. Benchmark/a11y summaries are written under `docs/perf/`.

### Blocked verification

The current agent execution container has no executable repository checkout and cannot resolve GitHub hosts. Hosted CI is explicitly unavailable for this mission. The GitHub connector can read/write repository content but cannot execute npm/build/browser commands. Therefore **no required local pipeline command has actually been run in this environment**.

A blocked check is not a pass.

## 4. Verification evidence

Actual evidence available:

- Branch created from exact main SHA `b86a8268e88815fdf092ff432638fa0336d9d209`.
- At the pre-readiness audit, `main` still pointed to that exact SHA.
- WIP branch was 72 commits ahead / 0 behind / 61 files changed before final documentation commits.
- A static branch audit discovered a malformed `package.json` script edit containing literal `\\n`; it was corrected in `9f830eedc3d729d276bb1c9e8bb515ce980071f4`, and the corrected content was successfully parsed as JSON before commit.
- Verification scripts have executable Git modes.
- `docs/verification/RUN_LOG.md` records both blocked-runner audits.

Not available and therefore **not claimed**:

- test pass count
- test duration
- production build duration
- bundle delta
- Lighthouse performance scores
- a11y score
- E2E pass count
- reference-device interaction latency / heap / long-task data
- third-party ICS parser acceptance

## 5. Feature flags

All roadmap user-visible features default OFF. The privacy bugfix is deliberately not flag-gated.

| Flag | Default | Phase | Rollout requirement |
|---|---:|---:|---|
| `telemetry` | OFF | 1 | schema/privacy tests + approved sink/consent |
| `provenanceUi` | OFF | 2 | complete manifest coverage + UI/schema checks |
| `nepalSearchWorker` | OFF | 3 | search fixtures + measured mobile benchmark |
| `nepalRoutingProviderV2` | OFF | 4 | fault tests + provider decision |
| `nepalStablePlaceIds` | OFF | 5 | mapping generated from current ingest + stability checks |
| `baliMonthGrid` | OFF | 6 | calendar fixtures + a11y |
| `baliRerainanSearch` | OFF | 6 | ranking/query/noindex tests |
| `baliLearningGuides` | OFF | 6 | deterministic-content/a11y verification |
| `baliIcsFeeds` | OFF | 7 | RFC 5545 + third-party parser verification |
| `nepalVisitorMode` | OFF | 8 | copy/a11y verification |
| `seoPolicyEngine` | OFF | 8 | policy gate + cohort evidence before index expansion |
| `futureNepalApi` | OFF | 9 | licensing + 3–5 design partners |
| `futureEmbeds` | OFF | 9 | partner demand |
| `futureBaliCulturalSurfaces` | OFF | 10 | authoritative corpus + cultural review |

Nepal static-build environment toggles are documented in `.dev.vars.example` and default to `0`.

## 6. Data & provenance changes

Nepal:
- Compact rows preserve upstream `source_id` at the end of the existing schema without shifting prior indices.
- OSM ingest metadata (`generated`, replication `osm_timestamp`, source, licence) is retained into the map builder.
- `/data/nepalmap/v1/manifest.json` is generated with source, ODbL attribution, snapshot/build dates, confidence and correction route.
- Stable `place_id` is optional and only appended when `NEPALMAP_STABLE_IDS=1`; the build fails closed if a current persisted mapping is missing.
- Ordinary builds never mint stable IDs.
- `ATTRIBUTION.md` records OSM/ODbL and unresolved source obligations.

Bali:
- Source tier vocabulary is `official | published | calculated | provisional`.
- 2027 Nyepi has an official Kementerian Agama RI / Bimas Hindu provenance record.
- Published Purnama/Tilem remains distinct from calculated Pawukon.
- New month/feed data carries source status rather than flattening all facts into one authority level.

## 7. Privacy review

Confirmed in implementation design:
- Telemetry forbidden-field contract strips/rejects precise coordinates, bounding boxes, IP fields, user-agent strings, full referrer fields, raw queries/search text and addresses.
- Session ID is in-memory only and resets with the page/module lifecycle; no persistent cross-site identifier is introduced.
- Consent defaults OFF.
- HTTP telemetry sink only accepts same-origin endpoint paths.
- `Near me`, MapLibre's built-in geolocate control, and route-start “my location” all pass through a privacy disclosure before the OS location prompt.
- Route UI explicitly states A/B endpoints are sent to the external FOSSGIS routing service.
- Otonan feed query remains in the cache key so one birth-date-derived feed cannot reuse another query's cached response.

These assertions still require the local verification pipeline before merge.

## 8. Risk register

| Severity | Risk | Mitigation on branch | Residual exposure |
|---|---|---|---|
| Critical | No executable verification run | WIP-only branch, no PR, one-command runner committed, no fabricated results | Unknown compile/build/regression failures may remain |
| High | Public FOSSGIS route service is not a product SLA and has strict fair-use limits | Privacy disclosure, 1 req/s provider core, circuit breaker, fallback, provider abstraction OFF by default | Existing direct FOSSGIS path remains production default until verified/provider decision |
| High | Stable identity/admin confidence is incomplete | Preserve OSM IDs, mapping tool, fail-closed ULIDs, anomalies/corrections | Mapping not generated; signed distance-to-boundary QA not yet implemented |
| Medium | New Bali surfaces could encode source mistakes | OFF/noindex, deterministic engine reuse, source tiers, fixtures | Tests/build/a11y unexecuted; third-party ICS parser not run |
| Medium | Search worker could regress mobile due structured clone | OFF, sync fallback, deterministic worker core | No measured clone/latency/heap benchmark |
| Medium | Programmatic SEO expansion could create thin pages | Explicit URL-family policy, place pages nonindexable/not generated, sitemap cap | Policy gate has not run against a production build |

## 9. Decisions needed from human

1. **Routing provider / spend:** contracted provider vs self-hosted OSRM/Valhalla vs continued limited public-service use. Do not choose spend or operational commitment implicitly.
2. **Telemetry sink + consent policy:** approve whether/where first-party events are sent and the jurisdiction-specific consent behavior. No vendor is selected on branch.
3. **Dataset licensing/revision confirmation:** confirm the exact `local-states-nepal` administrative-data revision/license chain and any redistribution/share-alike obligations before provenance UI/API/export rollout.
4. **Bali cultural review:** nominate/approve a reviewer or authoritative corpus before any future interpretive Piodalan/Dewasa/Dauh Ayu work.
5. **Government-source reuse terms:** 2027 Nyepi factual date is sourced, but reuse terms for government source prose remain UNVERIFIED; the branch does not republish the source text.

Operational but not a policy decision: once a real checkout is available, run `scripts/explore/nepal/update-place-ids.mjs` against the current OSM ingest before enabling stable IDs.

## 10. UNVERIFIED list

- Full local build/test compatibility of all branch changes.
- Actual reference-device performance and structured-clone cost.
- Exact upstream administrative boundary revision used by the current Nepal build.
- Whether every current published Nepal category is fully represented by a provenance manifest.
- Route-surface/safety metadata quality; public OSRM does not provide the required semantic warnings directly.
- Road-network detour-time error bounds for Along-the-Way; no 10/30-minute claims are shipped.
- Third-party ICS parser compatibility.
- Search traffic / “global attention” magnitude by country/query because first-party GSC/analytics evidence was unavailable in this execution environment.
- Final production accessibility state until axe/Lighthouse/manual checks run.
- Any culturally disputed or interpretive Bali claims not already represented by deterministic/published/official sources.

## 11. Suggested PR title + description

**Suggested title**

`feat: roadmap critical path — phases 1–8 (runner-free, locally verified)`

Do **not** use that title/open a PR yet because the branch is not locally verified.

**Suggested body after verification turns green**

> Implements the AafnaiPatro Nepal Map + Bali Calendar critical-path foundation: privacy-safe telemetry/provenance, Nepal map search/routing/data hardening, Bali month/Rerainan/Wewaran and calendar-feed primitives, and accessibility/SEO policy. User-visible roadmap features remain flag-gated. See `PR_READY.md` and `docs/verification/RUN_LOG.md` for exact verification evidence, feature flags, residual risks and rollout decisions.

## 12. Commit range

Base SHA: `b86a8268e88815fdf092ff432638fa0336d9d209`

Integration branch: `wip/roadmap-critical-path`

Pre-`PR_READY.md` head: `fb7ef23994f5bfdc1cbc412185e9f251c9e2737d`.

Exact review expression after this document commit:

```bash
git log --oneline b86a8268e88815fdf092ff432638fa0336d9d209..wip/roadmap-critical-path
git diff --stat b86a8268e88815fdf092ff432638fa0336d9d209..wip/roadmap-critical-path
```

Pre-document commits, newest first:

- `fb7ef23994f5` docs(verification): append blocked pre-readiness audit
- `66507e0aa721` chore(bali): remove unused feed import
- `9f830eedc3d7` fix(roadmap): repair package.json script serialization
- `ef0d3164cf84` docs(config): document roadmap rollout environment flags
- `e70086707ff5` docs(roadmap): add attribution and redistribution register
- `fb410d297d67` docs(roadmap): keep feature-flag registry aligned
- `915ba905f8be` chore(roadmap): make local verification and data tools executable
- `e75fb73d2019` chore(roadmap): put SEO policy behind the single local verification gate
- `d294842bf1fa` feat(bali): add flagged Wewaran guide and Wuku learning links
- `e133f6502778` style(worldcal): make provenance tiers text-visible without color dependence
- `75ba9ca95d4d` chore(roadmap): register Bali learning-guide rollout flag
- `4b0e7a3930fb` chore(nepalmap): reserve flagged stable place-ID row index
- `667681f15a4d` feat(nepalmap): wire stable IDs and visitor guide behind hard-off flags
- `6ffca494d0e3` test(roadmap): cover telemetry flush window and same-origin transport
- `71afcd82252b` feat(roadmap): complete telemetry transport and batching contract
- `66555a613433` docs(a11y): add WCAG 2.2 AA manual roadmap checklist
- `b220e61c0593` test(seo): add URL-family and built-page policy gate
- `cf4cb4297179` feat(seo): codify roadmap URL-family indexability policy
- `39c9f32b7c70` chore(roadmap): include Bali ICS contract tests
- `fc2fd5b42e3b` test(bali): cover ICS format and source-status separation
- `6f749ed05d18` fix(bali): isolate Otonan feed cache by query
- `ccdc8c0127fe` feat(bali): route ICS feeds behind OFF flag
- `6e40fa314537` feat(bali): add disabled ICS feed builders and routes
- `8432f3a53206` feat(bali): add RFC 5545 calendar renderer
- `404b9f498533` chore(roadmap): include durable place-identity tests
- `7f3bd526faf1` test(nepalmap): cover stable identity, anomaly and correction contracts
- `a6321e6f2124` feat(nepalmap): add source-ID anomaly detection core
- `afd9f979cb52` feat(nepalmap): define correction workflow state machine
- `64b60c2a4151` feat(nepalmap): add explicit place-ID mapping update command
- `8b89648d4286` feat(nepalmap): add persistent ULID mapping core
- `874002d7cf7a` feat(nepalmap): add flagged human-readable data provenance
- `18e6fb6d3ffe` chore(roadmap): include search-worker core tests
- `783d5b2984fd` test(nepalmap): cover worker search normalization and ranking
- `8056c3923dbd` feat(nepalmap): move flagged primary search scans into a Web Worker
- `290f10ad00cc` feat(nepalmap): package disabled search-worker assets
- `acb1281433bf` feat(nepalmap): add cancellable search worker protocol
- `4e5572b4f937` feat(nepalmap): extract deterministic bilingual search core
- `f0729a7d33c1` chore(roadmap): include routing resilience tests
- `f34a2dda2ade` test(nepalmap): cover routing circuit and provider swap
- `4abd8323a66a` feat(nepalmap): integrate routing v2 behind OFF flag
- `e16ba8a259ff` feat(nepalmap): package routing v2 only when its flag is enabled
- `26a182c1426c` feat(nepalmap): add flagged resilient routing provider core
- `6aea318cfa94` test(nepalmap): assert source identity and manifest contracts
- `115c682e30aa` chore(nepalmap): reserve compact-row source identity index
- `ab57ad9e0791` feat(nepalmap): preserve upstream IDs and emit source-derived manifest
- `94af366dc733` feat(nepalmap): preserve OSM source metadata from ingest
- `c26f692523a5` chore(roadmap): include Bali phase 6 model tests
- `693198340eed` test(bali): cover month and rerainan roadmap models
- `b2b517967811` fix(bali): preserve rerainan search query in cache key
- `3a67e49dbd9c` feat(bali): add flagged month grid and rerainan discovery
- `51bde44a0740` test(roadmap): persist accessibility summary
- `202b6cb60613` perf(roadmap): persist benchmark summary
- `dd14a548c6d9` test(roadmap): cover critical Nepal Map and Bali journeys
- `17fd11624572` test(roadmap): define reference mobile browser profile
- `b83449e72298` test(roadmap): add axe and Lighthouse accessibility runner
- `cb2e1b5bd0f3` perf(roadmap): add pinned Lighthouse benchmark runner
- `b8e70de495c3` test(roadmap): add mobile throttled E2E runner
- `976df7d3afd2` chore(roadmap): add reusable local preview helper
- `22bad0f11458` chore(roadmap): add one-command local verification gate
- `b477e5421b8f` chore(roadmap): wire roadmap contract tests
- `f28a2d01f095` feat(roadmap): add phase 1 telemetry report
- `60e072b85c48` chore(roadmap): add privacy hard-gate assertions
- `b058aea8f44b` chore(roadmap): add provenance schema gate
- `4d0de6871455` test(roadmap): validate provenance manifests and badges
- `cb512469d12b` test(roadmap): enforce telemetry privacy contract
- `001d5d2f06bc` data(bali): register official Nyepi 2027 provenance
- `3bbeebd3c8a7` data(nepalmap): register OSM provenance manifest
- `acf4226966ae` feat(roadmap): define dataset manifest schema
- `1721291ecca9` feat(roadmap): add shared provenance status model
- `5abcd853e154` fix(roadmap): enforce full telemetry forbidden-field set
- `4eb825c1c4d0` feat(roadmap): add privacy-safe telemetry contract
- `625137085f73` docs(roadmap): record discovery baseline and phase research
- `e45553f62dc2` fix(nepalmap): disclose precise location and route privacy

The final commit that creates this file is intentionally not self-referential; use the symbolic range above for the complete branch.

## 13. Post-merge watchlist

First 48 hours after an eventual verified rollout:
- route request/success/failure and FOSSGIS throttle/error rate
- Nepal search start/result/zero-result and worker fallback/error
- map JS errors and mobile long tasks
- Bali date/month/Rerainan/Otonan task completion
- feed request/parse failure
- privacy assertion failures or unexpected telemetry payload keys
- sitemap/indexability changes and canonical collisions

First 2 weeks:
- country/language/device task-success cohorts
- repeat calendar subscription use
- source-correction volume and place-identity anomalies
- route provider unit cost and error rate
- search-worker performance vs synchronous baseline
- URL-family index bloat vs impressions/clicks

## 14. Readiness statement

**NOT READY**

Precisely missing:
1. `./scripts/verify.sh` has not executed in a real checkout.
2. Phase 1 product event wiring/real sink policy is not complete.
3. Phase 2 provenance coverage/admin-source revision is incomplete.
4. Phase 3 performance gate is unmeasured.
5. Phase 4 provider decision and true detour/safety semantics are incomplete.
6. Phase 5 boundary-ambiguity QA and real mapping generation are incomplete.
7. Phase 6 build/a11y/regression gates are unexecuted.
8. Phase 7 third-party ICS validation and Nepal export/offline pieces are incomplete.
9. Phase 8 automated/manual accessibility and production SEO gates are unexecuted.

Do not open or merge a PR from this branch yet.
