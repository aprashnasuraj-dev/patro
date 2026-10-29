# Trusted source hierarchy — Nepal Map + Bali Calendar

Last reviewed: 2026-10-29

This file records which external evidence AafnaiPatro is allowed to use for roadmap surfaces. A source being listed does **not** make every statement from it canonical. Every derived dataset still carries its own source/date/status.

## Nepal Map

### Administrative and place data

1. OpenStreetMap / Geofabrik Nepal extract — roads, POIs, settlements and OSM administrative polygons. ODbL attribution/redistribution obligations apply.
2. Nepal Survey Department / National Geoportal — authoritative Nepal geospatial reference and validation where an applicable public dataset exists.
3. Existing local-states-nepal snapshot — local-level identifiers/names used by the current explore architecture; retain exact pinned revision/license in the dataset manifest.

### Elevation

**Preferred production source: Copernicus DEM GLO-30.**

Official Copernicus documentation describes GLO-30 as a 30 m global Digital Surface Model, provides a free licence for the general public, DOI 10.5270/ESA-c5d3d65, and requires source attribution on redistributed/adapted products.

Required adapted-product notice:

> produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved

Sources:
- https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf
- https://registry.opendata.aws/copernicus-dem/

Operational note: the public AWS GLO-30 COG collection is preferred for reproducible build input. AafnaiPatro must host/serve its derived terrain tiles from the same origin rather than depending on the Copernicus view service.

### Routing

**Preferred production target: self-hosted Valhalla built from the same Nepal OSM extract family.**

Valhalla is MIT-licensed and its official project supports car, bicycle and pedestrian routing, multi-point routes, matrix, isochrones, map matching and elevation. The project recommends its maintained Docker images for self-hosting.

Sources:
- https://github.com/valhalla/valhalla
- https://github.com/valhalla/valhalla/blob/master/docker/README.md
- https://valhalla.github.io/valhalla/api/route/api-reference/
- https://valhalla.github.io/valhalla/contributing/data/data-sources/

Public FOSSGIS routing remains a development/fallback integration only. It is not the intended high-traffic production dependency.

### Emergency/resilience

BIPAD is the preferred official live-disaster source. AafnaiPatro's durable resilience layer remains local OSM hospitals/police/airports so BIPAD failure cannot remove basic emergency context.

## Bali Calendar

### Authority tiers

1. **Official annual/religious determination:** Kementerian Agama / Bimas Hindu, Bali Provincial Government, SKHDN/TIKA process, PHDI/SKHDN decisions where published.
2. **Official local-institution records:** Bali government agencies, Kemenag district offices, government legal/Awig-Awig records, official Desa Adat profiles.
3. **Government educational reference:** Indonesian Ministry of Education/Kemdikbud Hindu education material for Padewasan/Dauh definitions and tables.
4. **Peer-reviewed academic algorithm/reference:** Udayana and other scholarly Wariga research. Academic algorithms are marked calculated/reference, not re-labelled as official TIKA.
5. **Published calendar tables:** annual published Purnama/Tilem/Sasih facts, source/date recorded.
6. Commercial or community calendars may be used only as cross-checks, never as the sole authoritative source for a high-confidence religious rule.

### TIKA / Dewasa Ayu

Bimas Hindu records the 2026 TIKA preparation through Pasamuhan Alit SKHDN at the Bali Governor's office, involving Sulinggih, SKHDN, Bali government, Majelis Desa Adat and lontar observers. The article explicitly says TIKA/Dewasa Ayu determination is not merely a technical calendar calculation.

Source:
- https://bimashindu.kemenag.go.id/berita-daerah/jaga-kesucian-dharma-dan-kearifan-leluhur-kanwil-kemenag-bali-hadiri-pasamuhan-alit-skhdn-penyusunan-tika-2026-uTZu2

Therefore AafnaiPatro separates deterministic Pawukon/Wewaran calculation, source-backed annual Sasih/Purnama/Tilem/TIKA facts, source-transparent Padewasan reference rules, and local religious judgement.

### Piodalan

A Piodalan entry may be added only when a named temple/place has an official or government-published recurrence rule or a source-backed occurrence that can be represented without guessing.

Initial source-backed examples:
- Pura Luhur Pucak Padang Dawa — Buda Kliwon Pahang:
  https://www.baliprov.go.id/web/hadiri-pujawali-pura-luhur-pucak-padang-dawa-tabanan-gubernur-koster-mohon-keselamatan-keharmonisan-kesejahteraan-warga-bali-dan-alam-semesta
- Pura Swagina Bapenda Provinsi Bali — Buda Wage Klawu:
  https://bapenda.baliprov.go.id/pujawali-di-pura-swagina-badan-pendapatan-daerah-provinsi-bali/
- Pura Luhur Batukaru — Wraspati Umanis Dungulan:
  https://bmc.baliprov.go.id/news/title/pj-gubernur-bali-smmahendra-jaya-hadiri-piodalan-di-pura-batukaru
- Pura Jagatnatha Jembrana — Purnama Sasih Karo:
  https://bali.kemenag.go.id/jembrana/berita/10672/ngayah-ring-piodalan-pura-jagatnatha-jembrana
- Pura BPK Perwakilan Bali — Purnama Kaulu:
  https://bali.bpk.go.id/berita-utama/bpk-perwakilan-provinsi-bali-laksanakan-piodalan-pada-purnama-kaulu/
- Pura Dalem Purwa, Desa Adat Penglatan — Purnama Kalima:
  https://dpma.baliprov.go.id/wp-content/uploads/2022/03/37-PROFIL-DESA-ADAT-PENGLATAN.pdf
- Pura Tirta Ganapati RSJ Manah Shanti Mahottama — Anggara Kasih Prangbakat:
  https://rsjiwa.baliprov.go.id/piodalan-ring-pura-tirta-ganapati-rumah-sakit-jiwa-manah-shanti-mahottama

A Pawukon rule can be projected deterministically every 210 days. A Sasih rule is projected only when the target year's authoritative/published Sasih/Purnama mapping exists; otherwise the UI shows the rule and known sourced occurrence, not an invented Gregorian date.

### Dauh Ayu / Padewasan

The Kemdikbud Hindu education material is the initial transparent reference for Panca Dauh / Sukaranti classifications, Asta Dauh Ayu/Ala by Saptawara, the relationship of Padewasan to Wewaran/Wuku/Sasih, and example rule sets for Dewa, Pitra and Manusa Yajna.

Implementation policy:
- display the exact rule family and source used,
- separate calculated reference from annual TIKA authority,
- do not claim a universal guarantee of auspiciousness,
- retain Desa-Kala-Patra/local authority guidance,
- recommend confirmation with family/pemangku/sulinggih for ritual decisions.

## Correction rule

If two trusted sources conflict, AafnaiPatro does not silently merge them. Store both source records, lower confidence, and surface the conflict until an authoritative decision resolves it.
