# AafnaiPatro Nepal routing — self-hosted Valhalla

This directory is the production-target routing stack for Nepal Map. The browser never calls this container directly. The flow is:

`browser → https://aafnaipatro.com/api/nepal/v1/route → authenticated HTTPS routing origin → Valhalla`.

## Pinned runtime

- Valhalla scripted image: **3.9.1**
- Manifest digest: `sha256:6238809f9dc3057743d70a20efd3911ec38e458bfa13a0601909b58f68dfd956`
- OSM input: `https://download.geofabrik.de/asia/nepal-latest.osm.pbf`
- Container port is bound to `127.0.0.1:8002`; do not expose it directly to the Internet.

The official scripted image supports `tile_urls`, automatic graph rebuilds when the PBF changes, admin/timezone databases and tar graph storage. The route API supports ordered locations plus `auto`, `bicycle` and `pedestrian` costing.

## Start

```bash
cd infra/nepal-routing
mkdir -p data
docker compose up -d
curl -fsS http://127.0.0.1:8002/status
```

First startup downloads the Nepal PBF and builds the graph. Keep `data/` on durable storage.

## HTTPS/auth boundary

Put an HTTPS reverse proxy or private tunnel in front of `127.0.0.1:8002`.

The reverse proxy **must**:
1. expose only the Valhalla HTTP service needed by the Worker;
2. require `Authorization: Bearer <NEPAL_ROUTING_TOKEN>`;
3. reject unauthenticated public requests;
4. apply a server-side request/body limit and rate limit;
5. preserve no route-coordinate access logs beyond the minimum operational retention needed.

Set Worker configuration:
- `NEPAL_ROUTING_ENABLED=1`
- `NEPAL_ROUTING_ORIGIN=https://<private-routing-host>`
- secret `NEPAL_ROUTING_TOKEN=<same gateway token>`

Set the Nepal Map build:
- `NEPALMAP_ROUTING_V2=1`
- `NEPALMAP_ROUTING_PROVIDER=valhalla-first-party`

The Worker only accepts 2–10 validated points inside broad Nepal bounds, converts `car|bike|foot` to Valhalla `auto|bicycle|pedestrian`, requests OSRM-compatible GeoJSON, and returns a normalized route.

## Data refresh

The scripted image tracks input changes. For a controlled refresh:

```bash
cd infra/nepal-routing
curl -fL https://download.geofabrik.de/asia/nepal-latest.osm.pbf -o data/nepal-latest.osm.pbf.new
mv data/nepal-latest.osm.pbf.new data/nepal-latest.osm.pbf
docker compose restart valhalla
curl -fsS http://127.0.0.1:8002/status
```

Do not promote a refreshed graph solely because the container starts. Run AafnaiPatro's route smoke set and compare reachability/duration anomalies first.

## Why Valhalla

Valhalla is open source, self-hostable, OSM-based, supports ordered multi-point routing and the three Nepal Map modes, and can emit OSRM-compatible GeoJSON. This removes the public FOSSGIS service from the high-traffic production path while preserving the existing UI and true detour engine.

Official references:
- https://valhalla.github.io/valhalla/api/route/api-reference/
- https://github.com/valhalla/valhalla/blob/master/docker/README.md
- https://github.com/valhalla/valhalla/pkgs/container/valhalla-scripted
