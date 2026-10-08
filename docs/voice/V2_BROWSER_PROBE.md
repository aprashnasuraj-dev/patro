# V2 — Probe browser recognition and fall back in the same tap

Browser support is provisional until audio starts or a result arrives. Network,
service and unsupported-language failures, or a three-second silent startup,
automatically start server recording after the original user gesture. Failed
engine hints are isolated by locale and expire after one day. Choosing Live
still permits a retry. No audio or transcript is saved in the hint.

## Preserved behaviours

- [x] Existing hook arguments, return fields and onFinal callbacks remain valid.
- [x] Existing mic, language and engine controls remain available.
- [x] All routes, canonicals, calendar archives and official dates are unchanged.
- [x] No CSP changes, D1 calls, storage migrations or account-data writes.
- [x] Stop/unmount cancels pending fallback; microphone never starts on page load.

## Validation

TypeScript and two executable storage contracts pass. Mocked Playwright covers
desktop Live, three provider errors, silent exposed SR, no SR, unconfigured
server, and cancelling a probe. This check is included in the production release
browser gate. Actual six-browser device testing remains pending; see V1's matrix.

## Rollback

Revert this PR only to restore feature detection and manual engine selection.
The optional `patro.voice.engine.v1` hint may remain; no user data needs migration.
