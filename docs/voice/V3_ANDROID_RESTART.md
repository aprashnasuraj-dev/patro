# V3 — Android restart and transcript diff

Android uses noncontinuous recognition. While listening intent remains enabled,
ended sessions restart after 250–2000 ms backoff, with a ten-minute session limit.
Stop, unmount, permission errors and server fallback cancel both restart timers.
No-speech events can restart; service errors retain V2's server fallback.

Final snapshots are diffed rather than deduplicated by numeric result index.
Cumulative index-zero results, multiple indices and restart replays are covered
by five executable fixtures and a mocked Android browser scenario.

An append-only callback cannot revise text already inserted. Revised final
prefixes retain existing text; only new suffix words are appended. A first phrase
identical to the last phrase after an automatic restart is treated as a replay.
A deliberate new microphone session resets that history. These are limitations
of SR's lack of stable utterance IDs, not claims of perfect recognition.

## Preserved behaviours

- [x] Existing hook and onFinal remain backward compatible.
- [x] Desktop remains continuous; all language/engine/editor controls remain.
- [x] No routes, canonicals, archives, calendar values, CSP or D1 changes.
- [x] No new storage keys or account sync; stop releases listening intent.

## Validation and rollback

TypeScript, 12 voice runtime contracts and nine mocked browser scenarios passed.
The six-device manual matrix remains pending. Revert this PR to restore the V2
browser lifecycle; no storage migration or data deletion is needed.
