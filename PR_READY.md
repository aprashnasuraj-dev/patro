# PR readiness — Nepal Map + Bali Calendar roadmap

## Status

**READY FOR FINAL PR AFTER THIS DOCUMENTATION COMMIT PASSES THE SAME-HEAD FINAL VERIFICATION WORKFLOW.**

The implementation and runtime evidence are now real, not inferred. The branch is mergeable as a reversible foundation because Nepal rollout switches remain OFF. This does **not** mean every Nepal feature should be enabled immediately.

Prepared from final integration head `2aac57b9556ac2582bc5c105295714d736f6d331`.

- `main`: `b86a8268e88815fdf092ff432638fa0336d9d209`
- Final integration: 273 commits ahead / 0 behind `main` before this documentation commit.
- No direct writes were made to `main`.
- Internal Bali integration PR #193 was merged only into the final WIP integration branch.

## What is complete

### Nepal Map data and QA

Fresh generation was executed against pinned Geofabrik input `nepal-261028.osm.pbf`.

- SHA-256: `12a5e049ee7f4bd42ccb3491e418bb03a539ba0fa8e5ef03a22ea1aa48006038`
- 750 / 753 local levels matched to OSM boundaries.
- 6,715 / 6,743 wards have an OSM boundary.
- 732 / 753 palikas are complete in the current boundary ingest.
- Generated compact map: 254 pages, 74,219 places, 13 layers.
- PMTiles places and roads archives generated with tippecanoe v2.79.0.

Two-dataset stable-place-ID persistence:

- Retained source IDs: **74,115**
- New source IDs: **104**
- Changed persistent IDs: **0**
- Missing persistent IDs: **0**
- Result: **PASS**
- Review queue produced: 6 disappeared objects, 136 probable duplicates, 1 bulk-addition cluster.

Boundary-confidence triage:

- Rows: 74,219
- High: 8,098
- Medium: 34,579
- Low: 31,383
- Unverified: 159
- Within 250 m of a boundary: 31,576
- Within 1 km: 65,658

These figures are a review queue, not a claim that near-boundary assignments are wrong.

Road metadata evidence:

- OSM road/trail features: **615,252**
- Approximate extracted length: **290,579.98 km**
- High metadata confidence: 0.27% of features
- Medium: 13.16%
- Low: 86.57%
- Surface tag coverage: 11.82% of features / 19.06% of extracted km.

Sparse road metadata is explicitly treated as “unknown”, never as evidence that a condition is absent.

Route-to-road matcher:

- Actual fallback-provider routes: 6 / 6 successful
- Eligible route steps: 52
- Spatial + name/ref matched steps: 52
- Weighted match rate: **100%**

This validates the matcher against the fallback provider; it does not substitute for the separate first-party Valhalla runtime evidence below.

Copernicus GLO-30 elevation sample vs CAAN AIP references:

- Samples: 4
- Mean absolute error: **6.798 m**
- Maximum absolute error: **12.66 m**
- RMSE: **8.0 m**
- Samples over 100 m error: **0**

Entity-page cohort:

- Pages audited: **237**
- Valid Place + GeoCoordinates structured data: 237
- Pages under 80 words: 0
- OSM source present: 237
- Correction link present: 237
- Duplicate title / description / H1 groups: 0 / 0 / 0

Exports:

- GeoJSON parsed successfully with GDAL/OGR.
- GPX parsed successfully with GDAL/OGR and validated as XML.
- KML parsed successfully with GDAL/OGR and validated as XML.

Offline / PMTiles browser evidence:

- Throttled PMTiles-vs-compact-JSON transport check: PASS.
- District pack save -> disconnect -> reopen offline: PASS.
- District pack revision update/replacement: PASS.
- Browser evidence: 2 / 2 tests passed.

BIPAD resilience:

- Success, partial-failure, stale retrieval-age, timeout, and total-upstream-failure contracts are covered.
- UI distinguishes local resilience data from live BIPAD availability and displays degraded/freshness state.
- Worker timeout remains bounded.
- Nepal emergency rollout remains OFF.

### First-party Nepal routing

Pinned Valhalla candidate and authenticated gateway were actually built and exercised in GitHub Actions.

Successful runtime run: **40855074802** at `2aac57b9556ac2582bc5c105295714d736f6d331`.

- Valhalla version: **3.9.1**
- Direct geographically diverse fixture suite: PASS, failure_count 0.
- Gateway fixture suite: PASS, failure_count 0.
- Gateway authorized health: **200**
- Gateway unauthenticated health: **401**
- Authenticated unknown path: **404**
- Health response: 200
- Gateway has no browser CORS grant.
- Raw Valhalla remains loopback-only in the deployment contract.
- Candidate build remains separate from explicit promotion/rollback.

Example gateway-route latencies in the successful run:

- Terai Biratnagar-Itahari: 55.7 ms
- Kathmandu urban: 19.6 ms
- Kathmandu-Dhulikhel hill route: 26.0 ms
- Pokhara-Jomsom mountain route: 25.2 ms

These are CI-run observations, not production SLO guarantees.

### Bali Calendar

Bali Calendar now has a distinct Bali-first visual experience and installable PWA surface at `/bali-calendar`:

- Dedicated manifest identity and start URL.
- In-page, user-triggered “Install Bali Calendar” action.
- Standalone display mode.
- Traditional Bali-inspired visual shell, Wuku/Pawukon centerpiece, feature cards and AafnaiPatro tool launcher.
- One shared root service worker; no competing service-worker scope.
- Bali assets are warmed for offline reopening.
- Source default remains fail-closed; runtime rollout is controlled by `BALI_PWA`.

The dedicated Bali PWA production gate is green, including typecheck, Bali/Wariga/annual/ICS/PWA tests, manifest/runtime checks and full production build.

Official-source corpus was expanded only where recurrence/date evidence is explicit. Ambiguous rows remain unresolved. The 2026 annual Sasih mapping remains **fail-closed**; individual official anchors do not unlock arbitrary projections.

`BALI_PWA=1` is enabled in reviewed preview and production configuration after the dedicated gate passed.

## Full application verification

Successful final full-verification run: **40853748380**.

The one-command roadmap verification reached `ROADMAP_VERIFY_GREEN` and included:

- TypeScript / lint / syntax gates: PASS
- Roadmap contract/unit tests: PASS
- Nepal Explore tests: **24 passed**
- World Calendar tests: **22 passed**
- Provenance schema: PASS
- Privacy assertions: PASS
- Nepal/Bali enhancement contracts: PASS
- Production build: PASS
- Static-file budget: **13,498 / 19,500**
- SEO policy: PASS
- E2E: **3 / 3 passed**
- axe: **0 violations** on Nepal Map and Bali Calendar
- Lighthouse accessibility: Nepal Map **0.97**, Bali Calendar **1.00**

Measured Lighthouse performance using 4x CPU slowdown / slow-4G simulation:

| Route | Performance | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|
| Nepal Map | **0.44** | 1.38 s | 6.67 s | 5.88 s | 0 |
| Bali Calendar | **0.95** | 0.77 s | 2.57 s | 0.16 s | 0 |

The Nepal Map performance score is a significant optimization backlog item and must not be hidden by the successful correctness gates.

The latest final-integration code change after that green run is the Caddy auth-order fix. Its dedicated first-party Valhalla runtime gate is green. A same-head final full verification is required after this readiness-document commit before opening the `main` PR.

## Rollout state

Current Worker rollout values:

- `BALI_PWA=1`
- `NEPAL_API_ENABLED=0`
- `NEPAL_CORRECTIONS_ENABLED=0`
- `NEPAL_EMERGENCY_ENABLED=0`
- `NEPAL_ROUTING_ENABLED=0`

Nepal static/product roadmap flags also remain OFF unless their individual rollout condition is deliberately approved. Merging this branch does not automatically turn on first-party routing, BIPAD, corrections or partner APIs.

## Residual risks / deliberate non-claims

1. **Nepal Map performance needs work.** Lighthouse performance 0.44, LCP ~6.67 s and TBT ~5.88 s under the reference throttled profile are not acceptable as a “performance complete” claim.
2. **Boundary review remains large.** Near-boundary confidence is intentionally conservative; the queue is not resolved ground truth.
3. **Road semantics are sparse in OSM.** Most extracted road features have low semantic-metadata confidence.
4. **OSM change review remains human work.** Six disappeared objects and 136 probable-duplicate candidates were surfaced, not auto-resolved.
5. **Automated accessibility is not manual accessibility.** axe found 0 violations and Lighthouse scores are strong, but manual keyboard/screen-reader/cultural UX review remains valuable.
6. **2026 Bali annual projection remains fail-closed.** Only explicit authoritative anchors are used.
7. **Apple Calendar / Google Calendar / Outlook UI-level subscription testing is not claimed.** RFC/ICS contract tests are green; external-app UI behavior still deserves manual spot checks before promoting calendar subscription UX broadly.
8. **Dependency reproducibility is weaker without a committed package-lock.** Verification records this explicitly rather than pretending lockfile reproducibility.
9. Test-environment npm audit output reported dependency findings; they require normal dependency triage and are not represented as a completed security audit.

## PR decision

After the documentation commit itself receives a green final full-verification result and `main` is re-fetched as 0 commits ahead of this branch, the branch is suitable for a normal review PR to `main`.

Suggested title:

**feat: verified Nepal Map hardening and Bali Calendar PWA**

Suggested PR summary:

> Delivers the verified Nepal Map + Bali Calendar roadmap foundation: reproducible Nepal OSM/PMTiles generation, durable place IDs and anomaly review, boundary/road/elevation evidence, offline/export/entity-page QA, first-party Valhalla deployment with authenticated gateway, BIPAD degraded-state handling, and a source-backed visually rich installable Bali Calendar PWA. Nepal runtime features remain rollout-gated; Bali PWA is enabled after its dedicated production gate passed. See PR_READY.md and docs/verification/RUN_LOG.md for measured evidence and residual risks.
