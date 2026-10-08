# V9 — Optional on-device language packs

Check SpeechRecognition.available with processLocally:true and the selected
language. Downloadable packs expose a download button; install() is invoked only
from that user gesture. Installed packs expose an opt-in checkbox. The default
remains normal live/server recognition. A recognizer gets processLocally:true
only when the local pack is available and the user enables it.

Availability/download polling has a ten-second deadline; installation has a
sixty-second deadline. Stalled or rejected operations are unavailable, not proof
of a working engine. V2's runtime audio/result probe still applies. Language
changes reset local selection and abort stale checks; unmount ignores late work.
Patro cannot cancel a pack download already owned by the browser. Engine errors
retain the existing automatic server fallback and its displayed recording mode.

API references:
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/install_static

## Preserved behaviours

- [x] Existing defaults, live/server selectors, editor controls and hook callback.
- [x] No automatic pack installation or microphone permission request.
- [x] Existing storage/account data, URLs/canonicals and archive/calendar values.
- [x] No D1 reads, new storage key, CSP or Permissions-Policy weakening.

## Validation and rollback

Executable contracts cover downloadable/installed states, stalled promises,
perpetual downloading and aborts. Mocked browser tests cover the download gesture,
local recognizer option, existing fallback matrix and optional cleanup toggles.
Acceptance also covers stale shorter Android snapshots and ensures changing an
idle language does not activate a microphone. The Roman cleanup engine uses a
lazy bundled typed adapter because Vite cannot import JavaScript from public/;
mapping parity is tested against the original unchanged keyboard. The old
source-string dedup contract now checks the snapshot diff integration, backed by
executable fixtures. Full release verification is recorded alongside this PR. Actual six-browser
manual testing remains pending. Revert this PR to remove local-pack controls and
restore V8; no data migration or pack removal is necessary.
