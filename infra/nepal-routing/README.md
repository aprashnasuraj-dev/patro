# AafnaiPatro Nepal routing — first-party Valhalla

Production flow:

`browser → https://aafnaipatro.com/api/nepal/v1/route → authenticated HTTPS gateway → Valhalla`.

The browser never receives the routing bearer token and never calls Valhalla or the gateway directly. The Cloudflare Worker remains the public policy boundary (Nepal bounds, 2–10 points, D1 rate limit, timeout, normalized response and dependency logging).

## Reproducible source and runtime

- Valhalla: `ghcr.io/valhalla/valhalla-scripted:3.9.1`, pinned to manifest digest `sha256:6238809f9dc3057743d70a20efd3911ec38e458bfa13a0601909b58f68dfd956`.
- OSM source: the dated Geofabrik Nepal file declared in `source-manifest.json`; **never `nepal-latest.osm.pbf` in a production release**.
- Current prepared snapshot: `nepal-261028.osm.pbf`, 414,755,998 bytes, containing OSM data through `2026-10-28T21:21:02Z` according to Geofabrik's Nepal index.
- Acquisition verifies the official Geofabrik MD5 plus byte length and records a locally computed SHA-256 in the release's `source-lock.json`.
- Gateway: Caddy 2.10.2 Alpine, pinned to multi-platform index digest `sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d`.

The Valhalla scripted image discovers local PBF files in `/custom_files`. No `tile_urls` network download is configured in Compose.

## Build a candidate release

Prerequisites: Docker Compose, curl, Python 3, md5sum and sha256sum.

```bash
cd infra/nepal-routing
./build-release.sh
```

The script:
1. downloads the dated PBF and its official MD5 into `data/releases/<snapshot>/`;
2. validates byte length + MD5 and writes `source-lock.json` with SHA-256;
3. builds a separate candidate Valhalla graph on loopback port 18002;
4. waits for `/status`;
5. runs the Terai/Kathmandu/hill/mountain/trek/multi-stop/detour fixture suite;
6. records source lock, generation time, release file sizes, status payload and route measurements under `reports/`;
7. stops the candidate container.

No candidate is promoted automatically.

## Promote and roll back

After reviewing the candidate report:

```bash
./promote-release.sh promote 2026-10-28
```

Promotion switches `data/current`, recreates the Valhalla service and requires loopback `/status` to recover. The former release is retained at `data/previous`. If health does not recover, the script switches back automatically.

Explicit rollback:

```bash
./promote-release.sh rollback
```

Do not delete the previous release until the new graph has passed production smoke traffic and the retained rollback window.

## HTTPS bearer gateway

Production start:

```bash
export NEPAL_ROUTING_HOST=route.internal.example
export NEPAL_ROUTING_TOKEN='long-random-secret'
export CADDY_ACME_EMAIL='ops@example.com'
docker compose --profile gateway -p aafnaipatro-nepal-routing up -d
```

Caddy obtains HTTPS for `NEPAL_ROUTING_HOST`, accepts only an exact `Authorization: Bearer <token>`, exposes only:
- `POST /route` → Valhalla `/route`
- `GET /healthz` → Valhalla `/status`

The raw Valhalla service is bound only to `127.0.0.1:8002`. No CORS header is added at the gateway. Caddy access logging is intentionally not enabled, so route bodies/coordinates are not retained there by default. Operational host/firewall logs still need a documented retention policy.

Worker configuration:

- `NEPAL_ROUTING_ENABLED=1`
- `NEPAL_ROUTING_ORIGIN=https://<NEPAL_ROUTING_HOST>`
- secret `NEPAL_ROUTING_TOKEN=<same token>`

Map build configuration:

- `NEPALMAP_ROUTING_V2=1`
- `NEPALMAP_ROUTING_PROVIDER=valhalla-first-party`

## Fixture and performance suite

`fixtures/routes.json` covers:
- Terai auto routing
- Kathmandu urban auto routing
- hill-road routing
- mountain-road routing
- Lukla–Namche pedestrian/trek routing
- ordered multi-stop routing
- an explicit via-point detour

Run against loopback Valhalla:

```bash
python3 verify_routes.py --base http://127.0.0.1:8002 --health-path /status --output reports/routes-manual.json
```

Run against the authenticated HTTPS gateway:

```bash
NEPAL_ROUTING_TOKEN=... python3 verify_routes.py \
  --base https://route.example.com --health-path /healthz --output reports/routes-gateway.json
```

Each fixture requires a valid OSRM-format GeoJSON route and stays under the fixture's 15-second request budget. The runner records measured latency/distance/duration; it contains **no invented expected travel times**.

## Resource planning envelope

These are capacity-starting assumptions, **not measured results**. Replace them with the candidate build report plus host metrics before production sizing.

| Stage | CPU | RAM | Durable disk | Rationale |
|---|---:|---:|---:|---|
| Candidate graph build | 4 vCPU | 8 GB | 20 GB free | Current PBF is ~0.415 GB; graph/admin/timezone/tar plus temporary build files require substantial headroom. |
| Initial serving | 2–4 vCPU | 4–8 GB | 20 GB | Start conservatively, then size from p95/p99 latency, concurrency and memory. |
| Rollback retention | same compute | + one prior graph release | keep current + previous | Fast rollback is more valuable than reclaiming a few GB early. |

Valhalla's own scripted-image documentation notes that `server_threads` controls both build and service threads and recommends lowering it if a build is killed. The default here is 2; raise only from measured build/service data.

## Update strategy

1. Review a new dated Geofabrik snapshot and update `source-manifest.json` in code review.
2. Build it into a new immutable `data/releases/<snapshot>` directory.
3. Compare route fixtures, source lock, graph size, build duration and any changed reachability.
4. Investigate failures or large route changes before promotion.
5. Promote only the reviewed release.
6. Keep the previous release and use `rollback` if production health/error metrics regress.
7. For higher-frequency updates later, add OSM diff ingestion only after deterministic replay and rollback have equivalent evidence; do not silently switch this dated-snapshot path to `latest`.

## Health

- Direct/private: `GET http://127.0.0.1:8002/status`
- Authenticated gateway: `GET https://<host>/healthz` with bearer token.

Valhalla's status response includes its version and tile-set modification information. Health only proves the service has loaded a graph; it does **not** prove Nepal route correctness, which is why promotion also requires the fixture suite.

## Remaining deployment evidence

The repository now contains the reproducible build/deploy path, but this agent environment has not executed Docker, downloaded the 414,755,998-byte PBF, built graph tiles, or run the fixture suite. Those results must be appended to `docs/verification/RUN_LOG.md` only after actual execution.
