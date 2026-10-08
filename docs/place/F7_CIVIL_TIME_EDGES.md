# F7 — DST, date line and polar handling

Local timing uses civil-day bounds with actual IANA offsets, not a fixed 24h.
Missing local clock times are rejected; repeated DST times select the earlier
instant and expose ambiguity. Skipped date-line days are rejected. A polar
fallback is unavailable unless the reviewed config explicitly permits it, and
when enabled is labelled Kathmandu reference rather than a local sunrise.
The original core and immutable Kathmandu archive are never altered.

## Preserved behaviours
- [x] Kathmandu reference, official values, defaults, controls, storage and CSP.
- [x] No server computation or new D1 reads.

## Validation and rollback
Contracts cover NY 23h/25h days, skipped/repeated 02:30/01:30, Apia's skipped day,
polar Tromsø and Auckland/Honolulu/Sydney civil-date boundaries. Final archive
regression checks passed: Kathmandu sunrise/sunset <=1 minute on 40 dates.
Revert this item; no migration.
