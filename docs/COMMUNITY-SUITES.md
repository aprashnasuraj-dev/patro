# Community Suites: implementation bundle
Lhosar · Tharu · Mithila · Kirat · Hijri

## 0. The principle: build once, never re-type a date

Every date in these suites comes from a **rule** that the engine evaluates for any year from 1900 to 2100. No festival date is hard-coded anywhere.

| Layer | What it means | Needs updating? |
|---|---|---|
| **Computed** | Lunar tithi, sankranti, BS date, "nth weekday after", animal/element cycles, era numbers, prayer times, Qibla, script conversion | **Never** |
| **Expected** | Hijri months (crescent-visibility estimate), Gyalpo Lhosar (Tibetan calendar approximated) | **Never.** Labelled "सम्भावित" |
| **Announced** *(optional)* | One row in `community_overrides` when the Home Ministry or Muslim Commission publishes a date | Optional. Without it the app still works; with it the badge turns "घोषित" |
| **Content** | Names, summaries, rituals, foods, spellings | **Once.** Reviewed by a community expert, then static |

**Evidence (91 tests pass):**
- Lhosar dates reproduce Radio Nepal and published dates.
- Eid ul-Fitr 2025 and 2026 match Nepal's official announcements *with no override*.
- Mithila dates match the live app and Mithila Legacy for 2026.
- All five suites resolve every year from 2020 to 2050 without errors.

---

## 1. File map

```
src/patro-tools/communities/
  shared/types.ts        Rule union (lunar | sankranti | bs | relative | hijri | tibetan-new-year), Festival, Override, Suite
  shared/resolve.ts      ruleDates(), resolveFestival(), suiteCalendar(), upcoming()  ← one resolver for every rule
  shared/cycles.ts       12-animal cycles (Tamang / Tibetan / Gurung), element-gender cycle, era numbers
  registry.ts            SUITES = { lhosar, tharu, mithila, kirat, hijri }
  lhosar/data.ts         Sonam, Tamu, Gyalpo Lhosar, Buddha Jayanti · greetings (Tibetan script)
  lhosar/lho.ts          lhoFor(date) → animal/element/era for all three systems, with the correct year boundaries
  tharu/data.ts          Maghi (Poush 28 → Magh 2), Ashtimki, Atwari (2nd Sunday rule), Jitiya, Jur Sital
  mithila/data.ts        Tila Sankranti … Chhath (4 days) … Sama-Chakeva (9 days), Vivah Panchami, Terai Holi
  mithila/tirhuta.ts     Devanagari ⇄ Tirhuta (U+11480–114DF, checked against the Unicode database)
  kirat/data.ts          Ubhauli, Udhauli, Chasok Tangnam, Yele new year · Sakela names in 11 languages · seasonal list
  kirat/yele.ts          Yele Sambat: two new-year modes (sankranti | nearest-new-moon), yeleYear()
  kirat/limbu.ts         Devanagari → Limbu/Sirijanga (U+1900–194F): finals, subjoined letters, ज्ञ/त्र, digits
  hijri/calendar.ts      tabular Hijri, crescent visibility, expectedMonthStart(), hijriOf()
  hijri/prayer.ts        prayerTimes() (Karachi/MWL/ISNA, Hanafi/Shafi'i), ramadanDay(), qibla(), 10 Nepal cities
  hijri/data.ts          9 Islamic observances
  react/SuiteCalendar.tsx     server component: month-grouped list with computed/expected/announced badges
  react/LhoFinder.tsx         birth date → 3 animal years
  react/PrayerTimesCard.tsx   city/geolocation, method, Asr school, Hijri date, Qibla
  react/ScriptConverter.tsx   Tirhuta / Limbu / Newa
src/app-routes/api/v1/
  communities/route.ts                 list + next festival per suite
  communities/[suite]/route.ts         ?year= | ?from=   (zod-validated, reads optional overrides)
  communities/[suite]/ics/route.ts     calendar feed that updates itself (REFRESH P7D)
  communities/lho/route.ts             ?date=  (immutable cache)
  hijri/route.ts                       ?date&lat&lon&method&asr → Hijri + prayer + Qibla
  hijri/ramadan/route.ts               ?hy=1448&city= → full sehri/iftar timetable
  scripts/route.ts                     ?to=tirhuta|limbu|newa&text=
src/app-pages/  samudaya/, samudaya/[suite]/, samudaya/[suite]/[id]/ (Event JSON-LD), lho/, ramadan/
src/server/community-overrides.ts      optional DB loader (returns [] until you wire it)
scripts/export-communities-db.ts       → db/communities/{suites.json, calendar-2020-2050.json, schema.sql, seed.sql}
immersive/samudaya-chakra.html         portable one-file experience (engine bundled, 143 KB)
tests/communities.test.ts              28 tests
```

---

## 2. Suite by suite

### 2.1 Lhosar (Tamang · Hyolmo · Gurung · Sherpa)
**Rules**
| Festival | Rule | Checked |
|---|---|---|
| Sonam Lhosar | amānta Māgha śukla 1, udaya | 2025-01-30, **2026-01-19** (Radio Nepal) ✅ |
| Tamu Lhosar | BS **Poush 15** (your BS adapter; fallback = date the Sun enters Dhanu + 14) | **2025-12-30, 2026-12-30** ✅ (the app's archive) |
| Gyalpo Lhosar | Tibetan new year: first Kathmandu sunrise after the first new moon on/after 3 Feb, with 90 min tolerance (*expected*) | **10 published dates 2014–2027 match**, incl. 2027-02-07 ✅ |
| Buddha Jayanti | Baisakh purnima, madhyahna | 2025-05-12 ✅ |

**Cycles:**
- Tamang, Tibetan and Gurung 12-animal lists. The Gurung list swaps cat, eagle and deer for rabbit, dragon and pig.
- Tibetan element and gender, e.g. **Fire Male Horse** for 2026.
- Eras: **Tamang 2862** (AD+836) and **Sherpa 2153** (AD+127).
- Each system changes year on its own new year. For example, 29 Dec 2025 is Serpent in the Gurung cycle, and 30 Dec 2025 is Horse.

**Features to ship:**
1. `/lho`: "तपाईंको ल्हो कुन?" for all 3 systems, with a shareable card (animal + element + era).
2. Three Lhosar countdowns on the home page in Jan–Mar, and a Tamu Lhosar countdown in December.
3. Greeting cards: ལོ་གསར་བཀྲ་ཤིས་བདེ་ལེགས། plus Devanagari, with the year's animal and prayer-flag colours.
4. Bot command: "lho 1995-06-15" → the three animals.
5. Immersive idea: a **prayer-flag wheel**. Five-colour flags flutter, the 12 animals turn to your birth year, and the Losar countdown sits in the centre (prototype in `samudaya-chakra.html`).

**Review once:**
- The Gurung-language names for the 12 lho
- Tamang Selo and Damphu audio (licensed)
- Tamyig/Tibetan script greetings

### 2.2 Tharu
| Festival | Rule | Checked |
|---|---|---|
| **Maghi** | Makar sankranti (= Magh 1), span Poush 28 → Magh 2 | **2026-01-15**, 12–16 Jan ✅ |
| Ashtimki (Janmashtami) | Bhādra kṛṣṇa 8, udaya | ✅ |
| **Atwari** | **2nd Sunday after Ashtimki** | 2021-09-12 ✅ (Rato Pati), status *review* |
| Jitiya | Āśvina kṛṣṇa 8 (purnimānta) | 2026-10-04 (Mithila Legacy says 3 Oct, so ±1 is possible) |
| Jur Sital | Mesh sankranti, 2 days | ✅ |

**Features:**
1. A **Maghi hub** showing the day-by-day rituals, foods, and the barghar/mukhiya selection (the unique content).
2. A Maghi greeting card with an Ashtimki mural motif.
3. Atwari and Jitiya reminders.
4. A Terai farming strip (ropain, harvest, fishing season). This is content only, and optional.

**Review once:**
- Regional Maghi lengths per district
- Greetings in each Tharu variety (Dangaura, Rana, Kathariya, Kochila)
- Tharu month names. None are in the data: add them only from a community source.

### 2.3 Mithila
| Festival | Rule | 2026 |
|---|---|---|
| Tila Sankranti | Makar sankranti | 15 Jan |
| Saraswati Puja | Māgha śukla 5 | 23 Jan |
| Jur Sital | Mesh sankranti (2 days) | 15 Apr ✅ |
| Janaki Navami | Vaiśākha śukla 9, madhyahna (*review*) | 25 Apr |
| Madhushravani | ends Śrāvaṇa śukla 3, 15 days | 1–15 Aug ✅ |
| Chaurchan | Bhādra śukla 4 | 15 Sep ✅ |
| Jitiya | Āśvina kṛṣṇa 8 | 4 Oct |
| Kojagara | Āśvina purnima, nishitha | 25 Oct ✅ |
| **Chhath** | Kārtika śukla 6, **4 days** (Nahay-khay → Usha Arghya) | 13–16 Nov ✅ |
| Sama-Chakeva | Kārtika śukla 7 → purnima | 16–24 Nov ✅ |
| Vivah Panchami | Mārgaśīrṣa śukla 5 | 14 Dec ✅ |
| Holi (Terai) | Chaitra kṛṣṇa 1 (day after the hill Holi) | ✅ |

**Features:**
1. A **Chhath 4-day planner**: the day-by-day checklist, sandhya and usha arghya times from your sunset and sunrise engine (these never need updating), and a ghat locator (content).
2. A **Tirhuta converter** and Tirhuta greeting cards.
3. A Sama-Chakeva song and story page (content).
4. A Janakpur Vivah Panchami page.
5. Immersive idea: a Madhubani-style year ring with fish/peacock motifs and Chhath sunrise and sunset arcs.

**Review once:**
- Janaki Navami tithi
- Madhushravani start and end rule
- Maithili spellings of festival names
- Chhath: the rule reproduces 2026, but the Home Ministry publishes it each year, so it's marked `announced` for an optional override.

### 2.4 Kirat (Rai · Limbu · Yakkha · Sunuwar)
| Festival | Rule | Checked |
|---|---|---|
| Sakela **Ubhauli** | Baisakh purnima, udaya | **2026-05-01** ✅ |
| Sakela **Udhauli** | Mangsir purnima, udaya | 2026-12-24 (Wikipedia says 23 Dec; the purnima holds at sunrise only on the 24th, which matches the "full moon at sunrise" rule in Home Ministry notices) |
| Chasok Tangnam | Mangsir purnima (*review*) | 2026-12-24 |
| Yele Sambat new year | **Configurable**: Maghe Sankranti (default) or the new moon nearest to it | 2026-01-15 / 2026-01-20 |

**Also included:**
- **Yele Sambat 5086** (AD+3060, status *review*).
- **Sakela names in 11 languages**: Chamling Sakela, Bantawa Sakewa, Kulung Tosh, Thulung Toshi, Bahing Segro, Lohorung/Yamphu Iksamang, Puma Fagulak …
- A Limbu (Sirijanga) converter.

**Features:**
1. A Sakela page with a **language switcher** (the festival's name in the user's own Kirat language).
2. A silli circle animation.
3. Yele Sambat on the home date card.
4. A Limbu script converter and greeting cards.
5. A seasonal list (Yokwa, Balihang Tangnam, Wadhangmi) shown as seasons, with no invented dates.

**Review once (these block full launch):**
- **The Yele Sambat new-year rule and year number**. Set with `setYeleMode()`.
- Limbu transliteration rules
- The Chasok Tangnam tithi
- The Kirat Rai script (Unicode 16). Leave it out until fonts are widely available.

### 2.5 Hijri
**How it stays correct without updates:**
- **Tabular** Hijri (arithmetic) is used for navigation.
- **Expected** month starts come from crescent visibility at Kathmandu: altitude ≥ 5°, elongation ≥ 10°, age ≥ 18 h.
- It matches Nepal's announced **Eid ul-Fitr 31 Mar 2025** and **21 Mar 2026**, and **Eid al-Adha 28 May 2026**, all with no override.

**Prayer times:**
- Fajr, sunrise, Dhuhr, Asr (Hanafi or Shafi'i), Maghrib and Isha for any location. Methods: Karachi 18/18, MWL 18/17, ISNA 15/15.
- Sehri = Fajr and iftar = Maghrib.
- Qibla for Kathmandu ≈ **271.7°**.
- 10 Nepal cities are preset.

**Observances:** New Year, Ashura, Mawlid, Shab-e-Miraj, Shab-e-Barat, Ramadan start, Laylat al-Qadr, Eid ul-Fitr, Eid al-Adha.

**Features:**
1. `/ramadan`: a **full Ramadan timetable** per city (API ready), with a sehri/iftar countdown on the home page during Ramadan.
2. A prayer-time card with a Qibla compass (uses `DeviceOrientationEvent` on phones).
3. Eid countdown: "सम्भावित ±१ दिन" until announced, then "घोषित".
4. The Hijri date on the home date card.
5. Immersive idea: a **24-hour prayer clock** with daylight arcs and a Qibla needle (prototype in `samudaya-chakra.html`).

**Review once:**
- The default method and Asr school with a local mosque committee or the Muslim Commission
- Nepali spellings of Islamic terms

---

## 3. Database (optional; the engine works without it)
- `db/communities/schema.sql` sets up three tables:
  - `community_festivals`: the rules and content
  - `community_dates`: 1,062 precomputed rows for 2020–2050, for offline or non-JS clients
  - `community_overrides`: optional official dates
- `seed.sql` fills the tables.
- `suites.json` and `calendar-2020-2050.json` hold the same data for static hosting.
- Regenerate for any range: `npx tsx scripts/export-communities-db.ts 2020 2060`.

**Admin (optional):** one small form that inserts `(suite, festival_id, year, start_ad)` into `community_overrides`. It's used about 3–5 times a year (Eid ×2, Chhath, and maybe Gyalpo Lhosar). The badge changes from सम्भावित to घोषित automatically.

---

## 4. Integrating it into your app
1. Copy `src/patro-tools/communities` (it needs `core/`, `tithi-events/`, `festivals/` and `nepal-sambat/newa-script.ts` from the earlier kits). Install `astronomy-engine` and `zod`.
2. Wire `src/server/bs-adapter.ts` to **your** BS converter. Tamu Lhosar then uses exact Poush 15.
3. Add the API routes and pages. Add a **"समुदाय" card** on `/tools`, and a **community line on the home date card** that the user can choose in settings (e.g. "Hijri + Yele Sambat").
4. Personal feature: the user picks their communities in settings, and those festivals appear in their reminders and calendar feed.
5. Fonts via `next/font/google`: Noto Sans Tirhuta, Noto Sans Limbu, Noto Serif Tibetan and Noto Naskh Arabic. Only load them on pages that need them.
6. Run `npm test`: all 91 tests must stay green.

## 5. Portable experience: `samudaya-chakra.html`
One 143 KB file with the whole engine bundled; the only external request is Google Fonts. It **recomputes everything each time it opens**, so it never goes stale.
- **Year ring:** five coloured tracks, one per suite. Each festival is a dot (multi-day festivals are arcs), a hand shows today, the background slowly rotates, and each suite can be toggled on or off.
- **"आउँदै":** the next festivals across all suites, with countdown rings and computed/expected/announced badges. A festival shared by two suites shows as one card.
- **Lho wheel:** 12 animals turn to your birth year, with Tamang, Gurung and Tibetan tabs.
- **Prayer clock:** a 24-hour dial with the Fajr, day and Isha arcs, prayer markers, the current-time hand and a Qibla needle.
- **Script playground:** Newa, Tirhuta and Limbu.
- **Sakela silli circle:** the 11 language names turning slowly around the next Sakela date and the Yele Sambat year.
- It respects the reduced-motion setting, has no sideways scroll at 390 px, and loaded with 0 console errors (checked in Chromium).

Rebuild after engine changes:
```
node -e "require('esbuild').buildSync({entryPoints:['immersive/samudaya-entry.ts'],bundle:true,minify:true,format:'iife',globalName:'S',outfile:'immersive/samudaya.bundle.js'})"
python3 - <<'PY'
s=open('immersive/samudaya-chakra.src.html').read(); b=open('immersive/samudaya.bundle.js').read()
open('immersive/samudaya-chakra.html','w').write(s.replace('/*__BUNDLE__*/', b.replace('</script','<\\/script')))
PY
```

## 6. Status `review`: the only things a human must confirm (once)
- Gurung lho names in Gurung · Tharu month names (not included) · Maghi regional lengths
- Atwari rule for more years · Janaki Navami and Madhushravani rules · Maithili spellings
- **Yele Sambat new-year rule and number** · Limbu transliteration · Chasok Tangnam tithi
- Default Hijri method and Asr school
- Every festival's `status` field is in the data; show "समीक्षाधीन" in the interface until it's cleared.

## 7. Known limits
- **Gyalpo Lhosar:** an empirical Phugpa rule that fits every published Losar from 2014 to 2027. An edge case is possible when a new moon falls on 2–3 Feb (e.g. 2030), so it's marked "expected"; add an override if the official notice differs.
- **Hijri:** the crescent criterion is a simple estimate. It's right for 2025–26 in Nepal, but edge years can be off by one day, hence "expected".
- **Prayer-time methods:** local mosques may add small precaution minutes. The method is shown and can be switched.
