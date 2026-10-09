# Local Nepali Patro / Atlas v3

Corrects the original Atlas release without rebuilding or replacing the core Patro application. All 50 × 40,000 city/date URLs remain available. No database records or HTML files are generated for those URLs.

## Production ownership

The independent `patro-day-atlas` Worker owns only `/atlas*`, `/sitemap-atlas*`, and an additive `/date/*` adapter. The `/robots.txt` and `/sitemap.xml` routes were removed on 10 October 2026 Nepal time. Core Patro owns those files again. No core source, tool, frontend, database or binding is changed.

The date adapter fetches the original `patro` Worker over the `ORIGIN` service binding. It preserves archive fields, Nepal Sambat, existing festivals, markup, scripts, styles and links, adding a local sunrise timing section before the closing article. Unknown paths, non-HTML responses, unavailable archive responses and unexpected markup pass through. Calculation errors fail open to the original response. HEAD requests have the same headers as GET, with no body. Kathmandu Atlas detail pages canonicalize to `/date/{date}`. Outside the promoted date subset, existing core date indexing directives are preserved.

## Index inventory

The release window is fixed, not silently expanding. `indexing.mjs` declares:

| Slice | Canonical URLs |
| --- | ---: |
| Other 49 cities, 2025-10-10 through 2029-10-10 | 71,638 |
| Kathmandu `/date/` reference dates, 1940-01-01 through 2029-10-10 | 32,791 |
| Total, with overlapping birth/window dates counted once | 104,429 |

The canonical-date slice includes all 31,412 birth dates from 1940–2025 plus the Kathmandu window, deduplicated. `/sitemap-atlas.xml` lists 105 shards: 104 with 1,000 URLs and one with 429. Previously listed shards 105–1999 return 410, retiring only sitemap files, never detail pages. Other city dates outside the window return 200 with `noindex,follow` in both HTML and HTTP headers. Year/month navigation remains available with noindex. This does not assert Google has indexed the eligible subset or establish measured search demand. Existing place/ward pages and existing main sitemaps are untouched; no ward facts are fabricated.

Review the window using Search Console after 2027-01-08. No credentials or Search Console data are available to this extension; it does not invent impressions or automatically prune pages. Only promote additional slices after measured demand and content validation. Submit the independent Atlas index separately; it is intentionally not appended to main robots/sitemap files.

## Local calculations

- Geocentric Moon–Sun elongation divided into 12-degree tithis, evaluated at local sunrise.
- Next tithi boundary searched with Astronomy Engine 2.1.19. Boundary is one physical instant worldwide; its clock label differs by city.
- Shukla/Krishna paksha, local tithi end date/time, sunrise/sunset, moonrise/moonset and illuminated fraction.
- Rahu Kaal: daylight divided into eight; weekday interval map Sunday=8, Monday=2, Tuesday=7, Wednesday=5, Thursday=6, Friday=4, Saturday=3.
- Actual IANA clock offset relative to Nepal at sunrise, including DST, rather than a constant per city.
- BS civil-date conversion uses the existing project calendar table. It does not define the religious day or an exact birth tithi.
- No sunrise means no invented sunrise tithi or Rahu Kaal. Times are estimates for city-centre coordinates, sea level, standard refraction and a flat horizon. Runtime future timezone legislation and actual terrain can change observed results.

Repeated history and vocabulary blocks were removed from detail pages; their datasets and the standalone dictionary are retained. `legacy-worker.mjs` preserves the original implementation for reference only; it is not a deployment entry point. There is no bot-specific content.

## Festival correctness

Sunrise tithi is not sufficient to assign Dashain, Teej, Ekadashi fasting, or every festival. The repository's `src/place/ritual-config.ts` has unapproved candidate rules; this release does not claim review approval or promote those candidates to official city observances. Pages show Ekadashi/Purnima/Aunsi lunar-day markers, explicitly distinguishing them from fasting/festival assignments, and preserve/link existing Nepal festival records. Same-day city-vs-Kathmandu differences are calculated; when applicable an adjacent-day match requires the same physical tithi interval, not merely the same name.

Before enabling indexed output, independent Drik Panchang fixtures were checked for Kathmandu (2026-10-10), Tokyo (2026-10-09), Sydney (2026-10-10), and San Jose (2026-10-10). Tithi labels match; the sampled end boundaries differ by 1.61–1.81 minutes. Tokyo/Sydney Rahu Kaal endpoints agree within two minutes. These checks are in `test.mjs` and `verification.json`; they do not validate all ceremonial dates or all historical records.

## Publisher tools

- Calculated CSV data: CC BY 4.0, with licence URL in data and HTTP Link header. Preserve attribution, licence link and changes. Third-party archive text/images, trademarks and application code are excluded from this data licence.
- `/atlas/widget/{city}`: embeddable, noindex, five-minute cache; today's local sunrise tithi and source link. Only this endpoint permits framing.
- `/atlas/{city}/tithi-calendar/{year}.ics`: annual Ekadashi, Purnima and Aunsi **sunrise markers**, not an official festival/fasting calendar. 2025–2029. Sparse markers are precomputed offline with `build-markers.mjs`; no 365-day astronomy loop runs in a production request. ICS lines use CRLF, escaping and UTF-8 byte-safe folding.
- Existing day CSV/calendar download routes remain, with additional panchang fields.

## Validation and deployment

```
cd extensions/day-atlas
npm ci
npm run build:markers
npm run build
npm test
```

`test.mjs` verifies the complete sitemap inventory, window limits, invalid dates, timezone/DST handling, polar behavior, 300 astronomy/panchang samples, independent references, canonicalization, original core HTML preservation, noindex/header consistency, CSV and ICS/widget behavior. Local performance is not a Cloudflare CPU benchmark. The deployable bundle is about 204 KiB, well under the 2 GB persistent storage goal; provider caches, requests, bandwidth and CPU are separate usage dimensions.

`smoke.py --capture-baseline` snapshots 14 original core routes immediately before deployment. `smoke.py` then checks them for byte-identical responses, plus Atlas, date enrichment, sitemap sizes and indexing boundaries. HTTP smoke checks do not replace comprehensive interactive browser testing.

Deploy only this Worker using `wrangler.jsonc` or the Cloudflare API. Do not redeploy the original core Worker for this extension. Keep its `ORIGIN` binding to `patro`. Route removal and production verification must accompany deployment; do not use the old four-route configuration.
