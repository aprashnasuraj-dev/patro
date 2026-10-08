# V11 — Confirmed voice reminders

An opt-in panel on the existing tithi reminder tool parses relative AD dates,
BS month/day and spoken time. Missing year/time is explicitly flagged. A native
modal lets the user correct the title, source date, event kind and NPT time.
Only Confirm writes to the existing due or tithiEvents collection. Cancel writes
nothing. Tithi comes from the static calendar archive; computed month naming is
supplementary. No new API/D1 reads are added by the composer.

Storage read: existing nepalmiti.life.v1 and its existing account-scoped variant,
patro.account.active, and the shared voice engine hint patro.voice.engine.v1.
The existing store preserves other fields. Generic reminders export a VALARM
ICS; calendar import is required for alerts. Existing tithi export/feed remain.

## Preserved behaviours
- [x] Existing forms, reminder rules, account controls and ICS/feed controls.
- [x] Existing URLs, canonicals, archive values, storage keys/shapes and CSP.
- [x] No automatic saving, notification subscription or sync request.

## Validation and rollback
TypeScript, parser and static-cache contracts pass. Mocked browser acceptance
checks cancellation, confirmation, original private fields and archive tithi.
Real microphone/device validation is pending. Revert this item; no migration.
