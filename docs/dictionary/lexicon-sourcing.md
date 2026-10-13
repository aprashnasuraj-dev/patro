# 03 · The open lexicon: where the words come from

> The principle: **a language belongs to everyone.** Which words exist, what part of speech
> they are, how they inflect, what they rhyme with and roughly what they mean are shared
> knowledge. What belongs to a publisher is *their exact text*: the definition sentences,
> examples and editorial layout of a specific book. So this dictionary is built from openly
> licensed data plus definitions written fresh, and it never copies a published dictionary's
> wording. That keeps it legally safe, gives it SEO value (unique text), and lets it be
> shared as open data.
>
> I'm not a lawyer, and this isn't legal advice. It's the practical approach.

## What's in the bundle today

| layer | count | source | licence |
|---|---|---|---|
| Headwords | **49,119** | spell-checker stems + a headword list | LGPL-2.1 + MIT |
| Inflection rules (रूपावली) | 508 rules → forms for **18,398** words | spell-checker `.aff` | LGPL-2.1 |
| Nepali definitions + synonyms | **5,552** words / 6,275 senses | MPP thesaurus | LGPL-2.1 |
| Core-vocabulary definitions + English + examples | **1,284** words | written for Patro (`data/dictionary/editorial/*.tsv`) | CC BY-SA 4.0 |
| English glosses for thesaurus senses | **6,248** senses (1,509 hand-written + 4,739 AI-drafted and reviewed) | Patro (`data/dictionary/editorial/glosses/`) | CC BY-SA 4.0 |
| Definitions + English + example for frequent words | **~2,300** words / 2,396 senses (AI-drafted and reviewed; 702 names, fragments and inflected forms skipped) | Patro (`data/dictionary/editorial/ai-define-*.tsv`) | CC BY-SA 4.0 |
| Frequency ranks | 8,259 words | corpus SentencePiece model | Apache-2.0 |
| Ukhan / tukka | 60 | folk sayings + our explanations | CC BY-SA 4.0 |
| **Defined entries (pages)** | **9,101** (99.7% with English) | merged | |

Coverage of the most frequent words: 94% of the top 500, 93% of the top 1,000 and 89% of the top 3,000 have a definition.
Most of the remaining gaps in the top ranks are names and news fragments. Exact provenance and
licence of each file: `data/sources/SOURCES.md`.

### Stubs: every word is useful, even before it has a definition

The other ~40k headwords are **stubs**: known, correctly spelled words that don't have a definition yet.
They are **searchable**, resolve inflected queries (गरेको → गर्नु), appear in the **rhyme finder**
(poets want every real word), and have an app page showing their forms and rhymes plus a "suggest a
definition" prompt. They are **not** prerendered or indexed, so search engines only see real content.
Once a stub gets a definition it becomes a page automatically on the next build.

## The pipeline

```
data/sources/ (vendored, licensed)            data/dictionary/editorial/*.tsv          data/lexicon.curated.json
      │  import-open-sources.ts                     │  import-editorial.ts         (hand-edited, wins)
      ▼                                             ▼
data/lexicon.open.json  ──────────────► merge (later wins) ◄────── data/lexicon.editorial.json
                                             │                         (+ glossOverlay: English for
                                             ▼                           imported senses)
                                    build-dictionary.ts → static JSON shards (/data/dict/v1) → Worker-rendered pages
```

* `npm run dict:import` re-runs both importers. You only need it when `data/sources/` or the importer changes.
* `npm run dict:build` (and `npm run build`) re-reads the editorial TSVs every time.
* **Merge rules** (`mergeEntries`): for the same lemma, later files' senses come first and earlier senses
  are kept after them. `lexicon.curated.json` has `"mergeMode": "replace"`, so a hand-curated entry fully
  replaces the imported senses. Arrays (synonyms, variants…) are unioned, frequency and inflection data are kept,
  and credits from every source are listed on the page.

## Growing it to "complete"

1. **Editorial TSVs (the main engine).** Editors work in Google Sheets or Excel with the columns
   `lemma | pos | Nepali definition | English | example | example (en)`, then download as TSV
   into `data/dictionary/editorial/`. Several rows with the same lemma become several senses.
2. **AI-assisted drafting, human-reviewed.** `scripts/dictionary/enrich/draft-with-claude.ts` drafts
   * `--glosses`: English for the ~4,260 thesaurus senses still without it, most frequent first;
   * `--define`: definitions, English and an example for the most frequent stubs.
   It writes new TSV files headed "AI DRAFT — NEEDS REVIEW", skips anything it's unsure of, is
   resumable, and never publishes directly. Rough cost: a few dollars per thousand words with a mid-size model.
3. **Missed searches.** Planned: log zero-result searches to D1 (an `/api/v1/dictionary/miss` beacon) and define the top 50 every week.
4. **Community contributions (planned).** A suggestion form that writes to a D1 moderation queue. Approved
   items are copied into a TSV row. Add a contributor-licence line to the form: "I license my
   contribution under CC BY-SA 4.0."
5. **More open data.** Add Wikidata Lexemes (CC0) and Wiktionary (CC BY-SA) with the same converter pattern
   (see `SOURCES.md`). They couldn't be fetched from the machine that built this bundle.
6. **Partnership.** Madan Puraskar Pustakalaya (the source of the spell-checker and thesaurus) and
   Nepal Academy are natural partners: credit, backlinks, their expertise, your reach.

## Quality rules for any definition (human or AI)

* Write it fresh. Don't paraphrase a specific printed dictionary line by line.
* Nepali first, short and plain; English glosses are 1–4 words each.
* Examples should be natural, everyday sentences. Avoid names of real private people.
* Mark uncertain etymologies with a `note`, or leave them out.
* Sensitive words (caste names, slurs, religious terms) get neutral, respectful definitions and a usage note.

## About the AI-drafted files

`data/dictionary/editorial/ai-define-*.tsv` and `data/dictionary/editorial/glosses/ai-*.tsv` were produced by parallel Claude agents (one drafter, then one independent reviewer, per chunk)
from the lists of (a) thesaurus senses still lacking English and (b) the 3,000 most frequent undefined words.
Each file starts with an "AI DRAFT — NEEDS REVIEW" header. The agents skipped personal names, party acronyms,
fragments and inflected forms; a validator then checked every line against its input (format, lemma, POS,
script). Treat them like any contributor's work: a Nepali editor should read through them, fixing or deleting
lines in the TSV. The next `npm run build` picks the changes up.
