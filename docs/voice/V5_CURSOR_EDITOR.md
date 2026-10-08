# V5 — Cursor insertion and inline interim preview

VoiceTypingTool, HomeQuickNote and diary NoteComposer share a cursor-insertion
adapter. Finals replace the selected range, retain the cursor after insertion
and respect the editor's existing maximum length. The dictation hook's onFinal
contract is unchanged for all other callers. Consecutive callbacks can insert
before React paints without losing a chunk.

Interim text appears in a faded, noninteractive mirror inside the editor, at the
selection and scroll position. It is never committed or saved. A screen-reader
status announces it separately. The mirror is absent when there is no interim
text, preserving the initial editor DOM layout and styling.

## Preserved behaviours

- [x] Existing typing, spelling suggestions, save/delete and language controls.
- [x] Existing hook API and audio privacy.
- [x] Notes' storage shape, account sync, all routes/canonicals/calendar values.
- [x] No CSP changes or new D1 reads.

## Validation and rollback

TypeScript and 14 voice runtime contracts pass. Mocked desktop acceptance tests
selection replacement and verifies interim text does not modify the textarea.
The other nine browser scenarios pass. React review checked refs, effect cleanup,
labels, status announcements and conditional preview loading. Real-device matrix
remains pending. Revert this PR to restore append-at-end editor callbacks; no
stored data is changed or migrated.
