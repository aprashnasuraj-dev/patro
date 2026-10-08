# F6 — Local ICS, share cards and consented push

Reviewed timing rows offer UTC ICS with local timezone label and a 30-minute
VALARM, plus a lazy PNG exporter with equivalent alt text. Explicit consent is
required before title/time is sent to the existing authenticated push service.
Notification permission/subscription occurs only on a button gesture. Existing
/me/reminders manages jobs. Errors direct users to sign in or import ICS.
Push subscription upsert now returns the actual existing device id rather than
a newly generated unused id, preserving endpoint/user ownership checks.

## Preserved behaviours
- [x] Existing Worker push endpoint and payload; all old reminder/ICS controls.
- [x] No hot-path D1 reads: push DB access is only an explicit user write action.
- [x] No birthday data/sync on mount, no new persistence or CSP changes.

## Validation and rollback
TypeScript and escaped UTC/DST alarm contracts pass. Ritual rows remain gated.
Revert this item; existing jobs remain manageable in the original settings page.
