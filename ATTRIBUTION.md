# Attribution

AafnaiPatro combines original software with third-party data/services. This file records the roadmap-critical dependencies that require visible attribution or licensing review. It does not replace the upstream license text.

## Nepal Map data

**OpenStreetMap contributors**
- Use: Nepal places/POIs and routing-source data.
- Attribution: © OpenStreetMap contributors.
- License: Open Database License (ODbL) 1.0.
- Source / copyright: https://www.openstreetmap.org/copyright
- License: https://opendatacommons.org/licenses/odbl/1-0/
- Product attribution is already shown in the MapLibre attribution control.
- Any future GeoJSON/KML/GPX export containing OSM-derived place data must carry this attribution and applicable ODbL notices before that export is enabled.

## Nepal administrative data

**local-states-nepal**
- Use: province, district and local-level identifiers/names/ward counts used by the Nepal explore/map architecture.
- License: MIT.
- Pinned release: `v2.1.0`, upstream commit `035cb3d2ce2420ad04d7aac1d0ce4d08960c57f0`.
- Source: https://github.com/sagautam5/local-states-nepal/tree/v2.1.0
- Verification: all six vendored provinces/districts/municipalities English + Nepali JSON files are byte-for-byte identical to the upstream v2.1.0 blobs.

Status: **VERIFIED revision**.

## Map renderer / basemap / routing / elevation

- MapLibre GL JS 4.7.1 CSP build: renderer; BSD-3-Clause, vendored same-origin for the strict-CSP rollout.
- PMTiles 4.5.0: vector archive protocol; BSD-3-Clause, vendored same-origin for the POC.
- OpenFreeMap: map style/tiles; service terms and required attribution apply.
- **Production routing target:** self-hosted Valhalla 3.9.1 (MIT), built from the Geofabrik Nepal OSM extract. Browser coordinates go to AafnaiPatro's same-origin route endpoint; the Worker authenticates to the private routing origin.
- FOSSGIS public OSRM remains an explicit development/fallback integration only and is not the intended high-traffic production dependency.
- **Terrain source:** Copernicus DEM GLO-30 (30 m DSM), DOI 10.5270/ESA-c5d3d65. Derived Terrain-RGB output must retain: “produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved” plus the licence liability notice emitted by the terrain build.

## Bali Calendar sources

Deterministic Pawukon calculations are implemented from the documented Reingold–Dershowitz model and protected by regression fixtures.

Year-specific Nyepi, Purnama, Tilem and other published-calendar facts retain their source/status in code or provenance manifests. Source text is not copied wholesale into the product.

For 2027 Nyepi, the roadmap provenance record references Kementerian Agama RI / Bimas Hindu. Reuse terms for government source text remain **UNVERIFIED**; AafnaiPatro stores the factual date plus citation rather than republishing source prose.

## Rule for future exports and APIs

No export, API or embed may strip attribution from OSM-derived data. Before any new third-party dataset is exposed, add:
1. source name and canonical URL,
2. license and license URL,
3. required attribution text,
4. share-alike/redistribution obligations,
5. source snapshot/revision,
6. correction route.
