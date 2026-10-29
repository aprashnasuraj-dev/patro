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

The current Nepal build comments identify `local-states-nepal` for local administrative levels under MIT. Exact package/repository revision and any additional upstream boundary sources must be recorded in the generated dataset manifest before the Phase 2 provenance UI can be enabled globally.

Status: **UNVERIFIED revision**.

## Map renderer / basemap / routing

- MapLibre GL JS: renderer; upstream license applies.
- OpenFreeMap: map style/tiles; service terms and required attribution apply.
- FOSSGIS public OSRM: current routing service. It is a public fair-use service, not a contracted AafnaiPatro SLA. Route endpoint coordinates are disclosed before use.

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
