# J2 — Full birth panchang with provenance

Original Kathmandu archive fields are displayed unchanged. Missing fields and
birth-time/place calculations are a separate computed supplement: interval,
nakshatra/pada, yoga/karana, Moon/Sun sign, ritu/ayana convention, both lunar month
systems, adhik, Sun/Moon rise/set and illumination, NS archive and Saka date.
Without time the instant is local sunrise and labelled accordingly. DST repeated
time is labelled; nonexistent time rejected. No prediction/dasha is surfaced.

## Preserved behaviours
- [x] Existing Akhbar/JanmaPatro remain unchanged by default.
- [x] Original archive and all old controls/keys/account sync/CSP preserved.
- [x] No API/D1 calls: static year shard only; inputs stay out of URLs/metadata.

## Validation and rollback
TypeScript and executable sunrise/no-time, explicit NPT clock, interval and
immutable archive contracts pass. Revert this item; no migration.
