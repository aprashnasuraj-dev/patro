# Homepage polish and voice homophone follow-up

This follow-up belongs to combined PR #117. Production release is held: no merge, deployment, Worker rename, URL deletion, or check bypass is authorized by this change.

## Changes

- The homepage “फेरि काम लाग्ने उपकरण” section includes the existing feature catalog plus जन्मदिन पात्रो and चिना. Links are deduplicated; other pages retain the compact shortcuts. Existing six-slot saved shortcuts and storage key are preserved.
- Remove one duplicate ज्योतिष link from the top navigation; the existing enhancer link remains. `/jyotish/china` remains accessible and indexed.
- Both browser and server voice results use the same Nepali cleanup. Grammatical छ is preserved when spoken-number conversion is on, except in explicit numeric contexts. A narrow predicate rule repairs ASR `सामर्थ्य 6/६` at a sentence boundary. It also covers क्षमता/आवश्यकता/सम्भावना/जरुरी/आवश्यक. Other numeric sixes and English transcripts remain unchanged. This does not guarantee recognition of all Nepali grammar or substitute for physical-device/provider tests.
- Upcoming festivals show actual BS month/day and civil-day distance from today's Nepal date. Expired events remain filtered out.
- Missing Nepal Sambat and selected-day tithi panels are hidden. The Panchang hides unavailable facts until real archive/calculated values exist.
- The copyright uses the current BS year, rather than a fixed AD year. About/privacy/contact links remain present; privacy label is “गोपनीयता नीति”. The install action reads “एप डाउनलोड”.

## Pasted homepage checklist disposition

| Item | Active homepage result |
|---|---|
| Today “नमुना डाटा · API जोड्नुहोस्” | Not present in the active page; no developer badge exposed |
| Missing tithi “API बाट” | No API fallback copy; unavailable fact/selected panels hidden |
| Rashifal/market sample badges | Not present in the active page |
| Phase preview / `?phase=` | No active phase switch; production homepage ignores phase query |
| Concept footer | Real footer, dynamic BS copyright, about/privacy/contact |
| Concept browser title | Existing Nepali SEO title and description retained |
| App action | “एप डाउनलोड” |
| Hardcoded festival date | BS date plus आज/भोलि/N दिनमा from actual data |
| Expired countdown | Active homepage has no countdown card; expired festival entries filtered |
| Calendar arrows | Existing working previous/next month navigation retained and exercised |
| Dead `#` links | Existing real logo/converter/rashifal links retained; skip-to-content anchor remains valid |
| Hardcoded Nepal Sambat | Existing archive data retained; missing date panel now hidden |

## Verification

- Typecheck passed; focused dictation suite: 20 tests; growth suite including civil festival dates: 16 tests.
- `npm run release:verify` passed: 376 test executions, two production builds, migration/reference checks and Cloudflare deployment dry run. All 22,902 protected URLs retained; 344 existing combined-PR additions; zero removed. Static file count: 3,715 / 19,500.
- Chromium at 380px and 1280px: 48 distinct tool links, exactly one top ज्योतिष link, missing selected tithi/NS and today's NS panels hidden, relative festival dates and expired-event filtering, footer/install copy, working month navigation, no dead `#` links, no document overflow or page JavaScript errors, saved shortcuts retained.
- Voice cleanup browser scenario passed with number conversion and Roman conversion enabled, including ASR “आजको युवाको प्रश्नको उत्तर दिने सामर्थ्य ६.” → “आजको युवाको प्रश्नको उत्तर दिने सामर्थ्य छ.”. The same script's visible unsupported-microphone and live-language-switch checks also passed on home and notes.
- Browser fixtures are synthetic; no real microphone audio or account credentials are used. External network/font requests are blocked in this browser fixture, so its screenshots cannot validate Nepali font appearance. Existing self-hosted growth fonts and SPA typography are unchanged.
- Machine-readable browser results: `home-polish/browser.json`; repeatable checks: `scripts/check-home-polish.cjs` and `VOICE_CASE=cleanup scripts/check-voice.cjs`.

Cloudflare's external preview integration was failing before this follow-up. GitHub provided no diagnostic details for its most recent failure. That remains an external release dependency until the Cloudflare logs are inspected and the preview check passes.
