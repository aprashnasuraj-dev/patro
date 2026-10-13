# 04 · Search, normalization and romanization

Nepal searches in three scripts at once: `घर`, `ghar`, `house`, and mixes like `ghar ko artha`. Search works by turning the query and every entry into the same **keys**, then ranking the matches in **tiers**.

## Keys per entry

| key | built from | example (सहर) | purpose |
|---|---|---|---|
| `lemma` | cleaned headword | सहर | exact match, display |
| `devKey` | folded Devanagari | सहर (शहर → सहर) | spelling-variant match |
| `roman` | generated or editorial romanization | sahar | display, SEO title |
| `romanKey` | folded Latin, aspiration kept | sahar | Romanized match |
| `looseKey` | romanKey minus aspiration and optional "a"s | sahr | forgiving match |

### Devanagari folding (`devKey`)

| folded | because people write both |
|---|---|
| ी → ि, ू → ु, ई → इ, ऊ → उ | पूजा / पुजा, नीति / निति |
| श, ष → स | शहर / सहर, खुशी / खुसी |
| व → ब | विवाह / बिबाह |
| ँ → ं; nasal + ् + consonant → ं | गाउँ / गाउं, सम्बन्ध / संबन्ध |
| ृ → ्रि, ऋ → रि | कृषि / क्रिषि |
| ः dropped | दुःख / दुख |
| trailing ् dropped | छन् / छन |
| nukta dropped, ZWJ/ZWNJ/ZWSP removed | क़लम / कलम |

It never changes what is *displayed*. It only decides what *matches*.

### Romanization rules (`phonology.ts`)

Nepali-specific decisions:

- **Final inherent "a" is silent** in multi-syllable words: घर → ghar, जीवन → jiban.
- **Except**: after a conjunct (सत्य → satya, धर्म → dharma), in one-letter words (म → ma), and in "-aya" endings (समय → samaya).
- **Medial "a" is kept**: सपना → sapana, कमल → kamal. Nepali differs from Hindi here.
- **Inflection boundary**: आकाशको → akashko, घरहरू → gharharu.
- Display uses plain ASCII as Nepali web users write it (आ → a, व → b, but w in clusters like स्व, द्व, ज्ञ → gy). Add `roman` to an entry wherever the rule is wrong. `दुःख` → `"dukha"` is such an override.

### Latin folding (`romanKey`), applied to both entry romanizations and user input

`aa→a, ee→i, oo→u` · `chh, ch → c` · `sh → s` · `v, w → b` · `f → ph` · `z → j` · doubled letters collapsed.
So `Ghaar`, `ghar` and `gharr` match; `shahar` matches `sahar`; `phool` and `ful` match; `vivah` matches `bibah`.

`looseKey` also drops aspiration (`kh → k`) and inner "a"s, so `sapna` finds सपना (`sapana`).

## Ranking tiers (identical in `search.ts` and SQL `dict_search`)

| score | tier | example |
|---|---|---|
| 1000 | exact lemma | घर → घर |
| 900 | folded-variant match | शहर → सहर |
| 850 | romanKey / romanAlt | ghaar → घर |
| 820 | variant of a stemmed form | घरहरूमा → घर |
| 800 | exact English gloss | house → घर |
| 700 | looseKey | sapna → सपना |
| 500–600 | prefix (shorter completion ranks higher) | सप → सपना |
| 300–450 | fuzzy (edit distance ≤ 1 for 4–6 chars, ≤ 2 for longer) | shaher → सहर |
| 250 | English prefix | hou → घर |

A frequency bonus of up to +60 breaks ties toward common words.

## Understanding the query (`query.ts`)

`parseQuery()` strips intent phrases before matching, which is how SEO-style queries typed into the box still work:

| input | term | intent |
|---|---|---|
| घरको अर्थ / घर को अर्थ के हो | घर | meaning |
| ghar meaning in nepali / ghar ko artha | ghar | meaning |
| सुखको विपरीत शब्द / sukh antonym | सुख | antonym |
| words that rhyme with maya / घरसँग मिल्ने शब्द | maya / घर | rhyme → the SearchBox goes to the rhyme page |
| नेपाली पर्यायवाची, synonyms | … | synonym |

## Known limitations and how to improve them

- **Verb forms** (गरेको, गर्दै, गर्नुभयो) resolve through the Hunspell-derived rules in `morph-rules.generated.ts` (`lemmaCandidates`), in the browser and on the Worker.
- **Romanized input with no vowels** (`ghr`) matches only through fuzzy search. That's acceptable.
- **Mixed-script queries** (`ghar को`) are treated as Devanagari. Consider splitting per token.
- **Typos in the first two letters** aren't found: the static index is bucketed by the first two characters.

## Tuning safely

Add a failing case to `tests/dictionary-core.test.ts` first, change the rule, then run `npm run test:dictionary`. If you change key functions, re-run `npm run dict:build`: stored keys must match query keys (the Worker and browser share `src/lib/dictionary-core`).
