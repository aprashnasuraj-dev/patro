# Task: Fix voice typing, add "festival timing for where you are", and build "मेरो असली जन्मदिन" — without losing any feature

Repository: `aprashnasuraj-dev/patro`, live at [https://aafnaipatro.com](https://aafnaipatro.com). It is a React 19 + Vite single-page app on one Cloudflare Worker, with D1/KV/R2 storage.

Read `README.md`, `DEPLOY.md` and `docs/AAFNAIPATRO_10_STEP_STATUS.md` first.

## Rule that overrides everything: no regressions

Every change is **additive or behaviour-preserving**. Do NOT:

- remove or rename any route, tool, URL or canonical;
- remove any existing UI control;
- change any `localStorage`/IndexedDB/account-sync key or data shape in a way that loses data;
- change any calendar, panchang or festival value;
- weaken the CSP;
- add D1 reads on hot paths (the D1 read quota is constrained).

**Defaults stay exactly as they are today:** Kathmandu location, Nepali language, Nepal's official festival dates. New behaviour is opt-in or shown alongside the existing behaviour, never instead of it.

**Before coding:**

1. Record a baseline: `npm run release:verify`.
2. Take Playwright screenshots of every route you touch at 375 / 768 / 1280 px.
3. List every storage key you will read.

**For every change:**

- one small PR per numbered item;
- new tests in the existing `tests/*` contract style;
- a "Preserved behaviours" checklist and rollback steps in each PR.

---

# PART 1 — Voice typing (fix first)

## Findings already verified on production (8 Oct 2026)

1. **The server fallback is switched off in production.**&#x20;
   - `GET /api/nepali/speech-capabilities` returns `stt.server: false`.
   - `POST /api/nepali/stt` returns `503 {"error":"speech_backend_unconfigured"}`.
   - `worker/speech.ts` only reads `Groq_API` / `GROQ_API_KEY` / `GROQ_KEY`, and none of them is set.
   - Result: every browser where live recognition doesn't work has **no working voice typing at all**.
2. **Browsers that offer the speech API but can't actually run it.** Brave, Electron apps, some Chromium forks, and possibly Samsung Internet expose `webkitSpeechRecognition`, but recognition fails, typically with a `network` error.&#x20;
   - In a Chromium/Electron shell, `SpeechRecognition.available({langs:['ne-NP']})` returned `"available"`, yet these shells usually can't reach Google's speech service.
   - **Feature detection is therefore not proof that it works.** Only a successful `onresult` proves it.
3. **In-app browsers have no Web Speech API at all.** Facebook, Messenger, Instagram, TikTok and Viber open links in an Android WebView without it. This is a large share of Nepali traffic.&#x20;
   - With the server fallback off, the mic simply **disappears**: `HomeQuickNote` renders the mic only when `mode !== "unsupported"`.
4. **Android Chrome problems** (`useNepaliDictation.ts`, browser mode):&#x20;
   - `continuous = true` is unreliable on Android: results get re-delivered or accumulate. Deduplicating by result index (`finalized` Set) does not stop repeated phrases.
   - Android ends the session after a short pause. `onend` sets `listening=false` with no auto-restart, so users think it stopped working.
5. **Error handling:**&#x20;
   - `service-not-allowed` (iOS Safari / Siri dictation disabled, or an unsupported language) is shown as "please allow the microphone", which is wrong advice.
   - Fallback to the server only happens for `network` / `language-not-supported`, and needs a second tap.
6. **Language switching:** `HomeQuickNote` lets the user switch नेपाली/English while listening, but the running recognizer keeps the old language. `VoiceTypingTool` handles this correctly; the note components don't.
7. **Where text lands:**&#x20;
   - Dictated text is always appended at the **end** of the textarea, not at the cursor.
   - Interim text appears in a separate `<p>` below the box instead of in place.
8. **Diary mode buttons** (`MyDiary.tsx` → `NoteComposer`):&#x20;
   - In English mode, pressing "बोलेर" starts English recognition, but the "voice" mode never shows as active.
   - `recognition` (`useRef`) is unused leftover code.
9. **Server mode** has a hard 60 s cap, with no progress shown and no chunking.

## Fixes (keep the public API of `useNepaliDictation` backward compatible)

**V1 – Turn on server transcription using Cloudflare's own AI.**

- Add an `AI` binding to `wrangler.jsonc`.
- In `worker/speech.ts`, use provider order: **Workers AI `@cf/openai/whisper-large-v3-turbo`** (audio as base64; `language: "ne"|"en"`; `initial_prompt` set to the existing Nepali prompt) → **Groq** if a key exists → existing error JSON.
- `speech-capabilities` must report `server: true` when either provider exists.
- Keep the request/response contract identical (`{text, language, provider}`).
- Add rate limiting per IP and per day, using the Cache API, not D1.
- Keep the existing privacy text: audio is never stored.

**V2 – Probe that recognition actually works; don't trust feature detection.**

- Treat browser mode as "working" only after the first `onresult` or `onaudiostart` arrives.
- On `network`, `service-not-allowed`, `language-not-supported`, or no `onaudiostart` within \~3 s, switch automatically to server mode **in the same tap**: start `MediaRecorder` immediately so the user doesn't have to press again.
- Remember the result per browser in a new key, `patro.voice.engine.v1`.

**V3 – Android Chrome reliability.**

- Detect Android.
- Use `continuous=false` with a controlled **auto-restart loop** while the user's "listening" intent is on: restart in `onend`, with backoff, and a maximum session of 10 minutes.
- Build final text by **diffing** against what is already committed, so repeated or cumulative results can't duplicate words.
- Add unit tests that replay recorded Android-style event sequences (fixtures) and assert there are no duplicate words.

**V4 – Chunked server mode.**

- Record 10–15 s chunks, ideally cut at silence using a simple RMS check (voice activity detection).
- Transcribe chunks in order and append each as it returns ("pseudo-live").
- Remove the 60 s cap and show a progress pill.

**V5 – Insert at the cursor, and show interim text in place.**

- Insert final text at `selectionStart` and keep the cursor after it.
- Show interim text as a faded overlay span inside the editor.
- Keep `onFinal` working for existing callers.

**V6 – Clear guidance when voice can't work in this browser.**

- Never silently hide the mic. If voice really can't work, show the mic in a disabled-with-help state.
- In-app browsers (detect `FBAN|FBAV|Instagram|Line|TikTok|Viber` in the user agent): show "Chrome मा खोल्नुहोस्" with an Android `intent://` link, plus copy-link.
- iOS: explain that Siri dictation must be enabled, and offer server mode.
- Fix the error-message mapping from item 5.

**V7 – Language switching during listening** in `HomeQuickNote` and `NoteComposer`: stop and restart the recognizer with the new language, as `VoiceTypingTool` does.

**V8 – Better Nepali cleanup** (`postProcessDictation`):

- Accept spoken-punctuation variants: "पूर्ण विराम", "फुलस्टप", "कमा", "प्रश्न चिन्ह", "नयाँ लाइन/हरफ".
- Optionally convert spoken numbers.
- Keep English words in mixed Nepali-English speech, in Latin script by default, with a user toggle to transliterate.
- Never remove ZWNJ/ZWJ inside a word unless the existing `normalize` rule already does so.

**V9 – Optional on-device recognition.** Where `SpeechRecognition.available({langs:['ne-NP'], processLocally:true})` returns `downloadable`, offer "अफलाइन आवाज डाउनलोड गर्नुहोस्" and call `install()`. Treat `downloading` that never finishes (the Brave case) as unavailable after a timeout.

**Accept when:** an automated Playwright run with a mocked `SpeechRecognition` and mocked `MediaRecorder` passes for:

- Chrome desktop live;
- Android live with restarts, no duplicate words;
- an SR-exposed-but-failing browser (automatic switch to server in one tap);
- no SR at all (server mode);
- server unconfigured (a clear error, and the mic still visible).

A manual test matrix in the PR covers Chrome Android, Samsung Internet, iOS Safari, the Facebook in-app browser, Firefox and Brave.

## New voice features (additive, after V1–V9)

- **V10 बोलेर सोध्नुहोस्:** a mic in the Patro bot. Asking "दशैं कहिले?" goes through the existing `patroBotEngine` and the answer is read aloud with the existing Read-Aloud text-to-speech.
- **V11 Voice reminders:** "भोलि बिहान ७ बजे औषधि" or "असोज २५ गते आमाको तिथि" is parsed into an existing reminder or tithi event. A confirmation sheet appears before saving.
- **V12 Voice → Preeti:** a one-tap "Preeti मा कपी" button after dictation, using `packages/core/src/preeti.ts`, for offices that still use Preeti.
- **V13 बोलेर निवेदन:** application-letter templates (leave, recommendation, office request) filled by voice and exported as PDF with the existing exporter.
- **V14 Hajurba mode:** a large hold-to-talk button and a large-font transcript, with the text read back automatically for confirmation.

---

# PART 2 — Festival timing for where you are

## Principles

- **Nepal's official date and sait (decided by the Panchang Nirnayak Samiti / MoHA list) stay the default and are always shown first.** Location-based timing is an *additional* row: "तपाईंको ठाउँमा".
- When a location's computed date differs from Nepal's, show both and explain why in one line, e.g. "तिथि यहाँको सूर्योदयमा फरक पर्छ". Let the user choose which one their reminders follow.
- Everything is computed client-side with the existing engine: `src/patro-tools/core/astro.ts` (`sunriseSunset`, `dayPanchang`, `panchangAt`, `tithiEndAfter`) and `tithi-events/engine.ts` (`occurrences(rule, from, to, loc)`, which already supports `udaya / madhyahna / aparahna / pradosh / nishitha`). Do this with **no new D1 reads**, and lazy-load the astronomy code.
- Rules for ritual time windows (pradosh length, nishitha, parana, sutak) live in **one reviewed config file**. Each rule records its source and a reviewer. A qualified pandit signs off before public launch.

## Build

**F1 – "मेरो ठाउँ" (my place).**

- One shared saved location, stored under a new key `patro.place.v1` as `{name, lat, lon, tz, source}`.
- Sources: browser geolocation (opt-in), a city search covering Nepal plus \~60 diaspora cities (Doha, Dubai, Riyadh, Kuwait, Kuala Lumpur, Seoul, Tokyo, Sydney, Melbourne, London, New York, Dallas, Toronto, Hong Kong, Delhi, …), or a suggestion from `patro.weather.city.v1`.
- The default when none is set is Kathmandu, so existing behaviour is unchanged.
- **Fix the bug** in `PrayerTimesCard.tsx`: geolocation always sets `tz: 'Asia/Kathmandu'`. Use `Intl.DateTimeFormat().resolvedOptions().timeZone`, or the city's IANA zone.

**F2 – "तपाईंको ठाउँमा" timing card**, added to `/`, `/date/*`, festival pages and `/tools/astro`. It shows local sunrise, sunset, moonrise, tithi start/end and paksha, alongside the Kathmandu values that are already there.

**F3 – Per-festival windows for the chosen place.** Each row shows both the official Nepal (NPT) time and the local time.

- **Dashain tika / Ghatasthapana / Bhai tika:** the official NPT sait converted to local clock time ("Nepal's sait at 10:37 NPT = 03:52 London"). Optionally also show the local aparahna window, labelled.
- **Laxmi Puja:** the local pradosh window.
- **Chhath:** sandhya arghya at local **sunset** on Shashthi, usha arghya at local **sunrise** on Saptami.
- **Mahashivaratri / Krishna Janmashtami:** the local nishitha window.
- **Teej / Rishi Panchami:** local sunrise, plus when the fast ends.
- **Every Ekadashi:** the local fasting day, plus the **parana window** next day (after sunrise, before Dwadashi ends; avoid the configured *hari-vasara* window). People who fast regularly use this every two weeks.
- **Purnima/Aunsi** start and end times; **Chaturthi vrat** local moonrise; **Sankranti** moment in local time.
- **Ramadan sehri/iftar:** already exists. Reuse it with the corrected time zone.

**F4 – Sun-direction compass for Chhath and Surya arghya.**

- Show the azimuth of sunrise/sunset at the user's place ("सूर्य ११२° बाट उदाउँछ") with a compass arrow.
- Use `DeviceOrientationEvent`, after a permission prompt on iOS.
- Works offline at the ghat.

**F5 – Grahan (eclipse) local timing** using astronomy-engine eclipse search:

- whether it's visible from your place, and the contact times;
- sutak start and end from the reviewed config;
- a share card.

**F6 – Reminders and sharing.**

- Push notifications via the existing `worker/push.ts`, e.g. "अर्घ्य ३० मिनेटमा" or "लक्ष्मी पूजा प्रदोष सुरु".
- `.ics` export with local times.
- A share card "Laxmi Puja muhurta in Sydney 6:12–8:40 pm" that links back to the page.

**F7 – Edge cases.**

- High latitudes where the sun doesn't rise or set (Nordic diaspora): show a clear note and fall back to the configured rule.
- Daylight-saving transitions.
- Places across the date line.
- Tests use fixed reference cases for Kathmandu, Doha, Sydney, London and New York. Kathmandu results must match the existing archive's sunrise/sunset to within 1 minute.

**Accept when:**

- With no saved place, every page is pixel-identical to the baseline.
- With a place set, the extra rows appear.
- Official Nepal dates are never changed.

---

# PART 3 — "मेरो असली जन्मदिन" (My Real Birthday)

Build on what already exists:

- `src/patro-tools/birth-card/build.ts` (nakshatra, pada, name syllable, rashi, moon phase, nearby festivals, history headlines, days alive, next tithi birthday) and `BirthFrontPage.tsx`;
- `JanmadinAkhbarTool.tsx`;
- `jyotish/jyotishEngine.ts` (chart, dashas, guna);
- `baby/nakshatra-names.ts`;
- `tithi-events/engine.ts`;
- the community converters: `nepal-sambat/engine.ts` with Newa script, `kirat/yele.ts`, `lhosar/lho.ts` (Tamang/Gurung/Tibetan animal + element), `mithila/tirhuta.ts`, `hijri/calendar.ts`;
- `StandUnderThisSky.tsx`, `MoonSvg.tsx`;
- On This Day / Time Machine;
- `FutureLetterTool` and the encrypted letters.

**Data:** use the static calendar archive. Each day row already has tithi with start/end, paksha, nakshatra + pada, yoga, karana, chandra and surya rashi, ritu, purnimanta/amanta month, adhik flag, sunrise/sunset, moonrise/moonset, moon illumination %, Nepal Sambat year, Saka year. Do not add D1 reads.

**Inputs:** birth date (BS or AD); time and place optional. Without a time, values are taken at local sunrise and labelled "समय नदिँदा सूर्योदयको आधारमा".

**Privacy:** computed on the device and saved locally. Account sync only if the user opts in. Share cards never include birth time or place unless the user turns that on.

**Mount it** as a new section of `/tools/janmadin-akhbar` and a new route `/janmadin`. The existing tool keeps working unchanged.

## Modules

- **J1 तीन जन्मदिन (three birthdays):** this year's AD, BS and **tithi** birthdays, each with weekday and days remaining, plus a 10-year table.&#x20;
  - Highlight **"जन्मदिन सङ्गम" (alignment) years**, when all three fall on the same or adjacent days.
  - The moon and sun calendars realign about every 19 years (Metonic cycle: 235 lunar months ≈ 19 solar years). Compute the exact years from the archive; don't state a fixed rule.
- **J2 जन्म पञ्चाङ्ग (birth panchang):** the full card for the birth day or instant. Tithi with paksha (waxing or waning moon), nakshatra and pada, yoga, karana, chandra and surya rashi, ritu, ayana, lunar month, adhik-masa flag, sunrise/sunset, moonrise, moon illumination, plus the Nepal Sambat and Saka dates.
- **J3 जन्म नक्षत्र (birth star):**&#x20;
  - the nakshatra's presiding deity and symbol;
  - **name syllable** (नामाक्षर, already in `PADA_SYLLABLES`);
  - **जन्म-वृक्ष (birth tree)** from the Nakshatravana tradition (27 stars ↔ 27 trees);
  - a "plant your birth tree on your tithi birthday" action, with a Nepal-suitable alternative species where the classical tree doesn't grow locally;
  - deity and tree tables are config with a source and reviewer for each row. Traditions vary, so say so.
- **J4 नेपालका पात्रोमा मेरो जन्मदिन (my birthday in Nepal's calendars):**&#x20;
  - BS;
  - Nepal Sambat lunar date in Devanagari **and Newa script**;
  - Saka;
  - Kirat Yele Sambat year;
  - Tamang / Gurung / Tibetan **lho** animal (Tibetan with element);
  - Mithila (Tirhuta script);
  - Hijri (marked as an estimate);
  - one beautiful card that honours every community.
- **J5 जीवनका जूनहरू (the moons of your life):**&#x20;
  - the number of full moons, Ekadashis, Dashains and Sankrantis you have lived through, counted from the archive and the astronomy code;
  - your next round-number full moon ("तपाईंको ५००औँ पूर्णिमा: …");
  - **सहस्र चन्द्र दर्शन (seeing a thousand full moons):** the date of the 1000th full moon, about 80 years 10 months;
  - for elders, an **estimated Newar Janku window**. Sources differ on the exact ages, e.g. Bhimratha 77y 7m 7d, Chandraratha 82y 4m 4d or 83y, Devaratha 88y 8m 8d, Divyaratha 99y 9m 9d. Show estimates only, with "पुरोहितसँग पक्का गर्नुहोस्" (confirm with your family priest).
- **J6 जन्मको आकाश (the sky at birth):** `StandUnderThisSky` and `MoonSvg` at the birth instant and place: visible planets and the moon phase.
- **J7 जन्मदिनको नेपाल (Nepal on the day you were born):** the existing history and Time Machine items for that date and BS day. Keep the existing "unverified" labelling.
- **J8 जन्मदिन सङ्कल्प (yearly reflection ritual):**&#x20;
  - a push reminder at local sunrise on the tithi birthday;
  - a 5-step guided flow: light a diyo → gratitude to parents (send a voice note or call) → a daan or seva idea (non-commercial) → plant or water your birth tree → write a **सङ्कल्प पत्र (vow letter)** with the existing Future Letter tool, which opens automatically on the next tithi birthday;
  - optionally record a parent's voice blessing to keep.
- **J9 परिवारको नक्षत्र माला (family constellation):**&#x20;
  - add family members to see everyone's three birthdays and tithi-birthday reminders through `tithi-events`;
  - a share image drawing each member's birth star as one family constellation;
  - countdowns to elders' Janku and 1000th full moon.
- **J10 Share cards:** three designs (Three Birthdays, Birth Star & Tree, Calendars of Nepal). Lazy-load the export code.

## Spiritual-content guardrails (mandatory)

- Frame everything as **reflection and tradition, not prediction**.&#x20;
  - No fear wording: no "dosha" alarms, no manglik scare.
  - No paid puja, gem or rudraksha upsell.
  - Existing Janma Patro dasha tables stay as they are, but do not surface them in share cards.
- **Every deity, tree, ritual or age rule cites a source**, plus a "परम्परा फरक हुन सक्छ" (traditions may differ) note. A named reviewer approves before launch.
- **Inclusive display modes:**&#x20;
  - full (Hindu panchang);
  - Buddhist (purnima/uposatha focus);
  - Kirat, Tamang/Gurung/Tibetan and Muslim (their own calendar first);
  - calendar-only (no deity or jyotish layers).
- **Accessibility:** works in English and Nepali, is fully readable by screen readers, and share images have alt text.

**Accept when:**

- J1 dates match the archive for 20 random birthdays (tests).
- Alignment years are computed, not hard-coded.
- J4 matches each community converter's own output.
- The existing Janmadin Akhbar and Janma Patro pages are pixel-identical to the baseline.
- No data leaves the device unless the user opts in to sync.