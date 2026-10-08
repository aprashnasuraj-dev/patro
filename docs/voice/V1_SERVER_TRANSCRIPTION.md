# V1 — server transcription fallback

The Worker now prefers its `AI` binding with
`@cf/openai/whisper-large-v3-turbo`, falls back to the existing Groq key aliases,
and retains the existing unconfigured error when neither provider exists.
Audio is passed as base64 with the selected `ne`/`en` language; Nepali retains
the existing prompt. Both documented Workers AI output shapes are normalized
to the existing `{text, language, provider}` response.

Model reference: https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/
Workers AI consumes the account's inference allowance. This PR does not prove
production model access or guarantee a free usage budget.

## Preserved behaviours

- [x] Existing speech API paths, multipart fields, methods, and response fields.
- [x] All Groq secret aliases and its model override.
- [x] Existing Nepali/English language defaults, privacy text, and UI controls.
- [x] Existing 20 MiB audio limit and no-store responses.
- [x] No audio/transcript persistence or logging; only hashed-IP quota counters.
- [x] No D1 read, browser storage change, route/canonical removal, or CSP change.
- [x] All 22,902 baseline URLs remain protected by the existing build guard.

## Quota boundary

Cache API permits 12 valid transcription requests per minute and 240 per UTC
day per hashed IP. Denials return 429 and Retry-After. Cache failure returns a
clear 503 before provider work. Requests in one isolate are serialized for the
same counter. Cloudflare Cache API is per-colo and can evict entries; these are
best-effort abuse limits, not globally atomic or hard billing caps. Shared NAT
users share an IP allowance. Provider/account usage limits remain authoritative.

## Validation

- Baseline `npm run release:verify` passed before feature edits.
- Nine runtime server contract tests cover provider precedence, both AI output
  schemas, language/prompt, Groq-only/fallback, errors, concurrent quotas,
  minute/day resets, IP isolation, timeout, and unavailable quota cache.
- Every runtime test supplies an environment that cannot read D1.
- Worker dry run passed with the AI binding; the extended Cloudflare/product
  contract suite passed all 131 tests.
- Baseline evidence: `Patro_Feature_Baseline_bfb4e0e.zip`, 51 screenshots and
  passing release logs. See `VOICE_PLACE_BIRTHDAY_PLAN.md` for storage inventory.

## Manual test matrix

| Device/browser | Status | Exercise after V1–V9 |
|---|---|---|
| Chrome Android | Pending manual test | Live restart/dedup and recorded fallback |
| Samsung Internet | Pending manual test | Probe and one-tap fallback |
| iOS Safari | Pending manual test | Siri-disabled guidance, recording, locale switch |
| Facebook Android WebView | Pending manual test | Visible mic, recording or open-Chrome guidance |
| Firefox | Pending manual test | Server recording |
| Brave | Pending manual test | Exposed-but-failing speech API and install timeout |

Mocked tests do not constitute a manual device test. Browser reliability and
editor changes belong to the following numbered PRs.

## Rollback

Revert this PR's commit and redeploy the last validated Worker. The previous
Groq-only implementation is restored; no migration or user-data rollback is
needed. Removing only the AI binding leaves Groq fallback available but does
not remove the quota change. Do not erase any archive or browser storage.
