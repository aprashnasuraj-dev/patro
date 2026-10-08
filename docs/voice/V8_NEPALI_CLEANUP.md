# V8 — Nepali punctuation and opt-in cleanup

Accept spaced पूर्ण विराम, फुलस्टप, कमा, प्रश्न चिन्ह and नयाँ हरफ alongside
existing punctuation phrases. Mixed English words remain Latin by default.
Two voice-tool toggles affect future transcripts only: convert common spoken
numbers, and transliterate Roman tokens using the existing lazy-loaded Roman
keyboard engine. URLs and email addresses are protected. Transliteration is a
keyboard approximation, not semantic translation; the UI asks users to edit it.
Number conversion covers common 0–29, tens and सय/हजार/लाख/करोड scales; unsupported
forms are retained. Options are not persisted and do not rewrite existing text.

Existing normalize() is unchanged, including its eyelash-ra preservation and
its existing treatment of other ZWJ/ZWNJ. No additional joiner stripping occurs.

## Preserved behaviours

- [x] Default digits/English processing, all controls and onFinal API.
- [x] Existing normalization, Roman keyboard source and mixed English by default.
- [x] Existing storage/account data, URLs/canonicals, archives/calendar values.
- [x] No D1 reads or CSP changes; Roman engine loads only after opt-in.

## Validation and rollback

TypeScript, 18 language tests, 15 voice contracts and 16 browser checks pass.
Tests include variants, optional numbers, joiners and protected links. Manual
mobile tests remain pending. Revert this PR to restore V7 cleanup. No stored
transcript, setting or user-data migration is needed.
