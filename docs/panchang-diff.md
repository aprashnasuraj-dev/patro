# Panchang comparison log

The Patro tools kit contains a reference Astronomy Engine fallback. Mero Patro's existing production panchang remains the primary source for Nepal/Kathmandu. This file records observed differences for review; neither engine is silently changed to make the other match.

## Comparison policy

- **Primary:** current Mero Patro production panchang/archive.
- **Fallback/cross-check:** the kit Astronomy Engine 2.1.19 calculation path.
- Official festival/sait records override computed candidates where an official record exists.
- A date-level mismatch is logged rather than auto-corrected.
- Transition-time rounding differences are recorded separately from date/tithi disagreements.

## Verified Kathmandu sample — 2026-09-28 through 2026-09-30

| AD date | Production sunrise tithi | Kit/reference sunrise tithi | Production transition | Reference transition (NPT) | Date-level result |
| --- | --- | --- | --- | --- | --- |
| 2026-09-28 | Krishna Dwitiya (17) | Krishna Dwitiya (17) | 19:29 | 19:28:57 | match |
| 2026-09-29 | Krishna Tritiya (18) | Krishna Tritiya (18) | 17:26 | 17:25:35 | match |
| 2026-09-30 | Krishna Chaturthi (19) | Krishna Chaturthi (19) | 15:11 | 15:10:42 | match |

**Observed differences:** no date/tithi disagreement was found in this sample. The reference transition instant is 3–25 seconds before the production minute label because the production API exposes transition time rounded to the minute. This is not treated as a calendar-date mismatch and neither engine is altered.

## Review rule

When a future comparison finds different sunrise tithi/date assignments, add one row here with the AD date, both results and boundary context. Production remains primary until the discrepancy is manually reviewed.
