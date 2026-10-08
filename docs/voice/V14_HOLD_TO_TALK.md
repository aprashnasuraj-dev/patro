# V14 — Accessible elder mode

Opt-in large transcript and hold-to-talk button. Pointer release/cancel, lost
capture, blur and Space/Enter release stop recording. Late permission/start
completion also stops after release. Existing TTS reads settled final text only
when recording and uploads stop; manual read/stop controls remain accessible.
No persistence; shared engine hint is the only additional storage read.

## Preserved behaviours
- [x] Standard editor, all controls, URLs, data and language defaults.
- [x] Existing TTS and dictation contracts; no D1/CSP/calendar changes.

## Validation and rollback
TypeScript and hold lifecycle contract pass. Mocked browser acceptance and actual
device testing are tracked separately. Revert this item; no migration.
