# V4 — Ordered independent recording chunks

Server dictation starts a fresh MediaRecorder for each 12-second segment. Each
segment therefore has its own WebM/Ogg/MP4 container, rather than attempting to
upload dependent timeslice fragments. Segments upload serially and insert text
as it returns. Stop flushes the last segment and awaits queued transcription.
The editor shows elapsed seconds, completed chunks and pending chunks.

The previous 60-second cap is removed. If four chunks accumulate because the
provider is slow or offline, recording stops with an error to bound retained
audio. Existing provider quotas still apply. Unmount aborts requests and releases
the microphone. No audio is stored. This version uses fixed-length segments;
silence-aware RMS cuts are an optional enhancement, not implemented here.

## Preserved behaviours

- [x] Existing hook callbacks, language/engine controls and privacy statement.
- [x] Browser live recognition remains available.
- [x] Existing routes, URLs, archives, official calendar values, storage and CSP.
- [x] No new D1 reads or account writes.

## Validation and rollback

TypeScript, 13 executable voice contracts and ten mocked browser cases pass.
Contracts verify independent recorder instances, upload order and final flushing;
the browser verifies two chunks share one microphone stream. Real-device codec
and microphone tests remain pending in V1's matrix. Revert this PR to restore V3's
single recording; no stored data is affected.
