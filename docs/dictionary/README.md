# नेपाली शब्दकोश — `/tool/nepalidictionary`

A Nepali ↔ English dictionary and learning tool inside Aafnai Patro. It runs on the existing stack: Vite/React SPA, Cloudflare Worker, static assets and D1. It needs no new services, secrets or bindings.

## What makes it different

Most Nepali dictionaries online are a search box and a definition. This one is built for students, people learning English, and writers.

| Feature | Route | Who it helps |
|---|---|---|
| 49,119 headwords. 9,101 have Nepali definitions, English meanings and examples. The rest are searchable, with their forms. | `/tool/nepalidictionary/<शब्द>` | everyone |
| Inflected and misspelt words find their headword: गरेको → गर्नु, घरहरूमा → घर, शहर → सहर, ghar → घर. The Worker answers with a 301. | same | students, typists |
| English → Nepali: 12,000 English words, ranked by real English frequency. Shows "house meaning in Nepali". | `/en/<word>` | English learners, SEO |
| Pronunciation (🔊) for Nepali and English, using the device voice. | everywhere | learners |
| Level lists A1–B2 (most frequent 500 / 1,500 / 3,000 / 6,000 words), in both directions. | `/sikau/<ne|en>-<level>` | students |
| ☆ "मेरा शब्द" flashcards with spaced repetition (SM-2), a daily due badge and streaks. Signed-in users sync across devices through D1. | `/abhyas` | learners |
| Exam practice: synonyms, antonyms, spelling (शुद्धाशुद्धि), ukhan, and meaning in both directions. Each round is 10 MCQs. Missed words go into the flashcards. | `/pariksha` | SEE, class 11–12 and Lok Sewa candidates |
| Nepali spell checker: ि/ी, ु/ू, श/ष/स, ब/व. It runs in the browser, so no text leaves the device. Includes "fix all". | `/shuddha` | writers, students |
| Rhymes (अनुप्रास), grouped as double, single and slant, with syllable counts. | `/anupras/<शब्द>` | poets, lyricists |
| Ukhan and tukka with meanings and English equivalents. | `/ukhan` | students |
| Word of the Day and English Word of the Day, keyed to today's BS date (Nepal time). | home | daily return visits |
| Tap-to-translate: double-click or select a word on news, rashifal, history, time-machine, guides and date pages to see its meaning. | app-wide | readers |
| रूपावली: generated word forms (–को, –मा, –हरू, –एको …). | word page | grammar learners |

## Architecture

```
data/dictionary/*.json + editorial/*.tsv            (source of truth, committed)
        │  npm run dict:build   (before vite build)
        ▼
public/data/dict/v1/                                  (generated, git-ignored, ~2,050 files)
  w/<hh>.json      9,101 word payloads in 256 shards (key: slug)
  r/<hh>.json      rhyme buckets in 256 shards
  idx/*.json       search index (2-char buckets) · en/*.json English index
  learn/ quiz/ spell/ browse/ ukhan.json wotd.json manifest.json
public/sitemap-nepalidictionary.xml (+ entry in sitemap.xml and seo-manifest.json)
        │  npm run dict:prerender   (after vite build)
        ▼
dist/tool/nepalidictionary/{,ukhan,en,sikau,sikau/*,pariksha,shuddha,abhyas}/index.html   (15 pages)
dist/data/dict/v1/shell.html   ← the app's index.html with placeholders
```

At request time:

- **`/data/*`** bypasses the Worker (`run_worker_first` exclusion). Browser searches and word loads are plain static-asset hits, so they are free and don't count as Worker requests.
- **`worker/dictionary.ts`** (first in `worker/optimized-entry.ts`):
  - **Server-rendered pages.** It renders word pages, `/akshar/<अ>[/n]`, `/anupras/<शब्द>` and `/en/<word>` from the shards. Each response is full SEO HTML with a canonical link, JSON-LD and the payload inlined, so React boots without a fetch.
  - **Caching.** Responses go into the edge cache under a key that includes the data's `builtAt`.
  - **Redirects and missing words.** Variants and inflected forms get a 301. Stubs are served `noindex`. Unknown words get a 404 `noindex`.
  - **Personal data.** `/api/v1/dictionary/*` (saved words and quiz history) is also handled here.
- **Fixed pages** fall through to `connected-entry`. It serves the prerendered file because the file contains `data-seo-prerender="true"`.
- **Client.** `src/features/dictionary` is lazy-loaded by `src/PatroRouter.tsx` through `DictionaryApp`. It uses Patro's own router, through a small shim in `nav.tsx`. `src/seo.ts` leaves the `<head>` of dictionary routes to the dictionary.

**Why shards and Worker rendering?** One HTML file per word would be about 25,000 files. That is over the 19,500-file deploy budget (`verify-static-file-budget`). The full build is now about 7,900 files.

## Commands

```bash
npm run dict:build        # editorial TSV → lexicon → shards, learning data, sitemap   (part of npm run build)
npm run dict:prerender    # fixed pages + shell into dist/                             (part of npm run build)
npm run test:dictionary   # core + learning + Worker/D1 tests                          (part of release:verify)
npm run dict:editorial    # only re-import data/dictionary/editorial/*.tsv
npm run dict:import       # re-import the open sources in data/dictionary/sources (rarely needed)
```

The scripts are TypeScript, run with Node 22's type stripping (`--experimental-strip-types`). They need no extra dependency.

## Editing words

1. Add or edit rows in `data/dictionary/editorial/*.tsv`. The columns are `lemma | pos | Nepali definition | English | example | example (en)`. Several rows with the same lemma become several senses. See `lexicon-sourcing.md`.
2. Run `npm run dict:build` and check the counts it prints.
3. Commit the TSV and `data/dictionary/lexicon.editorial.json`, then deploy as usual.

Files whose header says **AI DRAFT** were drafted by Claude and checked by a second reviewer pass. They are still worth an editor's read before they are promoted.

## Personal data (D1)

- `cloudflare/d1/schema-migrations/0007_dictionary_learning.sql` creates the tables `dict_saved_words` and `dict_quiz_results`.
  - The same DDL is in `ensureAuthSchema()`, because Cloudflare Builds doesn't apply migrations.
- **API**, using the existing `mp_session` Google sign-in. Writes are same-origin only.
  - `GET /api/v1/dictionary/cards`: the user's cards.
  - `PUT /api/v1/dictionary/cards` with body `{cards:[…]}`: upserts up to 200 cards per call, 5,000 per user.
  - `DELETE /api/v1/dictionary/cards?id=<id>`
  - `POST /api/v1/dictionary/quiz` with body `{mode, level, score, total}`
- **Signed out**, everything stays in `localStorage` on that device. On sign-in (`patro:auth-changed`), the device's cards and the account's cards are merged.
- `/api/v1/my-data` exports both tables, and account deletion removes them.

## SEO

- **Sitemap.** `sitemap-nepalidictionary.xml` has about 15,700 URLs:
  - 9,101 words
  - about 2,900 English words (`english.sitemapTop` in `data/dictionary/config.json`)
  - 3,590 rich rhyme pages
  - 76 A–Z pages
  - the fixed pages
- **The 29 canonical tools are unchanged.** The dictionary is a separate `/tool/` route with its own sitemap, so the tool-count contracts still hold.
- **Discovery inside the app.**
  - The tools page lists the dictionary under "भाषा र लेखन".
  - The feature launcher (search) finds it with "dictionary", "shabdakosh", "शब्दकोश", "अर्थ" and similar terms.
- Word titles follow the patterns "घरको अर्थ · Ghar meaning in English" and "House meaning in Nepali · houseको नेपाली अर्थ". The JSON-LD uses `DefinedTerm` and `BreadcrumbList`.

## Sources and licences

See `data/dictionary/sources/SOURCES.md`:

- Madan Puraskar Pustakalaya spell-check dictionary and thesaurus (LGPL-2.1)
- nepali-stemmer headwords (MIT)
- nepalitokenizers frequency (Apache-2.0)
- wordfreq English ranks (CC BY-SA 4.0)
- Aafnai Patro editorial definitions (CC BY-SA 4.0)

No text is copied from नेपाली बृहत् शब्दकोश or any other published dictionary. Credits appear on each word page.

## Ideas for next

- Log zero-result searches to D1 and define the most-searched missing words each week.
- A contribution form ("suggest a meaning") with a D1 moderation queue.
- Festival and calendar pages: link festival names and rashifal keywords to their dictionary entries.
- A Word of the Day card on the calendar home page (`WordOfDayCard` and `EnglishWordOfDayCard` are exported from `src/features/dictionary/routes.tsx`), placed so it respects the calendar-first home contract.
- Use `useSpellCheck()` inside the Nepali typing tool (`/tools/nepali-typing`) for live underlines.
