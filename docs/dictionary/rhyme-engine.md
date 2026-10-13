# 05 · Rhyme engine (अनुप्रास / तुक)

This is the feature for poets, lyricists and ghazal writers, and the one generic dictionaries do worst.

## How it works

Each headword's last word is parsed into phonemes (with the same schwa rules as romanization), then four keys are taken from the end:

| key | definition | घर | सहर | पानी | सपना |
|---|---|---|---|---|---|
| **single** (end rhyme) | from the last vowel that is followed by a consonant, to the end | `ar` | `ar` | `Ani` | `anA` |
| **double** (multi-syllable) | from the vowel before that | — | `ahar` | — | `apanA` |
| **slant** (near rhyme) | single, with consonants replaced by manner class (stop, voiced, nasal, liquid, sibilant, glide, h) | `aL` | `aL` | `AMi` | `aMA` |
| **vowel** (assonance) | the vowels of single | `a` | `a` | `A-i` | `a-A` |

Starting "single" at the last vowel *followed by a consonant*, rather than at the very last vowel, matters for Nepali. Many words end in an open vowel, and rhyming पानी with every word ending in -ई would be useless. With this rule पानी rhymes with रानी, कहानी and जवानी.

Folded for rhyme: ि/ी and ु/ू (Nepali speech doesn't distinguish their length), श/ष/स, व/ब, ण/न. Kept: अ vs आ, which is a real contrast (कम ≠ काम).

Nasalization attaches to the vowel (`u~`), so गाउँ rhymes with ठाउँ and नाउँ.

## Ranking

`double` > `single` > `slant` > `vowel`, then by frequency. Exclusions:

- the word itself;
- candidates whose last word is identical (मन vs आफ्नो मन is repetition, not rhyme).

Filters: syllable count (useful for meter), part of speech (noun ↔ noun pairs read better in songs), and minimum strength.

## Where rhymes show up

- **Word page**: up to 24, grouped. It links to the full rhyme page when there are at least 5.
- **`/tool/nepalidictionary/anupras/<word>`**: the full tool with filters. It is rendered by the Worker and indexable only when there are 5 or more rhymes (`minRhymesForPage`), so thin pages don't dilute the site.
- **SQL**: `dict_rhymes(slug, syllables, pos, min, lim)` uses indexed equality lookups on `rhyme_single` / `rhyme_slant`.

## Next steps

1. **Rhyme clusters.** Precompute groups of 10+ words sharing a `single` key and publish them as editorial pages ("-आनी मा टुङ्गिने शब्द"). They rank for "…सँग मिल्ने शब्द" queries.
2. **Meter (छन्द) helper.** Nepali classical meters (शार्दूलविक्रीडित, शिखरिणी, अनुष्टुप् …) follow **गुरु/लघु** patterns. Syllable weight comes straight from the phoneme sequence: a long vowel (आ ई ऊ ए ऐ ओ औ), anusvara/visarga, or a following conjunct makes a syllable गुरु; otherwise it is लघु. A `scanLine(text) → "ग ल ग ग …"` function is about 40 lines on top of `phonemes()`. Then compare it against meter templates and highlight mismatches. No other Nepali web tool does this well.
3. **Line-end rhyme checker.** Paste a verse and get the rhyme scheme (AABB, ABAB) plus suggestions for weak line ends.
4. **Phrase rhymes.** Index frequent 2-word phrases from the corpus so multi-word rhymes (रातभरि / साथभरि) appear.
