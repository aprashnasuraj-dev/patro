# 29-feature root-cause and source-validation ledger

**Status:** source reconnaissance and four simple candidate classifications implemented; not 29 finished production features. This record prevents falsely equating a scraped date, a rule claim and a verified Nepal-local result.

## Why 29 were blocked

The release registry now uses the explicit `source-review` disposition for 26 entries; three additional items (F010, F058, F079) also remain reference-gated by the functional availability registry. `source-review` means review is still required, not that review has already passed. The 91-row catalog originally did not carry per-rule source version, jurisdiction, input dependencies, boundary fixtures, licenses or an approval record. Existing archive Tithi/Nakshatra data supplies astronomical ingredients but cannot automatically settle ritual, regional, editorial, or official event rules. Third-party sites are comparison references, **not a dataset to copy wholesale**.

## Source trail

- [PAC/IMD Rashtriya Panchang multilingual publication](https://mausam.imd.gov.in/responsive/rashtriyPanchang.php) — official astronomical and regional comparison; not a Nepal festival authority
- [PAC Tamil 2026-27 edition](https://packolkata.imd.gov.in/panchang/ta/preface) — official published regional astronomical reference
- [Drik Nakshatra numbering](https://www.drikpanchang.com/tutorials/nakshatra/nakshatra.html) — one-based Nakshatra names/index verification
- [Drik Ganda Moola Nepal](https://www.drikpanchang.com/panchang/gandamool-dates-timings.html?date=24%2F06%2F2026) — six named Nakshatras; not a personal prediction
- [Drik Ravi Pushya Nepal](https://www.drikpanchang.com/yoga/ravipushya-yoga-date-time.html?date=17%2F10%2F1965) — Sunday + Pushya, 2026 Nepal-specific candidate timing comparison
- [Drik Ekadashi/Parana Nepal](https://www.drikpanchang.com/ekadashis/devshayani/devshayani-ekadashi-date-time.html?geoname-id=1283318) — Dwadashi, Hari Vasara and Nepal-local rule disclosure
- [NAOJ 2026 planetary phenomena](https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_f_en.cgi) — independent astronomy check, not astrology combustion authority
- [PanchangTime yoga methodology](https://panchangtime.com/about/auspicious-yogas) — describes source variants and distinguishes Ravi Yoga from Ravi Pushya

## Root cause by feature

| ID | Root cause | Validated rule or exact remaining task | Release evidence required |
|---|---|---|---|
| F010 | astronomy-boundary | compare Tithi at 3 successive Nepal sunrises; verify kshaya/vriddhi and observance precedence | archive sunrise and transition fixtures |
| F021 | astronomy-rule | Panchak: Dhanishtha (23) through Revati (27), one-based Nakshatra | Drik Nakshatra list and Panchak independent dates |
| F022 | astronomy-rule | Ganda Moola: Ashwini 1, Ashlesha 9, Magha 10, Jyeshtha 18, Mula 19, Revati 27; Gandanta is narrower and distinct | Drik Ganda Moola Nepal list |
| F024 | source-variant | 28th Abhijit Nakshatra requires a separate 28-division convention; do not infer from 27-star Muhurta | classical text and exact longitude convention |
| F026 | observance | Shraddha needs ritual-window and Tithi overlap rules rather than sunrise-only Tithi | Nepal published observance calendar |
| F058 | observance | property legal office date differs from traditional auspicious date; existing Sait is not proof of a new rule | Nepal legal calendar and attributed Muhurta rule |
| F060 | rule-table | Sarvarthasiddhi weekday/Nakshatra matrix varies by published tradition | pin edition and compare date fixtures |
| F061 | rule-table | Amritsiddhi weekday/Nakshatra matrix and sunrise-day boundary | pin edition and compare date fixtures |
| F062 | rule-table | Dwipushkar requires concurrent weekday/Tithi/Nakshatra and exception logic | source table and local transition fixtures |
| F063 | rule-table | Tripushkar requires concurrent weekday/Tithi/Nakshatra and exception logic | source table and local transition fixtures |
| F064 | astronomy-rule | Sunday plus Pushya (8) is source-confirmed as a candidate; full window needs sunrise-based Vara and Nakshatra transitions | Drik Nepal 2026 Ravi Pushya date/time comparison |
| F065 | astronomy-rule | Thursday plus Pushya (8) is source-confirmed as a candidate; full window needs sunrise-based Vara and Nakshatra transitions | Drik Guru Pushya date/time comparison |
| F066 | source-variant | Ravi Yoga must use its own Sun/Moon Nakshatra separation rule, not be conflated with Ravi Pushya | published exact rule and local fixtures |
| F068 | observance | Parana after sunrise in Dwadashi, excluding Hari Vasara first quarter; Smartha/Vaishnava and exceptions need explicit handling | Nepal-local Ekadashi reference fixtures |
| F029 | rule-table | Pancha Pakshi requires a cited tradition-specific bird/day-night/lunar schedule | licensed/source-attributed full tables |
| F030 | editorial | Gemstone is cultural context; no assured medical/financial result or purchasing claim | attributed sources and editorial review |
| F031 | editorial | Rudraksha Mukhi categories are cultural references, not verified health outcomes | attributed sources and editorial review |
| F052 | astronomy-vs-tradition | measurable Sun separation is not equivalent to a single universally accepted combustion threshold | per-planet threshold source and numerical ephemeris comparison |
| F077 | astronomy-vs-tradition | Graha Asta/Uday duplicate concept of F052, must share one canonical calculation and source | per-planet thresholds and no duplicated SEO page |
| F079 | calendar-convention | astronomical equinox/solstice are distinct from Nepali Hindu Ritu names and month starts | Nepal season source and independent astronomical fixture |
| F082 | regional-calendar | Tamil solar-lunar conventions require a region and authoritative edition | PAC Tamil Rashtriya Panchang and regional source |
| F083 | regional-rule-table | Gowri Nalla Neram needs sourced weekday/day-night segment matrix and sunrise convention | regional Tamil published reference |
| F084 | regional-calendar | Karthigai observance needs Tamil month and regional day boundary | regional Tamil published reference |
| F085 | regional-observance | Kanda Sashti/Tamil festivals depend on local observance rules | organizer or published regional Panchang |
| F086 | regional-calendar | Malayalam solar months/ingress are not BS month aliases | PAC Malayalam and Kerala source |
| F087 | regional-calendar | Bengali Panjika has regional edition and observance variants | PAC Bengali and local published Panjika |
| F088 | regional-calendar | Gujarati Amanta month naming and year boundary differ from Purnimanta | PAC Gujarati and regional calendar |
| F089 | official-announcement | Kumbha dates depend on venue, edition/year and official organizers | event-year official government/organizer announcement |
| F091 | rights-and-curation | cultural library requires rights, credits, Nepal relevance, content QA; not an astronomy formula | permission/license and provenance per item |

## Completed source-level validation (not release approval)

- F021: one-based Panchak membership 23–27 recorded in pure helper; requires exact Moon/Nakshatra entry and exit instants before publishing intervals.
- F022: six Ganda Moola Nakshatras recorded; distinguish broad Ganda Moola from narrow Gandanta and avoid natal consequences.
- F064 and F065: Sunday/Thursday + Pushya 8 membership recorded. Pure helper uses civil weekday **only as a candidate input**; the live yoga must calculate sunrise-to-sunrise Vara, intersection with Nakshatra intervals and local Nepal date. F064 has a Nepal-specific published comparison source.
- F068: source confirms Dwadashi and Hari Vasara constraints, but final Parana requires fasting-date decision, first quarter of Dwadashi, sunrise and sect-specific exceptions; it remains gated.

## Next gates, without PR/CI/deploy

1. Inspect read-only archive schema and original route owners before changing the presentation status of any feature.
2. Pin source edition, locality, rules, exceptions and citation to each of 29 features; collect legal/licensed tables, not bulk copyrighted page mirrors.
3. Build one reusable astronomical interval intersection engine with one-based/zero-based normalization and Nepal sunrise Vara, using the versioned archive-first contract.
4. Generate independent Kathmandu/Janakpur fixtures including midnight and sunrise boundary cases; compare with published sources and document tolerances and differences.
5. Make ritual/official/cultural entries source-driven, not simulated by arbitrary formulas. Do not assert a result if the source or license is absent.
6. Only move a feature from `reference` to `browser-preview` after it has a working UI, exact tests and an accepted fixture. No automatic bulk promotion.
7. Re-run local typecheck/build, static output and regression tests, plus visual mobile/language checks before any PR decision.

No Cloudflare mutation, deployment, PR, CI or protected My Time file modification is authorized by this dossier.
