# V6 — Visible microphone and accurate browser help

Quick notes, diary and the voice tool keep a visible disabled microphone when
neither engine works, with adjacent help. In-app browser help offers an Android
Chrome intent and copy-link; queries/fragments are excluded from these links.
iOS help explains Keyboard Dictation and Siri settings and mentions the existing
server selector when available. Service refusal is no longer presented as a
microphone-permission problem. Capture, network, language and quota errors have
specific advice. Stop stays enabled while server chunks are being transcribed.

## Preserved behaviours

- [x] All existing mic, language, editor, save and navigation controls.
- [x] No automatic microphone, Siri setting or permission changes.
- [x] Existing storage/account data, URLs/canonicals and archive calendar values.
- [x] No CSP weakening, provider-contract changes or D1 reads.

## Validation and rollback

TypeScript and 15 voice contracts pass. Browser acceptance covers ten engine
scenarios plus visible unsupported microphones on home and diary. Pure contracts
exercise six in-app agents, iOS, distinct errors and private-field stripping.
Actual mobile-browser matrix remains pending. Revert this PR to remove the added
help and restore V5 rendering; no migration or user-data cleanup is needed.
