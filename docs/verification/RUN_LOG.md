# Local verification run log

Append-only. A run is green only when every required command actually executes and exits 0.

## 2026-10-29 — agent environment discovery

Status: **BLOCKED / NOT A VERIFICATION RUN**

- Connected GitHub repository API: available.
- Executable local checkout: unavailable.
- Attempted network access from the execution container to GitHub failed DNS resolution (`Could not resolve host: github.com`).
- Hosted CI is explicitly unavailable for this mission.
- Therefore `npm ci`, typecheck, tests, production build, E2E, benchmarks and accessibility checks were **not executed**.
- No pass counts, durations, scores or benchmark values are claimed.
- Work is restricted to `wip/roadmap-critical-path` until a real local runner executes the committed verification scripts.

## 2026-10-29 — pre-readiness branch audit

Status: **BLOCKED / NOT A VERIFICATION RUN**

- Branch parent/base remains `b86a8268e88815fdf092ff432638fa0336d9d209`; current `main` is still that exact SHA.
- WIP head at audit start: `66507e0aa72105ab1ab1f63060dffe32c1159535`.
- GitHub compare: branch was 72 commits ahead, 0 behind, 61 files changed at that point.
- `package.json` was structurally inspected through the GitHub connection and a literal-`\\n` serialization defect introduced by an earlier connector edit was found and corrected in `9f830eedc3d729d276bb1c9e8bb515ce980071f4`.
- Shell verification/data-update scripts were committed executable.
- `scripts/verify.sh` now includes the Phase 8 SEO policy gate.
- The execution container still cannot resolve GitHub hosts and has no executable checkout. Therefore npm install/typecheck/tests/build/browser checks remain **NOT RUN**.
- No benchmark, a11y score, test count, build time or bundle delta is claimed.
- Because the required local runner cannot execute, the branch remains `wip/roadmap-critical-path` and no draft PR is opened.

## 2026-10-29 — Nepal generated-data evidence

Status: **PASS**

Workflow run: `40851649200`  
Successful job: `nepal-generated-evidence`

Executed against pinned Geofabrik Nepal input `nepal-261028.osm.pbf` with SHA-256 `12a5e049ee7f4bd42ccb3491e418bb03a539ba0fa8e5ef03a22ea1aa48006038`.

Key results:

- OSM ingest: 750/753 local levels matched; 6,715/6,743 wards bounded; 732/753 palikas complete.
- Stable-ID two-dataset persistence: 74,115 retained, 104 new, **0 changed, 0 missing**.
- OSM anomaly queue: 6 disappeared, 104 added, 136 probable duplicates, 1 bulk-addition cluster.
- Compact Nepal map: 254 pages, 74,219 places, 13 layers.
- PMTiles: places + roads generated with tippecanoe v2.79.0.
- Boundary review report: 74,219 rows; 8,098 high / 34,579 medium / 31,383 low / 159 unverified.
- Road metadata report: 615,252 features, ~290,579.98 km extracted.
- Route-step matcher: 6/6 routes successful; 52/52 eligible steps matched.
- Copernicus GLO-30 vs CAAN: MAE 6.798 m; max 12.66 m; RMSE 8.0 m.
- Entity cohort: 237/237 schema-valid, 0 thin pages, 0 duplicate title/description/H1 groups.
- GPX/KML/GeoJSON fixtures parsed successfully by GDAL/OGR; GPX/KML XML validation passed.
- Browser evidence: PMTiles throttled transport PASS; offline save/disconnect/reopen/revision-upgrade PASS; 2/2 browser tests passed.

Interpretation limits retained:

- The 68.9 metadata-quality score is not a real-world map-completeness score.
- Near-boundary points are review candidates, not presumed errors.
- Sparse OSM road tags are unknown metadata, not evidence of absent hazards/conditions.

## 2026-10-29 — Bali Calendar PWA and source corpus

Status: **PASS**

Dedicated Bali production gate completed green after the Bali-native visual/PWA implementation and official-source corpus expansion.

Verified:

- TypeScript gate.
- Bali annual/source tests.
- Wariga tests.
- ICS contract tests.
- Dedicated Bali PWA tests.
- PWA JavaScript syntax.
- Manifest identity/start URL/scope.
- Full production build.
- Built `/bali-calendar/manifest.webmanifest` and `/bali-calendar/pwa.js` delivery contract.
- Shared root service worker warms Bali PWA assets.

Rollout:

- Source default remains fail-closed.
- Reviewed runtime configuration uses `BALI_PWA=1`.
- 2026 annual Sasih projection remains fail-closed; isolated authoritative anchors are not extrapolated into a complete calendar.

## 2026-10-29 — final full application verification

Status: **PASS**

Workflow run: `40853748380`  
Head: `5421a2ddd893e6f4d46973969efe9923cba34d76`

The one-command roadmap gate completed with `ROADMAP_VERIFY_GREEN`.

Observed results:

- Nepal Explore: 24 tests passed.
- World Calendar: 22 tests passed.
- Provenance schema: PASS.
- Privacy assertions: PASS.
- Enhancement contracts: PASS.
- JavaScript/Python syntax: PASS.
- Valhalla static contract: PASS.
- Production build: PASS.
- Production build duration reported by gate: 93 s.
- Static file budget: 13,498 / 19,500.
- SEO policy: PASS.
- E2E: 3/3 passed.
- axe: 0 violations on Nepal Map and Bali Calendar.
- Lighthouse accessibility: Nepal Map 0.97; Bali Calendar 1.00.
- Lighthouse performance, 4x CPU + slow-4G:
  - Nepal Map: 0.44; FCP 1.38 s; LCP 6.67 s; TBT 5.88 s; CLS 0.
  - Bali Calendar: 0.95; FCP 0.77 s; LCP 2.57 s; TBT 0.16 s; CLS 0.

The Nepal Map performance numbers are retained as a real optimization backlog, not reclassified as a pass-quality score.

## 2026-10-29 — first-party Valhalla runtime and authenticated gateway

Status: **PASS**

Workflow run: `40855074802`  
Head: `2aac57b9556ac2582bc5c105295714d736f6d331`  
Artifact: `nepal-valhalla-runtime-evidence` (artifact ID `12888439437`)

Executed:

- Pinned Nepal OSM source verification.
- Valhalla candidate build.
- Direct route/multistop/detour fixture suite.
- Authenticated Caddy gateway startup.
- Gateway health/auth policy checks.
- Route fixtures through the gateway.
- Runtime evidence artifact capture.

Observed gateway policy:

- Authorized `/healthz`: 200.
- Unauthenticated `/healthz`: 401.
- Authenticated unknown path: 404.

Valhalla:

- Version 3.9.1.
- Health: 200.
- Fixture failure_count: 0.
- Example gateway latencies:
  - Terai: 55.7 ms
  - Kathmandu urban: 19.6 ms
  - Kathmandu-Dhulikhel: 26.0 ms
  - Pokhara-Jomsom: 25.2 ms

These CI observations are evidence that the deployment path works; they are not a production SLO.

## 2026-10-29 — final readiness documentation integration

Status: **PENDING SAME-HEAD FINAL VERIFICATION**

Readiness documentation was rewritten from measured CI/runtime evidence on a continuation branch based on final-integration head `2aac57b9556ac2582bc5c105295714d736f6d331`.

Before opening a PR to `main`:

1. Fast-forward the final-integration branch to the documentation commit.
2. Require the final full-verification workflow to pass on that documentation-integrated head.
3. Re-fetch `main` and confirm final integration remains 0 behind.
4. Open the review PR; do not merge directly from automation.

