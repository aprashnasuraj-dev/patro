# Open sources used to build the lexicon

Everything in `data/lexicon.open.json` is generated from these files by
`node scripts/import/import-open-sources.ts`. The raw files are vendored here, so builds
never depend on the network and you can always prove where each word came from.

| folder | what | license | upstream |
|---|---|---|---|
| `libreoffice-ne_NP/ne_NP.dic`, `ne_NP.aff` | Nepali spell-check dictionary: 39,924 stems + 508 affix (inflection) rules. Compiled by **Madan Puraskar Pustakalaya**, Patan Dhoka, Lalitpur (Nepalinux project). | **LGPL-2.1** (`README_ne_NP.txt`, full text in `COPYING.LGPL-2.1`) | github.com/LibreOffice/dictionaries/tree/master/ne_NP |
| `libreoffice-ne_NP/th_ne_NP_v2.dat` | Nepali thesaurus: ~5,550 headwords, 6,275 senses with part of speech, short Nepali glosses and synonyms. Same package and extension. | distributed in the same LGPL-2.1 LibreOffice extension (no separate licence file; see note) | same |
| `nepali-stemmer/headwords.txt` | Headword list, ~36k words (words only; no definitions). | MIT (package classifier; repo LICENSE) | github.com/oya163/nepali-stemmer, PyPI `nepali-stemmer` |
| `wordfreq-en/en-rank.tsv` | Top 60,000 English words in frequency order (wordfreq 3.1.1 `large_en`). Used **only** to rank English headwords for the English→Nepali dictionary and the English learning lists. | wordfreq data: CC BY-SA 4.0 (code Apache-2.0, `LICENSE.txt`) | github.com/rspeer/wordfreq, PyPI `wordfreq` |
| `nepalitokenizers/word-logprob.tsv` | Word log-probabilities extracted from a SentencePiece model trained on a Nepali corpus. Used **only** to rank words by frequency. | Apache-2.0 (`LICENSE`) | github.com/basnetsoyuj/nepali-tokenizers, PyPI `nepalitokenizers` |

Original content added by the Patro team (`data/editorial/*.tsv`, `data/lexicon.curated.json`,
`data/ukhan.json` explanations) is released under **CC BY-SA 4.0**.

## What the licences ask of you

* **LGPL-2.1 data (MPP):** keep the attribution, and ship the licence plus the data
  you derived from it in a form others can reuse. The dictionary does this already: every
  word page shows a "स्रोत" (source) line crediting Madan Puraskar Pustakalaya, and
  `/dict/v1/*.json` *is* the derived data, in the open. Keep this folder in your repo.
* **MIT / Apache-2.0:** keep the copyright and licence notices (they're in this folder).
* **CC BY-SA 4.0 (our editorial content):** anyone may reuse it with credit and under the same licence.
  If you want your own definitions to stay proprietary instead, change the `patro-editorial`
  entry in `scripts/import/import-open-sources.ts` → `sourceRegistry` **before** you publish.

**Note on the thesaurus:** the `ne_NP` extension (dictionary *and* thesaurus) ships as one
LGPL package, but the thesaurus file has no licence header of its own. Before a commercial
launch, a short email to Madan Puraskar Pustakalaya confirming the licence is a good idea.
They're a natural partner for the project anyway.

## Sources we could not fetch from the build machine (add them yourself)

Worth adding with the same importer pattern (one converter → `LexiconEntry[]`):

* **Wikidata Lexemes (Nepali)**: CC0, so no attribution is required. Use the SPARQL endpoint or the lexeme dumps.
* **Nepali Wiktionary / English Wiktionary Nepali entries**: CC BY-SA. Via kaikki.org JSONL (Wiktextract).
* **Your own corpus**: news, literature and government text, for better frequency ranks and example sentences
  (quote short examples only, and keep their `source`).
