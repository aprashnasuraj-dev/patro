# 02 · Data model and editorial rules

The authoring format is `LexiconEntry` (`src/lib/dictionary-core/types.ts`, JSON Schema in `data/dictionary/entry.schema.json`). Build output: `public/data/dict/v1` (generated, not committed).

```jsonc
{
  "lemma": "सहर",                  // headword, Devanagari, NFC — also the URL slug
  "homograph": 2,                  // only when two headwords share a spelling → /tool/nepalidictionary/सहर-2
  "roman": "sahar",                // optional override; otherwise generated
  "romanAlt": ["shahar"],          // spellings people type — indexed for search
  "variants": ["शहर"],             // accepted Devanagari spellings — redirect to this page
  "senses": [{
    "id": "s1",                    // stable forever (deep links: /tool/nepalidictionary/सहर#s1)
    "pos": "noun",
    "ne": "धेरै मानिस बस्ने … ठूलो बस्ती।",   // Nepali definition FIRST — this is a Nepali dictionary
    "en": ["city", "town"],        // short glosses, used for English search + SEO text
    "register": "literary",        // neutral | literary | colloquial | honorific | archaic | slang | technical
    "domain": "law",
    "examples": [{ "ne": "…", "en": "…", "source": "…" }],
    "usageNote": "…"
  }],
  "synonyms": ["नगर"], "antonyms": ["गाउँ"], "related": [],
  "etymology": { "origin": "aagantuk", "from": "shahr", "lang": "fa" },   // tatsam | tadbhav | aagantuk | deshaj
  "ipa": "…", "audio": "/audio/sahar.mp3",
  "categories": ["ठाउँ"],
  "freq": 420,                     // rank, 1 = most common. Drives ranking, prerender order, sitemap priority
  "status": "reviewed",            // draft entries are NOT published
  "sources": [{ "name": "…", "license": "…" }],
  "updatedAt": "2026-10-01"
}
```

## Rules that protect SEO and users

1. **Slugs are permanent.** A URL that ranks is an asset. If a lemma's spelling was wrong, keep the slug and add the corrected form, or add the old form to `variants`. Both apps redirect variants to the canonical page.
2. **Sense IDs are permanent.** Add `s3`. Don't renumber `s1` and `s2`.
3. **Deleting a word** removes its page, which Google then sees as a 404. Only delete true junk. Prefer merging it into another entry as a `variant`.
4. **`status: draft`** keeps an entry out of the build and out of public reads (RLS), so you can import big batches and publish after review. **`status: stub`** (set automatically for headwords with no senses) means the word is searchable and has an app page with forms and rhymes, but no indexable page.
5. **Write definitions yourself.** Short, original, Nepali-first definitions are both safer legally (see 03) and better for SEO than copied text.
6. **Every WOTD candidate needs an example sentence.** The card looks empty without one.
7. **Cross-references are by lemma.** You can list synonyms that don't have entries yet. They render as plain text and become links automatically once the entry exists. Doing this early is a cheap way to build an internal-linking graph.

## Frequency (`freq`)

Get a rank from a corpus word list (see 03). It is the most useful field you can add at scale:

- search ties break toward common words (`सहर` before `सहरिया`);
- `PRERENDER_LIMIT` keeps the most-searched pages;
- the sitemap gives common words priority 0.8.

## Homographs

Same spelling, unrelated meanings and etymologies (for example `लेख` "article" vs `लेख` the imperative of "write"): the first entry has no `homograph` field and the second has `"homograph": 2`. Related meanings of one word are **senses**, not homographs.

## Proverbs (`data/ukhan.json`)

```jsonc
{ "id": "jasto-desh-ustai-bhesh",   // ASCII, permanent (anchor on /tool/nepalidictionary/ukhan#id)
  "kind": "ukhan",                  // or "tukka" (idiom)
  "text": "जस्तो देश उस्तै भेष",
  "meaningNe": "…", "meaningEn": "…",
  "englishEquivalent": "When in Rome, do as the Romans do.",   // only when one really exists
  "themes": ["व्यवहार"],
  "words": ["देश"] }                 // optional; otherwise auto-linked by token + suffix stripping
```

Auto-linking strips common suffixes (`को, मा, ले, लाई, हरू, माथि, बाट …`, stacked up to twice), so `पानीमाथिको` links to `पानी`.

## D1 tables (personal data only)

Word data is static (`/data/dict/v1`). D1 holds only what a signed-in learner creates
(`cloudflare/d1/schema-migrations/0007_dictionary_learning.sql`, mirrored in `ensureAuthSchema()`):

| table | purpose | access |
|---|---|---|
| `dict_saved_words` | "मेरा शब्द" flashcards + spaced-repetition state (ease, interval, reps, due day) | own rows, via `/api/v1/dictionary/cards` |
| `dict_quiz_results` | finished quiz rounds (mode, level, score) | own rows, via `/api/v1/dictionary/quiz` |

Both are included in the account export (`GET /api/v1/my-data`) and removed by account deletion.
