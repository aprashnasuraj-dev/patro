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

The canonical adapter expects a calendar record with `ad`, `bs.year`, `bs.month`, `bs.day`, Nepal Sambat (`ns`), `panchang`, and source/verification metadata where present. No SEO route may invent a field absent from this record or an approved fact/holiday source.

## Converter location

Conversion is already server-exposed and archive-backed. `convertBsToAd` resolves the exact BS archive record; `convertAdToBs` resolves the exact AD archive record. It does not calculate BS dates by assuming fixed month lengths.

## Other factual tables used by SEO/agent pages

- `holidays`
- `official_panchang_facts` (festival / sait facts)
- correction overlay table `holiday_overrides` when present in D1

Community, history, news and media datasets remain separate product datasets; they are not merged into the calendar source.

## Source / provenance registry

The repository retains `calendar_reference_sources` entries covering Nepal Panchanga Nirnayak Bikash Samiti, Government of Nepal / MoFAGA references, Nepal Sambat usage references, historical BS table corroboration, and Astronomy Engine context. The registry is provenance context; it is not permission to silently substitute one source for another.

## 16 supported city/timezone contexts

Nepal: Kathmandu, Pokhara, Biratnagar, Butwal.

Diaspora: New York, Toronto, London, Sydney, Melbourne, Tokyo, Seoul, Doha, Dubai, Riyadh, Kuala Lumpur, Kuwait City.

The runtime adapter stores explicit IANA timezone IDs and coordinates where astronomical calculations require them. Nepal calendar-day identity remains anchored to `Asia/Kathmandu`.

## Internal 200-date integrity check

`npm run seo:phase0` performs dataset discovery plus **200 deterministic pseudo-random dates across BS 2075–2085**. Each sampled record is resolved BS→AD and AD→BS through the canonical adapter. This proves internal archive/index consistency; it is not an independent accuracy claim.

The command also validates the declared 77,070-row inventory, first/last AD dates, BS coverage, Nepal Sambat coverage and Panchang presence. It writes `seo-dataset-inventory.json` and `reports/seo-dataset-audit.json`.

## Independent 200-date accuracy gate

Final Phase 0 accuracy sign-off requires a separate fixture with at least 200 independently obtained mappings across BS 2075–2085:

```bash
npm run seo:accuracy-reference -- path/to/reference.json
```

Accepted shape:

```json
{
  "source": "independent reference name/version",
  "rows": [
    { "ad": "2026-10-02", "bs": "2083-6-16" }
  ]
}
```

The fixture must not be generated from Aafnai Patro's own archive. `verify-calendar-reference.mjs` selects 200 deterministic pseudo-random eligible mappings and fails on any mismatch. Until that gate passes, the focused five-year index architecture may build/test, but the project **must not claim that the external 200-date accuracy audit is complete**.
