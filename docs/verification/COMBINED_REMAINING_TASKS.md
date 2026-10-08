# Combined prompt implementation and verification

Verified 2026-10-08 against main `bfb4e0e552d4a95e5f298911dfa68903badd2704`. Scope includes both preserved prompts: `docs/specs/VOICE_PLACE_BIRTHDAY_REQUEST.md` and `docs/growth/UPLOADED_FREE_PLAN.md`. One combined PR targets main; no merge or production deployment is performed. Earlier V1–V10 branches remain intact and are included through their ancestry; do not merge those stacked PRs separately after accepting this combined change.

## Verified result

- Baseline release verification passed. Combined `npm run release:verify` passed: 372 test executions, two production builds, Cloudflare dry run, dataset guards and URL guards. Seven additional growth SEO tests passed.
- Final font-only correction passed TypeScript, all 14 growth-page tests, growth prerender, SEO validation, URL/file guards and a fresh Cloudflare dry run. The full release run preceded this isolated font correction; it is not represented as a later full rerun.
- Final artifact contains **23,246 indexable URLs**: **22,902 baseline URLs retained, 344 added, zero removed**. New URLs comprise 337 growth routes, six existing guide additions and the opt-in birthday landing page. The immutable baseline was not recaptured or overwritten.
- **3,713 static files**, below the configured 19,500 guard. Most existing date pages continue using their prior Worker routes; URL count is not static-file count.
- Chromium passed all 19 mocked voice scenarios and two bot/reminder flows. Final combined browser checks passed for home, moon, German moon, Nepal year, Kathmandu weather, Everest trek weather and birthday. No JavaScript errors or document overflow at 380px on checked pages. Growth font load is explicitly tested. Moon/weather/home screenshots also cover 1280px.
- Forty fixed Kathmandu archive dates retain sunrise/sunset within one minute. Twenty fixed-seed birthdays independently check archive recurrence including unavailable years. DST, repeated/skipped civil times, date-line and polar cases are tested. These checks are internal regression evidence, not independent astronomical calibration.
- Browser birthday calculation does not auto-save, preserves an unknown pre-existing private field, sends no birth date to an API, defaults private export fields off, and requires explicit family reminder copying.

Evidence: [release summary](combined/release-summary.txt), [baseline summary](combined/baseline-release-summary.txt), [URL guard](combined/url-preservation-final.json), [before browser](combined/before-browser.json), [after browser](combined/after-browser.json), [voice scenarios](combined/voice-browser.txt), [voice flows](combined/voice-features.txt), [font follow-up](combined/font-verification.txt).

## Requirement status

| Item | Implemented behavior | Verification / remaining dependency |
|---|---|---|
| V1–V9 | Workers AI/Groq fallback, real recognition probe, Android settling/restarts, chunks, cursor insertion, browser help, locale restart, cleanup, gesture-only local recognition | Server/engine contracts and mocked browser scenarios pass; actual device/provider validation remains |
| V10 | Shared existing bot answer, transcript review and existing TTS | Browser bot flow passes |
| V11 | Reviewed voice reminder parsing before existing local save | Browser medicine, cancel, due/tithi and storage checks pass |
| V12 | Existing Preeti conversion and explicit copy | Contract tests pass |
| V13 | Reviewed application fields, preview and existing PDF export | Contract tests pass; manual PDF/device review remains |
| V14 | Opt-in large hold-to-talk controls and settled readback | Contract tests pass; physical accessibility/device review remains |
| F1 | Explicit saved place, city search/GPS and local timezone | Validation contracts; default Kathmandu retained |
| F2 | Lazy opt-in local timing alongside original Nepal information | Timing/route contracts pass |
| F3 | Local windows and supplied NPT sait conversion | Religious windows stay closed pending named reviewer |
| F4 | Opt-in sun bearing compass | East/west azimuth and DST civil-day tests pass; real sensor test remains |
| F5 | Local eclipse visibility and contacts | Contact order/reference duration passes; sutak remains gated |
| F6 | Existing consented push jobs, ICS and PNG | ICS UTC/escaping and existing push contracts pass; real push-device delivery remains |
| F7 | DST, date line and explicit polar handling | Edge cases and forty Kathmandu dates pass |
| J1 | Ten-year AD/BS/tithi comparison, alignment, remaining days | Twenty independently matched archive fixtures pass; missing archive values stay unavailable |
| J2 | Original birth archive plus explicitly calculated time/place fields | Original row equality and instant/transition checks pass |
| J3 | Sourced 27 deity/symbol/tree records | Named religious/ecological reviewers and regional tree alternatives remain pending; public recommendations closed |
| J4 | Existing NS/Saka/Yele/Lho/Hijri conversion and Tirhuta transcription; community-first ordering | Calendar contracts pass; no invented Mithila date algorithm |
| J5 | Exact lunar phase milestones and archive-backed observance counts | Count/phase tests pass; Janku rules remain gated |
| J6 | Calculated birth sky, decorative sky, cultural cards | Sky/calendar contracts pass; decorative illustration is labelled |
| J7 | Exact-date static history with source labels | Static-only/private-date contracts and browser checks pass; missing exact BS historical matches not invented |
| J8 | Local reflections, encrypted vow, consented reminder and 60-second local blessing | Crypto/storage contracts pass; real microphone/notification checks remain |
| J9 | Device-local family constellation and elder moon milestones | Browser local save/consent checks pass; reviewed Janku content pending |
| J10 | Three explicit share designs and accessible alternatives | Private fields off in browser; manual export review remains |
| Growth 1 | 337 prerendered pages, additive sitemap, preserved config/crons | Growth tests, URL/file guards and mobile checks pass; native DE/FR/ES/IT review pending |
| Growth 2.1 | Analytics JS bypasses Worker; preserved static security/cache headers | Header/routing contracts pass |
| Growth 2.2 | Signed-in hint and one-time legacy session migration | Auth/cookie/logout/expiry contracts pass; merge-date note below |
| Growth 2.3 | Static monthly history, original API fallback | Three-date record parity and failure contracts pass |
| Growth 2.4 | Browser Open-Meteo, guarded 30-minute cache and legacy fallback | Normalization, cache, blocked upstream and browser fixtures pass |
| Growth 2.5 | Weighted PV sampling, optional Web Analytics beacon, indexed daily rollups and covered retention | Actual SQLite migration/rollup/prune and sampling tests pass; production migration/token/measurements pending |
| Growth 2.6 | Optional anonymous HTML cache | Deliberately skipped: HTML depends on published/preview/admin/config state |
| Growth 3 | Existing four crons, static reference preference, bounded rollup backfill, reduced KV writes and safe refresh workflow | Local scheduled handler returns 200; production CPU and three-day quota audit pending |

## Measured homepage requests

| Browser fixture | Main before | Combined after | Expected sampled PV addition |
|---|---:|---:|---:|
| Returning anonymous | 13 | 3 | 0.1 per page view on average |
| Signed-in marker + synthetic account | 14 | 5 | 0.1 per page view on average |

Counts include HTML and exclude `/assets/*`; after also excludes new static `/data/*` and analytics JS. Service workers are blocked for reproducible single navigation. Weather and auth use deterministic fixtures, with the same legacy/direct weather shape; these are not real production sessions or live-provider measurements. New anonymous migration visits add one auth probe until the migration window closes. Heartbeats after 60 seconds are excluded from these initial-navigation counts. Three remaining anonymous requests are HTML, speech capability discovery and the live event endpoint. The latter preserves runtime holiday overrides. The one-Worker-request estimate in the uploaded prompt has **not** been achieved; do not promise 100k daily homepage visitors within Free quotas.

PV sampling estimates page views only. Visitors are observed sampled visitors, not extrapolated unique people. Short visits can be absent from live presence until an unsampled heartbeat. Auth, heartbeats, forms and other application writes remain; a 90% reduction in total D1 writes is not claimed.

## Deployment and human tasks that remain

1. Owner merges this single PR and uses the existing gated deployment. No direct deploy bypass was introduced. Apply/confirm additive migration `0006_weighted_analytics_rollup.sql`; existing runtime bootstrap also detects the missing weight column. Verify legacy rows default to weight 1 and production rollup coverage before retention.
2. Auth migration currently ends **2026-11-07 UTC**, based on the October 8 start. If merge/deploy is delayed, change this cutoff to at least 30 days after deployment before release; otherwise legacy sessions could miss the migration window. `VITE_AUTH_PROBE=1` restores unconditional probes.
3. Configure a real Cloudflare Web Analytics token if wanted; none was fabricated. Tail production cron CPU and compare requests/D1 writes/KV writes for three days. Local scheduled success with no real VAPID jobs cannot demonstrate production CPU below 10ms or actual push delivery.
4. Submit/validate additive sitemap-growth.xml in authenticated Search Console/Bing; inspect crawl/index coverage and real search queries. No console submission or production traffic increase is claimed here.
5. Complete the physical Chrome Android, Samsung Internet, iOS Safari, Facebook WebView, Firefox and Brave matrix; test real microphone, hold-to-talk, GPS/orientation, export and push delivery. Complete native DE/FR/ES/IT review.
6. Obtain real named religious/ecological/region-specific reviews before enabling ritual timing, deity/tree recommendations, sutak or Janku. Local ecological alternatives are a content dependency still open. Reviewer fields remain null and public advice fails closed.

Some existing archive/history records already carry an unverified label; those labels are retained. The existing dataset audit has no external calibration dataset supplied. No unverified facts or named approvals were invented to mark the prompt finished.

The 100,000 visitor goal is a target, not a guaranteed result. Useful, differentiated pages and preserved indexed URLs are provided instead of 40,000 near-duplicate pages. Google's official policy describes scaled content abuse: https://developers.google.com/search/docs/essentials/spam-policies#scaled-content .

## Rollback

Original public APIs, reference archives, account collections and existing storage keys remain. Restore `AAP_HIT_SAMPLE=1` for full PV collection; remove the optional beacon token to disable it. `AAP_CONFIG_KV_WRITE=1` and `PUSH_KV_GATE=1` restore prior KV mirrors/gates at the cost of writes. `REFERENCE_R2_FIRST=1` restores outer durable reference caching; inner immutable loaders still prefer ASSETS and can be reverted separately. Client static weather/history/calendar paths retain old API fallbacks. New place/birthday modules can be removed from their opt-in mounts without deleting their local data. No destructive migration is required. `GROWTH_DYNAMIC=1` is a paid/dynamic fallback, not a Free-plan default.

Screenshots below contain synthetic fixture data. Existing SPA screenshots rely on the runtime's available fonts; the new standalone growth pages now self-host their Nepali font.

| Page | Mobile | Desktop |
|---|---|---|
| Home before | [380px](combined/before-home-mobile.png) | [1280px](combined/before-home-desktop.png) |
| Home after | [380px](combined/after-home-mobile.png) | [1280px](combined/after-home-desktop.png) |
| Moon | [380px](combined/moon-mobile.png) | [1280px](combined/moon-desktop.png) |
| Kathmandu weather | [380px](combined/weather_kathmandu-mobile.png) | [1280px](combined/weather_kathmandu-desktop.png) |
| Birthday | [380px](combined/birthday-mobile.png) | — |
