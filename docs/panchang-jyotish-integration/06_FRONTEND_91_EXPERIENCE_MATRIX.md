# UX acceptance coverage for 91 Panchang and Jyotish entries

This is an implementation/acceptance inventory, **not a completion certificate**. The common five-group interface supplies all entries with searchable bilingual cards, responsive editorial feature spotlight, group visual, related navigation and a transparent availability state. The actual calculator is mounted on demand for eligible entries. Source-dependent content is not fabricated.

## Shared front-end acceptance

- Home and Tools provide routes to all five groups; feature selection is deep-linkable by fragment without 91 duplicate canonical URLs.
- Exactly one language state comes from `useUiLanguage()` (the homepage language choice). No feature-level selector.
- HTML5 semantic main, nav, section, heading, description, input, table and button structures; accessible focus and reduced-motion styling.
- Mobile at 320/375/768/1024 widths, desktop at 1440, light/dark theme, keyboard, screen reader and both language views require real-browser review.
- Five distinct group art compositions use authored HTML/CSS only; no remote stock art, extra images, tracking service or storage.
- A browser-calculated result must have source/method/provenance and a visible unavailable state. No loading of calculators merely to show the directory.
- Existing JanmaPatro and My Time must remain independently functional and unchanged.
- No developer-facing comparison-brand wording or internal F-number appears in the presented feature spotlight.
- Reference-only traditions require an approved source/rule and substantive implementation before the corresponding row can be marked complete.

## Feature-by-feature UX requirements

| Internal audit ID | Nepali display | English display | Visual composition | Interaction/destination | Design gate |
|---|---|---|---|---|---|
| F001 | आजको विस्तृत पञ्चाङ्ग | Daily Panchang Summary | Sunrise timeline / circular time dial | `/panchang#daily-summary` | Browser calculator preview; numerical and visual acceptance pending |
| F002 | तिथि र पक्ष | Tithi & Paksha | Sunrise timeline / circular time dial | `/panchang#tithi` | Browser calculator preview; numerical and visual acceptance pending |
| F003 | तिथि परिवर्तन समय | Tithi Transition | Sunrise timeline / circular time dial | `/panchang#transitions` | Browser calculator preview; numerical and visual acceptance pending |
| F004 | नक्षत्र र पाद | Nakshatra & Pada | Sunrise timeline / circular time dial | `/panchang#nakshatra` | Browser calculator preview; numerical and visual acceptance pending |
| F005 | योग र परिवर्तन | Yoga & Transition | Sunrise timeline / circular time dial | `/panchang#yoga` | Browser calculator preview; numerical and visual acceptance pending |
| F006 | करण र विष्टि | Karana & Vishti | Sunrise timeline / circular time dial | `/panchang#karana` | Browser calculator preview; numerical and visual acceptance pending |
| F007 | सूर्य राशि र चन्द्र राशि | Sun & Moon Rashi | Sunrise timeline / circular time dial | `/panchang#rashi` | Browser calculator preview; numerical and visual acceptance pending |
| F008 | अमान्त र पूर्णिमान्त महिना | Amanta & Purnimanta | Sunrise timeline / circular time dial | `/panchang#month-system` | Browser calculator preview; numerical and visual acceptance pending |
| F009 | अधिक मास र क्षय मास | Adhika & Kshaya Masa | Sunrise timeline / circular time dial | `/panchang#lunar-month` | Browser calculator preview; numerical and visual acceptance pending |
| F010 | क्षय र वृद्धि तिथि | Kshaya & Vriddhi Tithi | Sunrise timeline / circular time dial | `/panchang#tithi-observance` | Browser calculator preview; numerical and visual acceptance pending |
| F011 | पञ्चाङ्ग समयरेखा | Panchang Timeline | Sunrise timeline / circular time dial | `/panchang#timeline` | Browser calculator preview; numerical and visual acceptance pending |
| F012 | १२/२४ र २४+ घण्टा समय | 12/24/24+ Hour Display | Sunrise timeline / circular time dial | `/panchang#clock` | Browser calculator preview; numerical and visual acceptance pending |
| F013 | सूर्योदय र सूर्यास्त | Sunrise & Sunset | Sunrise timeline / circular time dial | `/panchang#sun` | Browser calculator preview; numerical and visual acceptance pending |
| F014 | चन्द्रोदय, चन्द्रास्त र प्रकाश | Moonrise, Moonset & Illumination | Sunrise timeline / circular time dial | `/moon` | Original route preserved; destination smoke required |
| F015 | राहुकाल | Rahu Kalam | Sunrise timeline / circular time dial | `/panchang#rahu-kalam` | Browser calculator preview; numerical and visual acceptance pending |
| F016 | यमगण्ड | Yamaganda | Sunrise timeline / circular time dial | `/panchang#yamaganda` | Browser calculator preview; numerical and visual acceptance pending |
| F017 | गुलिक काल | Gulika Kalam | Sunrise timeline / circular time dial | `/panchang#gulika` | Browser calculator preview; numerical and visual acceptance pending |
| F018 | अभिजित मुहूर्त | Abhijit Muhurta | Sunrise timeline / circular time dial | `/panchang#abhijit-muhurta` | Browser calculator preview; numerical and visual acceptance pending |
| F019 | ब्रह्म मुहूर्त | Brahma Muhurta | Sunrise timeline / circular time dial | `/panchang#brahma-muhurta` | Browser calculator preview; numerical and visual acceptance pending |
| F020 | दिन/रात चौघडिया | Day/Night Choghadiya | Sunrise timeline / circular time dial | `/mytime` | Original route preserved; destination smoke required |
| F021 | पञ्चक | Panchak | Sunrise timeline / circular time dial | `/panchang#panchak` | Bilingual reference panel only until rules and source validation |
| F022 | गण्डमूल | Ganda Moola | Sunrise timeline / circular time dial | `/panchang#ganda-moola` | Bilingual reference panel only until rules and source validation |
| F023 | भद्रा / विष्टि | Bhadra / Vishti | Sunrise timeline / circular time dial | `/panchang#bhadra` | Browser calculator preview; numerical and visual acceptance pending |
| F024 | अभिजित नक्षत्र | Abhijit Nakshatra | Sunrise timeline / circular time dial | `/panchang#abhijit-nakshatra` | Bilingual reference panel only until rules and source validation |
| F025 | संक्रान्ति र सूर्य राशि प्रवेश | Sankranti & Solar Ingress | Sunrise timeline / circular time dial | `/panchang#sankranti` | Browser calculator preview; numerical and visual acceptance pending |
| F026 | श्राद्ध तिथि | Shraddha Tithi | Sunrise timeline / circular time dial | `/panchang#shraddha-tithi` | Bilingual reference panel only until rules and source validation |
| F055 | विवाहको साइत | Marriage Muhurat | Day-window timeline / gold interval visual | `/tools/sait` | Original route preserved; destination smoke required |
| F056 | गृह प्रवेश | Griha Pravesh | Day-window timeline / gold interval visual | `/tools/sait` | Original route preserved; destination smoke required |
| F057 | सवारी साधन खरिद | Vehicle Purchase Muhurat | Day-window timeline / gold interval visual | `/tools/sait` | Original route preserved; destination smoke required |
| F058 | घरजग्गा खरिद / रजिस्ट्रेसन | Property Purchase & Registration | Day-window timeline / gold interval visual | `/muhurat#property` | Browser calculator preview; numerical and visual acceptance pending |
| F059 | व्रतबन्ध, नामकरण र व्यवसाय साइत | Bratabandha, Namakaran & Business | Day-window timeline / gold interval visual | `/tools/sait` | Original route preserved; destination smoke required |
| F060 | सर्वार्थसिद्धि योग | Sarvarthasiddhi Yoga | Day-window timeline / gold interval visual | `/muhurat#sarvarthasiddhi` | Bilingual reference panel only until rules and source validation |
| F061 | अमृतसिद्धि योग | Amritsiddhi Yoga | Day-window timeline / gold interval visual | `/muhurat#amritsiddhi` | Bilingual reference panel only until rules and source validation |
| F062 | द्विपुष्कर योग | Dwipushkar Yoga | Day-window timeline / gold interval visual | `/muhurat#dwipushkar` | Bilingual reference panel only until rules and source validation |
| F063 | त्रिपुष्कर योग | Tripushkar Yoga | Day-window timeline / gold interval visual | `/muhurat#tripushkar` | Bilingual reference panel only until rules and source validation |
| F064 | रवि पुष्य योग | Ravi Pushya Yoga | Day-window timeline / gold interval visual | `/muhurat#ravi-pushya` | Bilingual reference panel only until rules and source validation |
| F065 | गुरु पुष्य योग | Guru Pushya Yoga | Day-window timeline / gold interval visual | `/muhurat#guru-pushya` | Bilingual reference panel only until rules and source validation |
| F066 | रवि योग | Ravi Yoga | Day-window timeline / gold interval visual | `/muhurat#ravi-yoga` | Bilingual reference panel only until rules and source validation |
| F067 | व्यक्तिगत शुभ समय | Personal Auspicious Time | Day-window timeline / gold interval visual | `/mytime` | Original route preserved; destination smoke required |
| F068 | एकादशी पारण | Ekadashi Parana | Day-window timeline / gold interval visual | `/muhurat#ekadashi-parana` | Bilingual reference panel only until rules and source validation |
| F027 | जन्मपत्रो | Janma Kundali | Natal chart geometry / symbolic dashboard | `/janmapatro` | Original route preserved; destination smoke required |
| F028 | प्रश्न कुण्डली | Prashna Kundali | Natal chart geometry / symbolic dashboard | `/jyotish#prashna` | Browser calculator preview; numerical and visual acceptance pending |
| F029 | पञ्चपक्षी गणक | Pancha Pakshi Calculator | Natal chart geometry / symbolic dashboard | `/jyotish#pancha-pakshi` | Bilingual reference panel only until rules and source validation |
| F030 | रत्न सिफारिस | Gemstone Guide | Natal chart geometry / symbolic dashboard | `/jyotish#gemstone` | Bilingual reference panel only until rules and source validation |
| F031 | रुद्राक्ष जानकारी | Rudraksha Guide | Natal chart geometry / symbolic dashboard | `/jyotish#rudraksha` | Bilingual reference panel only until rules and source validation |
| F032 | कालसर्प योग गणक | Kalasarpa Yoga Calculator | Natal chart geometry / symbolic dashboard | `/jyotish#kalasarpa` | Browser calculator preview; numerical and visual acceptance pending |
| F033 | शनि साढेसाती | Shani Sadesati | Natal chart geometry / symbolic dashboard | `/jyotish#sadesati` | Browser calculator preview; numerical and visual acceptance pending |
| F034 | जन्म राशि | Janmarashi / Moon Sign | Natal chart geometry / symbolic dashboard | `/jyotish#janmarashi` | Browser calculator preview; numerical and visual acceptance pending |
| F035 | जन्म नक्षत्र र पाद | Birthstar & Pada | Natal chart geometry / symbolic dashboard | `/jyotish#birthstar` | Browser calculator preview; numerical and visual acceptance pending |
| F036 | जन्म लग्न | Janma Lagna / Ascendant | Natal chart geometry / symbolic dashboard | `/jyotish#lagna` | Browser calculator preview; numerical and visual acceptance pending |
| F037 | सूर्य राशि | Surya Rashi / Sun Sign | Natal chart geometry / symbolic dashboard | `/jyotish#surya-rashi` | Browser calculator preview; numerical and visual acceptance pending |
| F038 | मङ्गल दोष | Mangal Dosha | Natal chart geometry / symbolic dashboard | `/jyotish#mangal-dosha` | Browser calculator preview; numerical and visual acceptance pending |
| F039 | गुण मिलान | Kundali Milan | Natal chart geometry / symbolic dashboard | `/janmapatro/milan.html` | Original route preserved; destination smoke required |
| F040 | दैनिक राशिफल | Daily Rashifal | Natal chart geometry / symbolic dashboard | `/rashifal` | Original route preserved; destination smoke required |
| F041 | सहस्र पूर्णचन्द्रोदय | 1000 Full Moons | Natal chart geometry / symbolic dashboard | `/jyotish#1000-moons` | Browser calculator preview; numerical and visual acceptance pending |
| F042 | वैदिक समय गणक | Vedic Time Calculator | Natal chart geometry / symbolic dashboard | `/jyotish#vedic-time` | Browser calculator preview; numerical and visual acceptance pending |
| F043 | नक्षत्र अनुसार बच्चाको नाम | Nakshatra Baby Names | Natal chart geometry / symbolic dashboard | `/tools/baby-names` | Original route preserved; destination smoke required |
| F044 | जन्मपत्रो ग्रहस्थिति | Natal Planetary Positions | Natal chart geometry / symbolic dashboard | `/jyotish#natal-planets` | Browser calculator preview; numerical and visual acceptance pending |
| F045 | विंशोत्तरी दशा | Vimshottari Dasha | Natal chart geometry / symbolic dashboard | `/jyotish#dasha` | Browser calculator preview; numerical and visual acceptance pending |
| F046 | वर्तमान ग्रहस्थिति | Current Sidereal Planetary Positions | Orbit / planet position table | `/planets#positions` | Browser calculator preview; numerical and visual acceptance pending |
| F047 | ग्रह राशि प्रवेश | Planetary Rashi Ingress | Orbit / planet position table | `/planets#rashi-ingress` | Browser calculator preview; numerical and visual acceptance pending |
| F048 | ग्रह नक्षत्र प्रवेश | Planetary Nakshatra Ingress | Orbit / planet position table | `/planets#nakshatra-ingress` | Browser calculator preview; numerical and visual acceptance pending |
| F049 | ग्रह युति | Planetary Conjunctions | Orbit / planet position table | `/planets#conjunctions` | Browser calculator preview; numerical and visual acceptance pending |
| F050 | ग्रह दृष्टि र कोण | Planetary Aspects | Orbit / planet position table | `/planets#aspects` | Browser calculator preview; numerical and visual acceptance pending |
| F051 | वक्री र मार्गी स्टेशन | Retrograde / Direct Stations | Orbit / planet position table | `/planets#stations` | Browser calculator preview; numerical and visual acceptance pending |
| F052 | ग्रह अस्त र उदय | Combustion & Rising | Orbit / planet position table | `/planets#combustion` | Bilingual reference panel only until rules and source validation |
| F053 | ग्रह गोचर | Graha Gochara | Orbit / planet position table | `/planets#gochara` | Browser calculator preview; numerical and visual acceptance pending |
| F054 | आगामी ग्रह घटना | Upcoming Planetary Events | Orbit / planet position table | `/planets#upcoming` | Browser calculator preview; numerical and visual acceptance pending |
| F069 | चन्द्र कला, पूर्णिमा र औंसी | Moon Phases, Full & New Moon | Orbit / planet position table | `/moon` | Original route preserved; destination smoke required |
| F070 | सूर्य ग्रहण | Solar Eclipse | Orbit / planet position table | `/eclipse` | Original route preserved; destination smoke required |
| F071 | चन्द्र ग्रहण | Lunar Eclipse | Orbit / planet position table | `/eclipse` | Original route preserved; destination smoke required |
| F072 | वसन्त विषुव | Vernal Equinox | Orbit / planet position table | `/planets#vernal-equinox` | Browser calculator preview; numerical and visual acceptance pending |
| F073 | ग्रीष्म अयनान्त | Summer Solstice | Orbit / planet position table | `/planets#summer-solstice` | Browser calculator preview; numerical and visual acceptance pending |
| F074 | शरद विषुव | Autumnal Equinox | Orbit / planet position table | `/planets#autumnal-equinox` | Browser calculator preview; numerical and visual acceptance pending |
| F075 | शीत अयनान्त | Winter Solstice | Orbit / planet position table | `/planets#winter-solstice` | Browser calculator preview; numerical and visual acceptance pending |
| F076 | ग्रहस्थिति तालिका | Planet Position Table | Orbit / planet position table | `/planets#positions` | Browser calculator preview; numerical and visual acceptance pending |
| F077 | ग्रह अस्त / उदय विवरण | Graha Asta / Uday | Orbit / planet position table | `/planets#combustion` | Bilingual reference panel only until rules and source validation |
| F078 | वक्री / मार्गी पात्रो | Retrograde / Direct Calendar | Orbit / planet position table | `/planets#stations` | Browser calculator preview; numerical and visual acceptance pending |
| F079 | ऋतु र हिन्दू ऋतु | Indian / Hindu Seasons | Orbit / planet position table | `/planets#seasons` | Browser calculator preview; numerical and visual acceptance pending |
| F080 | बिक्रम संवत् पात्रो | Bikram Sambat Calendar | Calendar mandala / source-led heritage cards | `/` | Original route preserved; destination smoke required |
| F081 | नेपाल संवत् | Nepal Sambat | Calendar mandala / source-led heritage cards | `/nepal-sambat/mandala` | Original route preserved; destination smoke required |
| F082 | तमिल पञ्चाङ्गम् | Tamil Panchangam | Calendar mandala / source-led heritage cards | `/nepal-calendar#tamil-panchangam` | Bilingual reference panel only until rules and source validation |
| F083 | गौरी नल्ला नेरम | Gowri Nalla Neram | Calendar mandala / source-led heritage cards | `/nepal-calendar#gowri-nalla-neram` | Bilingual reference panel only until rules and source validation |
| F084 | कार्तिगै र तमिल पात्रो | Tamil Calendar & Karthigai | Calendar mandala / source-led heritage cards | `/nepal-calendar#tamil-calendar` | Bilingual reference panel only until rules and source validation |
| F085 | तमिल पर्व | Tamil Festivals & Kanda Sashti | Calendar mandala / source-led heritage cards | `/nepal-calendar#tamil-festivals` | Bilingual reference panel only until rules and source validation |
| F086 | मलयालम पात्रो | Malayalam Panchangam | Calendar mandala / source-led heritage cards | `/nepal-calendar#malayalam` | Bilingual reference panel only until rules and source validation |
| F087 | बंगाली पञ्जिका | Bengali Panjika | Calendar mandala / source-led heritage cards | `/nepal-calendar#bengali` | Bilingual reference panel only until rules and source validation |
| F088 | गुजराती संवत् | Gujarati Samvat / Amanta Calendar | Calendar mandala / source-led heritage cards | `/nepal-calendar#gujarati` | Bilingual reference panel only until rules and source validation |
| F089 | कुम्भ मेला | Kumbha Mela Dates | Calendar mandala / source-led heritage cards | `/nepal-calendar#kumbha-mela` | Bilingual reference panel only until rules and source validation |
| F090 | समुदाय पात्रो | Community Calendars | Calendar mandala / source-led heritage cards | `/samudaya` | Original route preserved; destination smoke required |
| F091 | भक्तिगीत र सांस्कृतिक सामग्री | Devotional & Cultural Library | Calendar mandala / source-led heritage cards | `/nepal-calendar#culture` | Bilingual reference panel only until rules and source validation |

## Required final evidence

A checked screenshot-and-interaction record is required for each feature at Nepali and English widths, plus actual local TypeScript, production build, unit tests, route audits and independently verified astronomy/observance fixtures. The common card/spotlight exists but is not a substitute for substantive functionality of each entry. Do not initiate PR or CI merely because the table is present.
