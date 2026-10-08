# V7 — Language changes restart active dictation

Changing a hook language stops the old session and resumes with the new language
once capabilities are ready. In server mode the old recording is flushed and
its queued text is appended using the old language before the new stream starts.
Manually selected server mode is retained. Stop cancels a pending language restart.

Quick notes and diary inherit this behavior. VoiceTypingTool now resumes instead
of requiring another tap. Diary keeps spoken language separately from input mode,
so English voice input visibly activates the voice button. Its unused recognizer
ref was removed; controls and the persisted note shape remain unchanged.

## Preserved behaviours

- [x] Existing language choices, typed input, suggestions, save/delete and onFinal.
- [x] Default Nepali, existing notes/storage/account sync and microphone privacy.
- [x] All URLs/canonicals/archives/calendar values; no D1 or CSP changes.

## Validation and rollback

TypeScript and 15 runtime contracts pass. Twelve mocked engine cases include
browser and server language switching, plus live switches on home and diary and
the two unsupported-mic checks. Manual device tests remain pending. Revert this
PR to restore V6 language behavior; no stored data is changed or migrated.
