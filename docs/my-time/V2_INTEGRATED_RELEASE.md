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
- A connected, validated JanmaPatro profile keeps the personal lucky-time card in the personalized experience even when an optional scoring component is unavailable. Confidence reflects the connected personal context; the score breakdown separately shows which components were actually applied. Never fabricate a missing score component or label a connected profile as general/limited solely because an optional signal is missing.
- The relevant Vimshottari lord is evaluated at each candidate instant, not merely once at noon.
- Birth times are explicitly tied to a selected IANA timezone. Existing charts without a timezone retain legacy Nepal Standard Time meaning. DST gaps and ambiguous folds are rejected rather than guessed.
- Relative score is NOT the probability of success. The inputs and rules are traditional interpretations; astronomical timestamps are separately verifiable.
- Selected activity interests drive Hora, Tatwa, and matching Rashifal domain, where present. Do not invent missing birth data or domains.

- The existing **LIVE PERSONAL TIME / Your personal time observatory and lucky time** card uses an explainable, activity-weighted ranking. Component order is Panchang, matching Rashifal domain, Dasha–Hora relationship, natal/candidate-chart lords, activity–Hora, activity–Tatwa, and Jupiter/Saturn Gochara. Missing components are omitted and the remaining weights normalized to 100; the displayed component weights are effective weights.
- Activity profiles (Panchang / Rashifal / Dasha–Hora / chart lords / activity–Hora / activity–Tatwa / Gochara) are: general 35/18/12/15/10/5/5; work 32/16/12/21/11/3/5; study 34/18/10/15/12/6/5; travel 35/15/10/15/13/7/5; prayer 35/15/10/12/8/12/8; meditation 35/14/10/12/8/13/8; family 35/17/10/15/10/6/7.
- The saved `aafnai.jyotish.china.context.v1` profile is the single natal-chart source. Candidate-time Lagna/planet positions are calculated for each proposed window at the selected location through the existing `calculateChart` Jyotish engine; do not create another birth-profile calculation or send birth details to another server.
- Dasha–Hora uses a documented graded relationship heuristic (same lord 98, natural friend 85, neutral/not configured 60, natural enemy 35), with an additional reduction when the saved Dasha lord has low dignity/affliction indicators. The chart-lord component uses sign dignity and same-house conjunction heuristics; it is not a certified Shadbala, full yoga analysis, or complete classical Muhurta judgement.
- Jupiter/Saturn Gochara is compared with available natal Moon-sign and Lagna houses. Because these are slow-moving transits, their score may be identical across windows on the same date. Activity-linked Choghadiya adjustments are modest preference modifiers and do not remove explicit Rahu Kaal/Yamaganda/Gulika score caps.
- A connected JanmaPatro profile remains in the personalized experience; available score components are shown in the bilingual breakdown instead of presenting a separate “limited signals” user state when an optional component is absent. A missing event-time chart is never fabricated; the breakdown describes the natal-only contribution when available.
- The user-facing score is a relative traditional ranking, not a probability of success. Explain the component scores and caution caps in Nepali and English; never present astrological scoring as a guaranteed outcome.

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

- Chart-lord scoring includes sign dignity, same-house affliction and a simple Lagna-dependent functional house-ownership modifier. It is not certified Shadbala, a full yoga analysis or a complete classical Muhurta judgement. The existing saved JanmaPatro context does not expose verified Ashtakavarga points, so the score does not invent or use them.
