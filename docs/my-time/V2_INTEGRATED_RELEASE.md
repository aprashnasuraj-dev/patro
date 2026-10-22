# My Time V2 — integrated release specification

This changeset is reviewed as ONE unit. Do not deploy individual subchanges.

## User-facing information hierarchy
1. Selected-place live clock, date, Tithi and interactive polar dial.
2. Best available traditional Shubh Time and two alternatives, with methodology and cautions.
3. Live daily briefing and functional view/interests customization.
4. One date/location/timezone editor; Panchang, chart, scientific layers and methodology follow.
5. Advanced view layers and directory are progressively disclosed.

The retired `व्यक्तिगत प्राथमिकता र सूचना` notifications/events UI is removed. Legacy user-created event records are copied once to localStorage key `aafnaipatro.mytime.retired-events.v1` before the old preferences payload is rewritten. No background alert claim remains. No birth data leaves the established client-side chart workflow.

## Calculation contracts
- Astronomy: the shared, location-aware Panchang provider, with source_status and fallback_used provenance. Degraded local-noon calculations are disclosed, never silently presented as equivalent.
- API: only HTTP 200 responses may advertise public caching; errors use no-store.
- The clock uses selected timezone civil bounds, including 23/25-hour DST days; previous solar-night windows fill the selected civil date before sunrise where available. A live hand is hidden when viewing a different date.
- Candidate Shubh windows are split at exact UTC Rahu/Yamaganda/Gulika and Hora boundaries. Positive secondary signals cannot cancel the explicit Rahu Kaal caution cap.
- A connected existing JanmaPatro birth chart is always labelled birth-chart personalized. Optional unavailable factors are omitted and remaining weights are normalized; do not show "limited signal" or "score unavailable" just because an optional comparison is absent.
- Candidate-time charts reuse the existing `calculateChart` engine with the selected observation place and IANA timezone. Candidate Tara/Chandra Bala are recalculated at each candidate midpoint rather than copied from the current clock.
- Activity profiles assign different relative weights for general use, work, study, travel, prayer, meditation and family plans. The UI reports each included factor's effective normalized weight, so the breakdown remains accurate when some signals are absent.

  Configured coefficients (each profile totals 100 before unavailable signals are normalized):

  | Profile | Panchang | Rashifal | Dasha–Hora | Tara/Chandra | House lords | Activity Hora | Activity Tatwa | Gochara |
  |---|---:|---:|---:|---:|---:|---:|---:|---:|
  | General | 35 | 18 | 12 | 15 | 15 | 0 | 0 | 5 |
  | Work | 31 | 15 | 10 | 10 | 20 | 9 | 2 | 3 |
  | Study | 31 | 16 | 8 | 13 | 15 | 9 | 4 | 4 |
  | Travel | 32 | 13 | 8 | 10 | 14 | 10 | 6 | 7 |
  | Prayer | 30 | 13 | 8 | 12 | 11 | 6 | 12 | 8 |
  | Meditation | 30 | 12 | 8 | 12 | 10 | 6 | 13 | 9 |
  | Family | 32 | 15 | 8 | 11 | 14 | 8 | 5 | 7 |
- Dasha–Hora is graded for same-planet, natural-friend, neutral and natural-enemy relationships; a cautious natal Dasha placement/dignity/conjunction can reduce that signal. Activity-relevant house lords use natal and candidate-time placements/dignity. Jupiter/Saturn Gochara is assessed from the natal Moon sign when event-chart data is available.
- Scores remain traditional heuristic rankings, not empirical probability estimates, objective measures of efficacy, or outcome guarantees. Do not claim Ashtakavarga or other unimplemented factors are part of this score.
- The relevant Vimshottari lord is evaluated at each candidate instant, not merely once at noon.
- Birth times are explicitly tied to a selected IANA timezone. Existing charts without a timezone retain legacy Nepal Standard Time meaning. DST gaps and ambiguous folds are rejected rather than guessed.
- Relative score is NOT the probability of success. The inputs and rules are traditional interpretations; astronomical timestamps are separately verifiable.
- Selected activity interests drive Hora, Tatwa, and matching Rashifal domain, where present. Do not invent missing birth data or domains.

## Verification commands and gates
- `npm run typecheck`
- `npm run test:patro-tools` (includes exact UTC segment fixtures, source status, DST civil bounds, natal DST conversion, dead settings migration, and caution cap)
- `npm run build`
- `npx playwright install --with-deps chromium`, serve `dist` with `vite preview`, run `node scripts/check-mytime-ring.cjs`.
- Manual Cloudflare Browser Rendering: 320, 360, 390, 430, 768, 1365 px; RTL not required. Test Nepali/English, UTC, Kathmandu, Tokyo, London March/October DST, selected historical date at midnight, ring touch/keyboard, no horizontal overflow.
- Independent astronomical comparison: Tithi and Nakshatra transitions, sunrise/sunset and Muhurta intervals against explicitly versioned reference fixtures. A known discrepancy blocks rollout.
- Respect reduced motion and do not log exact user lat/lng in unredacted Cloudflare query strings.

## Rollout
Deploy through normal review and CI only after the single integrated PR meets all gates. Do not change the Cloudflare production flag or merge solely on source inspection. Existing page can continue serving during review.
