# Data behind the /nepal pages and /nepalmap

| File | What | Source and licence |
|---|---|---|
| `osm-admin.json` | Palika and ward centre points, areas, neighbouring wards, district headquarters | © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) |
| `osm-settlements.json` | Named cities, towns, villages, hamlets and neighbourhoods with palika and ward | © OpenStreetMap contributors, ODbL 1.0 |
| `osm-pois.json` | Named temples, gumbas, schools, health posts, peaks, lakes, offices and more | © OpenStreetMap contributors, ODbL 1.0 |
| `osm-report.json` | Coverage report of the last import | — |
| `vdc-wards.json` | Old VDC/municipality ward → new palika ward (2017 restructuring) | World Bank Nepal Poverty Team mapping, via [nepal-address-data](https://github.com/en-shushant/nepal-address-data), CC0 1.0 |

The `osm-*.json` files are a derivative database of OpenStreetMap and are themselves available under the
ODbL 1.0; pages built from them credit "© OpenStreetMap contributors".

Refresh: the **Nepal wards: OpenStreetMap import** workflow (`.github/workflows/nepal-wards-osm.yml`) runs
`scripts/explore/nepal/osm_wards.py` on the Geofabrik Nepal extract monthly and opens a pull request.
`vdc-wards.json` is rebuilt with `scripts/explore/nepal/vendor_vdc.py` (see its header).
