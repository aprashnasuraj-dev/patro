# Aafnai Patro Dataset Discovery Record

This document is the Phase 0 inventory for the search/agent architecture. It records the source that already exists; it does not create a second dataset.

## Canonical calendar source

Production runtime reads Cloudflare D1 table `content_records`, selecting `table_name='astronomy_calendar_map'`. The D1 dataset is deterministically imported from the committed migration snapshot under `migration/data/public/astronomy_calendar_map/`.

Build-time SEO reads that same committed snapshot through a filesystem provider. It does **not** maintain its own calendar values.

## Verified migration inventory

From `cloudflare/d1/expected-public-counts.json`:

- `astronomy_calendar_map`: **77,070 rows**
- AD coverage: **1826-04-11 through 2037-04-13**
- every calendar row is required by the migration verifier to contain BS data
- every calendar row is required to contain Nepal Sambat data
- every calendar row is required to contain Panchang data
- `holidays`: 84 rows in the retained public snapshot
- `official_panchang_facts`: 101 rows
- `on_this_day_events`: 5,454 rows
- `time_machine_moments`: 706 rows
- `tool_catalog`: 29 rows
- `community_dates`: 1,062 rows
- `community_festivals`: 34 rows
- `ns_days`: 14,972 rows
- `ns_festival_dates`: 1,886 rows
- `ns_festivals`: 47 rows

The migration verification script also checks that calendar AD dates are contiguous and that expected row counts match the approved inventory.

## Calendar record shape used by the adapter

The canonical adapter expects a calendar record with:

- `ad` — Gregorian ISO date
- `bs.year`
- `bs.month`
- `bs.day`
- optional formatted/month labels already present in the source
- `ns` / Nepal Sambat record
- `panchang` record, including tithi fields where provided by the archive
- source/verification metadata where present in the underlying snapshot

No SEO route is allowed to invent a field that is absent from this record or an approved facts/holiday source.

## Converter location

Conversion is already server-exposed and archive-backed. The adapter implements:

- `convertBsToAd` by resolving the exact BS calendar record and returning its AD mapping;
- `convertAdToBs` by resolving the exact AD calendar record and returning its BS mapping.

It does not calculate BS dates by assuming fixed month lengths.

## Other factual tables used by SEO/agent pages

- `holidays`
- `official_panchang_facts` (festival / sait facts)
- correction overlay table `holiday_overrides` when present in D1

Community, history, news and media datasets remain separate product datasets; they are not merged into the calendar source.

## Source / provenance registry

The repository retains `calendar_reference_sources` entries covering, among others:

- Nepal Panchanga Nirnayak Bikash Samiti
- Government of Nepal / MoFAGA references
- Office of the President / OPMCM Nepal Sambat usage references
- World Calendars / Keith Wood historical BS table reference
- Ashok095/bikram-sambat historical BS table reference
- amitgaru/nepali-datetime corroboration for the BS table range it supports
- Astronomy Engine for astronomical calculation context

The source registry is provenance context; it is not permission to silently substitute one source for another.

## 16 supported city/timezone contexts

Nepal:
- Kathmandu
- Pokhara
- Biratnagar
- Butwal

Diaspora:
- New York
- Toronto
- London
- Sydney
- Melbourne
- Tokyo
- Seoul
- Doha
- Dubai
- Riyadh
- Kuala Lumpur
- Kuwait City

The adapter stores explicit IANA timezone IDs and coordinates for runtime astronomical calculations. Nepal calendar-day identity remains anchored to `Asia/Kathmandu`.

## Independent 200-date accuracy gate

The internal archive integrity checks are strong, but they are **not an independent accuracy comparison**. Final Phase 0 accuracy sign-off therefore requires a separate reference fixture containing at least 200 independently obtained mappings across BS 2075–2085.

The consolidated auditor always runs the internal 200-date round-trip sample. To require an independent fixture as well, set the fixture path and strict flag:

```bash
SEO_EXTERNAL_REFERENCE_JSON=path/to/reference.json SEO_REQUIRE_EXTERNAL_REFERENCE=1 node scripts/audit-seo-dataset.mjs
```

The reference file must not be generated from Aafnai Patro's own archive. It must contain at least 200 valid `{ "ad": "YYYY-MM-DD", "bs": "YYYY-M-D" }` records sourced independently. The auditor fails on any BS↔AD mismatch and writes `reports/seo-dataset-audit.json` with explicit internal/external status.

Until that gate is passed, the focused five-year index architecture may be built/tested, but the project must not claim that the external 200-date accuracy audit is complete.
