# 06 — Search registry canonical crosswalk (source-derived)

Extracted from `src/components/FeatureLauncher.tsx` on branch `newlook-fastgate`. **54 unique searchable destinations**, 55 href declarations (one duplicate link reference in surrounding markup). These are existing destination names, not necessarily the final editorial names. All 54 paths must survive redesign. Other routes (worker/static/personal) are additionally preserved in `06_CANONICAL_DESTINATIONS.md`.

| # | Existing destination | Nepali name | English name | Current grouping |
|---:|---|---|---|---|
| 1 | `/` | आजको पात्रो | Today · Calendar | पात्रो · Calendar |
| 2 | `/#home-weather` | मौसम पूर्वानुमान | Weather forecast | दैनिक · Daily |
| 3 | `/convert` | मिति रूपान्तरण | BS ↔ AD Date converter | पात्रो · Calendar |
| 4 | `/time-machine` | समययन्त्र | Time Machine | इतिहास · History |
| 5 | `/on-this-day` | आज इतिहासमा | On This Day | इतिहास · History |
| 6 | `/rashifal` | राशिफल | Horoscope | ज्योतिष · Astrology |
| 7 | `/janmapatro` | जन्मपत्रो | Birth chart | ज्योतिष · Astrology |
| 8 | `/mytime` | मेरो समय | My Time | समय · Time |
| 9 | `/janmapatro/milan.html` | गुण मिलान | Matchmaking | ज्योतिष · Astrology |
| 10 | `/tools/astro` | खगोलीय पात्रो | Astronomy calendar | खगोल · Astronomy |
| 11 | `/panchang` | दैनिक पञ्चाङ्ग | Daily Panchang | पात्रो · Panchang |
| 12 | `/muhurat` | शुभ साइत र मुहूर्त | Auspicious timing | साइत · Muhurat |
| 13 | `/jyotish` | ज्योतिष गणक | Jyotish calculators | ज्योतिष · Jyotish |
| 14 | `/planets` | ग्रह र खगोलीय घटना | Planets & astronomy | खगोल · Astronomy |
| 15 | `/nepal-calendar` | नेपाली संवत् र परम्परा | Nepal calendars & traditions | पात्रो · Calendars |
| 16 | `/samachar` | समाचार | Samachar · News | मिडिया · Media |
| 17 | `/fm` | एफएम / रेडियो | FM · Radio | मिडिया · Media |
| 18 | `/tv` | लाइभ टिभी | Live TV | मिडिया · Media |
| 19 | `/samudaya` | समुदाय पात्रो | Community calendars | समुदाय · Community |
| 20 | `/nepal-sambat/mandala` | नेपाल संवत् | Nepal Sambat | समुदाय · Community |
| 21 | `/samudaya/lhosar` | ल्होसार पात्रो | Lhosar calendar | समुदाय · Community |
| 22 | `/samudaya/tharu` | थारु पात्रो | Tharu calendar | समुदाय · Community |
| 23 | `/samudaya/mithila` | मिथिला पात्रो | Mithila calendar | समुदाय · Community |
| 24 | `/samudaya/kirat` | किरात पात्रो | Kirat calendar | समुदाय · Community |
| 25 | `/samudaya/hijri` | हिजरी पात्रो | Hijri calendar | समुदाय · Community |
| 26 | `/samudaya/chakra` | समुदाय चक्र | Community chakra | समुदाय · Community |
| 27 | `/tool/nepalidictionary` | नेपाली शब्दकोश | Nepali dictionary | भाषा · Language |
| 28 | `/tools/nepali-typing` | नेपाली टाइपिङ | Nepali typing | भाषा · Language |
| 29 | `/tools/preeti-converter` | प्रीति रूपान्तरण | Preeti converter | भाषा · Language |
| 30 | `/tools/spell-check` | नेपाली हिज्जे जाँच | Nepali spell check | भाषा · Language |
| 31 | `/tools/voice-typing` | आवाजबाट नेपाली टाइपिङ | Voice typing | भाषा · Language |
| 32 | `/tools/ocr` | नेपाली OCR | Nepali OCR | भाषा · Language |
| 33 | `/tools/read-aloud` | पढेर सुनाउनुहोस् | Read aloud | भाषा · Language |
| 34 | `/tools/calc` | दिन गणना | Date calculator | मिति · Date tools |
| 35 | `/tools/age` | उमेर गणक | Age calculator | मिति · Date tools |
| 36 | `/tools/clock` | विश्व घडी | World clock | मिति · Date tools |
| 37 | `/tools/forex` | विदेशी मुद्रा | Forex rates | पैसा · Money |
| 38 | `/tools/gold` | सुनचाँदी हिसाब | Gold calculator | पैसा · Money |
| 39 | `/tools/emi` | कर्जा EMI | Loan EMI calculator | पैसा · Money |
| 40 | `/tools/vat` | भ्याट र प्रतिशत | VAT & percentage | पैसा · Money |
| 41 | `/tools/units` | नेपाली नाप–तौल | Traditional units | नाप · Measures |
| 42 | `/tools/words` | अंकलाई शब्दमा | Amount in words | भाषा · Language |
| 43 | `/tools/landconverter` | जग्गा नाप रूपान्तरण | Nepali land converter | उपकरण · Tools |
| 44 | `/tools/incometax` | आयकर गणक | Income tax | उपकरण · Tools |
| 45 | `/tools/nepaliqr` | नेपाली QR | QR generator | उपकरण · Tools |
| 46 | `/tools/fuelprice` | इन्धन मूल्य | Fuel prices | उपकरण · Tools |
| 47 | `/tools/tithi-reminder` | तिथि रिमाइन्डर | Tithi reminder | विशेष · Featured |
| 48 | `/tools/sait` | साइत · शुभ समय | Sait · Auspicious time | विशेष · Featured |
| 49 | `/tools/baby-names` | नक्षत्र अनुसार बच्चाको नाम | Baby names | विशेष · Featured |
| 50 | `/tools/janmadin-akhbar` | जन्मदिन अखबार | Birthday newspaper | विशेष · Featured |
| 51 | `/tools/future-letter` | भविष्यको चिठी | Future letter | विशेष · Featured |
| 52 | `/tools/name-check` | कागजात नाम जाँच | Document name check | भाषा · Language |
| 53 | `/tools/patro-bot` | पात्रो बोट | Patro Bot | विशेष · Featured |

Do not alter transliterations or source data as part of a metadata consolidation. Before #17 compare ToolsPage and all other navigation plus `PATRO_TOOL_SLUGS`, legacy redirects, generated sitemap and edge route list; routes not in this search list must remain reachable.
