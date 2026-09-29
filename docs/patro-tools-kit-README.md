# Patro Tools Kit: master guide

Working, tested TypeScript modules for 11 tools, built to drop into a Next.js (App Router) + Vercel app:

| # | Tool | Module | Runs where |
|---|------|--------|-----------|
| 1 | Tithi-based personal events (श्राद्ध, तिथि जन्मदिन) + reminders + Google Calendar feed | `tithi-events/` | server + browser |
| 2 | Sait / muhurat finder (personalised with तारा बल / चन्द्र बल) | `sait/` | server + browser |
| 3 | Baby names by nakshatra, न्वारन / पास्नी / खोप timeline | `baby/` | browser |
| 4 | Birth-day newspaper front page (shareable PNG) | `birth-card/` | browser |
| 5 | Letters to a future BS date / tithi birthday | `letters/` + API routes | server + browser |
| 6 | Viber + Telegram patro bot, 6 AM morning brief | `bots/` + API routes | server |
| 7 | Nepali spelling checker (+ optional AI grammar pass) | `language/spellcheck.ts` | browser (+ API) |
| 8 | Nepali voice typing | `language/react/useNepaliDictation.ts` | browser (+ API fallback) |
| 9 | Nepali OCR | `language/react/useNepaliOcr.ts` | browser |
| 10 | Name-spelling consistency checker | `language/name-match.ts` | browser |
| 11 | Read aloud for elders | `language/react/useNepaliSpeech.ts` | browser (+ API fallback) |

`npm test` runs 41 tests, including real Nepal festival dates (Dashain 2024/2025, Laxmi Puja 2024/2025, Ghatasthapana, Teej) and today's live-app values (29 Sep 2026 = आश्विन कृष्ण तृतीया, sunrise 05:55, sunset 17:52).

---

## 0. Install into your app (30 minutes)

```bash
# copy
cp -r src/patro-tools   <your-app>/src/patro-tools
cp -r src/server/*      <your-app>/src/server/          # templates: replace with your DB/auth
cp -r src/app-routes/api/* <your-app>/src/app/api/       # Next.js route handlers
cp vercel.json .env.example <your-app>/

# deps
npm i astronomy-engine html-to-image tesseract.js
```

tsconfig paths:
```json
"paths": { "@/patro-tools/*": ["./src/patro-tools/*"], "@/server/*": ["./src/server/*"] }
```

### The one rule: everything goes through two adapters

1. **`PanchangProvider`** (`core/provider.ts`). All tools ask it for tithi, nakshatra, sunrise and lunar month. Wrap **your existing engine** so the calendar, reminders, sait and bots can never disagree:
   ```ts
   export const panchang = createPanchangProvider({
     primary: (date, loc) => myEngine.has(date, loc) ? myEngine.toDayPanchang(date, loc) : undefined,
   });
   ```
   If `primary` returns `undefined`, the built-in astronomy engine (`core/astro.ts`) is used. That covers far years and diaspora locations like Sydney or Doha.
2. **`BsAdapter`** (`src/server/bs-adapter.ts`). Wrap your verified BS↔AD converter. Never compute BS month lengths with a formula.

**Official data always wins.** Load the Nepal Panchang Nirnayak Samiti festival and sait lists as `official` / `officialDates`. The computed rules are a fallback and a cross-check. Add a CI job that computes 2000–2100 BS and diffs it against your official table.

---

## 1. Tithi-based personal events (the killer feature)

**Why the rules matter.** In 2024, Dashami had *not* started at sunrise on 12 Oct, yet Nepal did tika that day because Dashami is taken when it covers **aparahna** (afternoon). Laxmi Puja is taken on the **later** day that has ≥ 1 ghadi of Aunsi after sunset. A "tithi at sunrise" app gets both wrong, but this engine gets both right.

| Observance | Used for | Default day choice |
|---|---|---|
| `udaya` | birthdays, most vratas | first day with tithi at sunrise |
| `aparahna` | **श्राद्ध**, Vijaya Dashami | day with most afternoon coverage |
| `pradosh` | Laxmi Puja, Pradosh | later day with ≥ 24 min after sunset |
| `nishitha` | Shivaratri | most midnight coverage |
| `madhyahna` | Ram Navami etc. | most midday coverage |

**Recommended UX flow ("श्राद्ध थप्नुहोस्")**
1. The user picks "Who?", then gives either the **date and time of death** or the tithi directly.
2. `ruleFromDate(date, { time, observance: 'aparahna' })` fills in month, paksha and tithi. Show it for confirmation: *"कार्तिक कृष्ण अष्टमी — ठीक छ?"*
3. Show the next 3 dates with `nextOccurrences(rule, today, 3)`.
4. Reminders: `buildReminders(event, today)` gives reminders 7 days before (samagri + book the purohit), 1 day before, and on the morning itself. Push them to your queue.
5. Share with family (family group) and offer **"Google Calendar मा थप्नुहोस्"**.

```ts
import { ruleFromDate, nextOccurrences } from '@/patro-tools/tithi-events/engine';
import { buildReminders, toICS } from '@/patro-tools/tithi-events/events';
```

**Calendar subscription.** Serve `toICS(userEvents, today, 3)` at `/api/calendar/[secretToken].ics` with `content-type: text/calendar`. Users subscribe once in Google or Apple Calendar, and your events (and brand) appear there every year. Add a festival-only public feed too, since it's great for SEO and sharing.

**Adhik maas.** The default is `adhik: 'nija'`, which observes in the regular month. Let the family change it, because customs differ.

---

## 2. Sait finder

```ts
findSait({
  kind: 'vivah',                 // bratabandha | griha_pravesh | vehicle | business | namakaran
  from: '2026-11-01', to: '2027-06-30',
  people: [{ name: 'केटा', nakshatra: 3, rashi: 1 }, { name: 'केटी', nakshatra: 12, rashi: 5 }],
  officialDates: officialVivahDates,   // ALWAYS pass this
});
```
- **Hard filters:** nakshatra, weekday, rikta tithi/Aunsi, bad yoga, भद्रा (Vishti karana), चातुर्मास, खरमास, अधिक मास, शुक्र/गुरु अस्त (computed from real planet positions).
- **Personal score:** तारा बल and चन्द्र बल for each person.
- `saitShareText()` gives a ready Viber/WhatsApp message. Render the same data as a PDF card for the purohit.
- ⚠️ `sait/rules.ts` is **config, not code**. Have a jyotishi review it before launch. Always label computed dates "सम्भावित — पुरोहितसँग पक्का गर्नुहोस्".
- **v2:** lagna-based time windows within the day (वृष/सिंह/वृश्चिक/कुम्भ lagna for weddings).

---

## 3. Baby names + new-parent timeline

```ts
const star = birthStar(birthInstantUtc);          // अश्विनी, पद ४ → "ला"
namesForSyllables([star.syllable], { gender: 'f' }); // exact pada
namesForSyllables(star.nakshatraSyllables);          // all 4 — families often accept any
babyTimeline('2026-09-29', 'f', bsAdapter);          // न्वारन, पास्नी, खोप in BS
pasniSaits('2026-09-29', 'f', { name: 'छोरी', nakshatra: star.nakshatra, rashi: star.rashi });
```
- Matching is **pronunciation-lenient** (ि≈ी, ु≈ू, व≈ब, श/ष≈स), and bare-consonant syllables (घ, छ, ष) only match "consonant + अ".
- The included name list is a **starter (~90 names)**. Build a 5,000+ list with meanings and let users submit names with moderation. That list becomes a moat and brings SEO traffic (`/names/ashwini`, `/names/la-bata-suru`).
- ⚠️ `VACCINE_SCHEDULE` must be verified against the current national schedule (Family Welfare Division) and served as remote config. Always show "स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्".

---

## 4. Birth-day front page (जन्मदिनको अखबार)

```ts
const model = await buildBirthFrontPage({ birthDate, birthTime, name, bs: bsAdapter, history: myHistoryDb, today });
<BirthFrontPage model={model} shareUrl={`https://…/janmadin/${id}`} />
```
- Plug your **आज इतिहासमा / समययन्त्र** database into `HistoryProvider`.
- Includes a real moon-phase drawing for the birth moment, the नाम अक्षर, a nearby festival ("तिहारको ३ दिनपछि जन्म"), days alive, and the **next tithi birthday**, which links naturally into Tool 1.
- ⚠️ **Don't use Satori / `@vercel/og` for Nepali text.** It doesn't shape conjuncts (क्ष, श्र break). Render in the browser (`html-to-image`), upload the PNG once, and use it as `og:image` for `/janmadin/[id]` so Viber and Facebook previews look right.
- **Growth loop:** the share text ends with "तपाईं कहिले? 👉 link", and the link opens a form to make your own.

---

## 5. Letters to the future (भविष्यका लागि चिठी)

- **Two sealing modes** (`letters/crypto.ts`, pure WebCrypto):
  - `passphrase`: encrypted in the browser, and the server can never read it. The writer shares the passphrase ("हजुरआमाको गाउँको नाम").
  - `server`: AES-GCM with `LETTERS_KEY`, bound to the letter id (AAD), so ciphertexts can't be swapped.
- Unlock time: `openAtFromBs({ year: 2099, month: 1, day: 1 }, bsAdapter)` or `openAtFromTithiBirthday(rule, birthDate, 16)`.
- `GET /api/letters/:id` returns **423 Locked** with a countdown ("१२ वर्ष ४० दिन बाँकी") until `openAt`.
- An hourly cron runs `deliverDueLetters()`, which notifies and then marks the letter delivered (idempotent).
- **Trust is the product.** Letters may be 20 years out, so:
  - send the writer a sealed **backup PDF** (ciphertext + QR code + instructions);
  - write a public "if we shut down" promise (export all letters to recipients' emails);
  - keep the key in a secret manager, never rotate without keeping old keys by `kid`, and back up the DB off-site.
- 7-day edit window (`editableUntil`), after which the letter is locked forever. That also makes it feel ceremonial.

---

## 6. Viber + Telegram bot

```
User: dashain kahile?   → 🎉 विजया दशमी: <BS date from your converter> (2026-10-20) · २१ दिन बाँकी
User: 2083-06-13        → 2026-09-29
User: सुरु              → daily 6 AM brief
```
- `parseIntent()` understands Devanagari, Roman Nepali and English, with whole-word matching (so "bholi" is never read as "holi"; there's a test for this).
- `reply()` is channel-agnostic. Add WhatsApp or SMS by writing another small adapter.
- **Launch Telegram first** because it's free and instant. **Viber** is where Nepal is, but check the current bot terms: since 2024, new Viber bots go through a commercial/partner account with fees. **WhatsApp** proactive messages need approved templates and are billed per message.
- Setup: `telegram.setWebhook(token, 'https://…/api/bots/telegram', secret)`, `viber.setWebhook(token, 'https://…/api/bots/viber')`.
- The morning cron runs at 00:15 UTC (06:00 NPT) and uses Viber `broadcast_message` (300 per call).

---

## 7. Spelling checker

The checker has three layers, cheapest first:
1. `normalize()`: stray ZWJ/ZWNJ (keeps र्‍), doubled matras, `|` → `।`, space before danda. It's cheap enough to run on every keystroke.
2. `checkSpelling(text, dict)`: dictionary lookup, then **postposition stripping** (विद्यालयमा → विद्यालय + मा), then the **common-mistakes list** (परिक्षा → परीक्षा) and **confusion-set suggestions** (ि/ी, ु/ू, ब/व, स/श/ष, ं/ँ, न/ण, ज्ञ/ग्य…).
3. `POST /api/nepali/grammar`: an optional AI pass for grammar (लिङ्ग, वचन, आदरार्थी). Rate-limit it and make heavy use a premium feature.

**The dictionary is the product.** Build a frequency list from a large clean corpus you have rights to. Have an editor review the top ~50k words, ship it as gzipped JSON (~400 KB) cached by the service worker, and **log accepted corrections** to grow `COMMON_MISTAKES` every week.

UI tip: underline issues in a `contenteditable` or textarea overlay. Show a one-tap "सबै सच्याउनुहोस्" for `common_mistake` only; never auto-fix `unknown` words, since they may be names.

---

## 8. Voice typing

- `useNepaliDictation({ onFinal })` uses the Web Speech API with `lang = 'ne-NP'`. It's free and works in Chrome and Edge on desktop and Android.
- Spoken punctuation: "पूर्णविराम" → ।, "अल्पविराम" → ,, "प्रश्नचिन्ह" → ?, "नयाँ लाइन" → new line. Digits are converted to Nepali digits.
- Fallback (Firefox, some iOS): MediaRecorder sends audio to `/api/nepali/stt`, which calls Google STT (`ne-NP`, accepts WEBM_OPUS).
- Pipe the output through the spellchecker. Speech engines produce ि/ी errors too.

## 9. OCR

- `useNepaliOcr().recognize(file)` runs tesseract.js `nep+eng` entirely in the browser, so there's no server cost and the photo stays private.
- Preprocessing (upscale to ≥ 1500 px, grayscale, Otsu threshold) matters more than the model.
- For **Preeti-era PDFs**, extract the text (don't OCR it) and run your existing Preeti→Unicode converter. Detect this automatically when the text is mostly Latin symbols.

## 10. Name consistency

```ts
crossCheck([
  { document: 'राहदानी', fullName: 'Suraj Dahal', dobAD: '1995-01-01' },
  { document: 'नागरिकता', fullName: 'सुरज दाहाल' },
  { document: 'SEE', fullName: 'Sooraj Dahal', dobAD: '1995-01-02' },
]);
// → राहदानी/SEE: spelling_differs, राहदानी/SEE: जन्ममिति फरक
```
- It compares Devanagari with Roman automatically, and a script difference is **not** flagged.
- Verdicts: `match`, `spelling_differs` (Suraj/Sooraj, Laxmi/Lakshmi), `token_missing` (missing middle name), `order_differs`, `mismatch` (Sita/Gita).
- Link it to your **Document Vault**: when users add documents, run `crossCheck` automatically and warn *before* they apply for a visa or KYC. Convert BS DOBs with your adapter before comparing.

## 11. Read aloud

- `useNepaliSpeech().speak(text)` picks a browser `ne-NP` voice, then `hi-IN` (which reads Devanagari acceptably), then the server fallback `/api/nepali/tts` (Azure neural voices `ne-NP-HemkalaNeural` / `ne-NP-SagarNeural`).
- Text is split at । ? ! because some Chrome builds stop long utterances.
- **Cache audio** by hash(text+voice). Daily rashifal and "आजको पात्रो" are replayed thousands of times.
- Put a 🔊 button on every card: date, rashifal, news, letters. Offer an "elder mode" that auto-reads today's date on open.

---

## Rollout order (suggested)

| Week | Ship | Why |
|---|---|---|
| 1 | Tithi events + reminders + ICS feed | Core daily value; uses your engine |
| 1 | Telegram bot + morning brief | 1 day of work, instant distribution |
| 2 | Birth-day front page | Viral loop; reuses history DB |
| 2 | Spellcheck layers 1–2 + name checker | High-frequency tools; zero server cost |
| 3 | Sait finder (after jyotishi review) + baby names | Emotional, loyal users |
| 3 | Read aloud + voice typing | Elders + accessibility |
| 4 | Future letters | Needs trust/durability work first |
| 4 | OCR, AI grammar, Viber (after commercial approval) | Heavier / paid dependencies |

## Pre-launch checklist
- [ ] `PanchangProvider` wraps your engine; CI diff vs official table for 2000–2100 BS
- [ ] Official festival + sait lists loaded; computed ones labelled "सम्भावित"
- [ ] Jyotishi reviewed `sait/rules.ts`; health worker reviewed vaccine config
- [ ] Rate limits on `/api/nepali/*`; quotas for AI grammar and TTS
- [ ] `LETTERS_KEY` in a secret manager + off-site DB backups + shutdown promise page
- [ ] Privacy page: what's stored (birth details, family dates, letters), and delete/export buttons
- [ ] Every tool page has its own SEO URL (`/tools/name-checker`, `/sait/vivah-2083`, `/names/ashwini`…)

## File map
```
src/patro-tools/
  core/        types, names (Nepali labels), astro (engine), provider (adapter)
  tithi-events/ engine (observance rules), events (reminders, ICS)
  sait/        rules (config), finder
  baby/        nakshatra-names, care (timeline)
  festivals/   festival rules + resolver (used by bots & birth card)
  birth-card/  build, BirthFrontPage.tsx, MoonSvg.tsx
  letters/     crypto, letters (model, scheduling, delivery)
  bots/        intents, responder, channels (Viber/Telegram)
  language/    spellcheck, name-match, react/ (dictation, OCR, speech hooks)
src/app-routes/api/   Next.js route handlers → copy to src/app/api/
src/server/           TEMPLATES: letter-store, auth, notifier, bot-deps, bs-adapter
tests/                41 tests (vitest)
```
