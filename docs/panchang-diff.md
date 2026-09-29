# Panchang engine cross-check

This file records observed differences between the existing Patro panchang engine and the astronomy reference bundled in `src/patro-tools`. It is a review log, **not** an override list.

## Integration rule

- Primary: existing Patro / Nepal Miti panchang and archive.
- Fallback only: the kit's Astronomy Engine implementation when the primary service has no value (for example a non-Kathmandu location or an unavailable field).
- No result in this document changes either engine automatically.

## Current fixture comparison — 2026-09-29

| Field | Existing Patro | Kit fixture/reference | Difference |
| --- | --- | --- | --- |
| Tithi | Krishna Tritiya (18 / paksha day 3) | Ashwin Krishna Tritiya | none |
| Nakshatra | Ashwini, pada 4 | Ashwini | none on nakshatra |
| Sunrise, Kathmandu | 05:55 | 05:55 | none |
| Sunset, Kathmandu | 17:52 | 17:52 | none |
| BS date | 2083-06-13 | test adapter anchor uses 2083-06-13 | none |

## Boundary fixture — 2024-10-12

Both engines identify **Shukla Navami at sunrise**, with the tithi transition at **11:14 Kathmandu time**. The kit's observance test intentionally selects this civil date for Vijaya Dashami under the `aparahna` rule even though sunrise is still Navami; that is an observance-rule decision, not a raw panchang disagreement.

## Differences requiring review

No raw panchang-field differences were found in the fixtures above as of 2026-09-29. New mismatches discovered by CI or production comparison should be appended here with date, location, field, both values, and the relevant observance rule. Neither side should be silently corrected.
