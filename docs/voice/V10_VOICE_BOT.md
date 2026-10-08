# V10 — बोलेर सोध्नुहोस् in the existing Patro bot

The bot has an additive mic button using the shared dictation hook. Voice fills
its existing question input; Stop, review and Send retain user control over the
question. The existing answerPatroQuestion engine handles it, and the existing
useNepaliSpeech read-aloud engine reads that answer automatically. Manual read-
aloud controls remain. Starting dictation stops playback to prevent feedback.

Default typed input and chat behavior remain unchanged. Non-default typed input
is retained when recording starts. Questions keep the existing 300-character
limit. Unsupported mic help is reused. Spoken replies depend on voices available
on the actual device; the written answer remains available when TTS fails.

## Preserved behaviours

- [x] Existing typed questions, quick questions, Send and manual read-aloud.
- [x] Existing bot answer engine, locale/date behavior and API request patterns.
- [x] All URLs/canonicals, storage/account data and calendar archives.
- [x] No new D1 reads, paid TTS dependency or CSP changes.

## Validation and rollback

TypeScript and an executable spoken-versus-typed festival-answer contract pass.
Mocked mobile Playwright covers gesture-only recording, transcript review, the
shared engine answer, automatic existing TTS and overflow. The check is added to
the release browser gate. Actual device/audio testing remains pending. Revert
this PR to remove the mic and automatic spoken-answer path; no migration.
