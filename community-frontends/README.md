# Community front ends: 7 portable pages

Each file in `dist/` is **one self-contained HTML page**: engine, UI kit and styles are all inlined. The only external request is Google Fonts. Every page **recomputes all dates when it opens**, so none of them ever goes stale. All pages link to each other, so keep them in the same folder.

| File | Community | Design idea | Signature interactions |
|---|---|---|---|
| `nepal-sambat-mandala.html` | Newar | Turning lunar mandala | Drag the wheel through time, month chant, memory palace, quiz, name in Newa script |
| `lhosar.html` | Tamang · Gurung · Sherpa | **लुङ्दर**: prayer flags in a Himalayan dawn sky | Flags carrying the next festivals, **three Lhosar "doors"**, **spinnable prayer wheel (mane)** showing your animal year in 3 systems, **Damphu rhythm trainer** (tap along, accuracy score), greeting card with Tibetan script |
| `tharu.html` | Tharu | **माघीको आगो**: mud-wall mural colours, night fire | **Fire that grows as Maghi approaches** (particle canvas), dancers circling the fire, **5 illustrated Maghi days**, **Barghar self-government explainer**, **rice-cycle year strip** with festivals, Maghi card with district |
| `mithila.html` | Maithil | **मधुबनी वर्ष**: Madhubani sun, fish, double outlines | **Painted year ring** of festival motifs, **Chhath 4-day planner** (sandhya and usha arghya times worked out for the chosen city, with a saved checklist), Sama-Chakeva clay birds, **Tirhuta alphabet pad** and converter, Madhubani-border card |
| `kirat.html` | Rai · Limbu · Yakkha · Sunuwar | **साकेला सिली**: forest night, dhol drum centre | **Language switch**: the page renames itself (Sakela / Sakewa / Tosh / Toshi / Segro / Iksamang / Fagulak), silli dance circle led by gold Silimangpa and Silimangma figures, **Ubhauli ↑ / Udhauli ↓ hill journey**, **Yele Sambat with both new-year rules**, Limbu (Sirijanga) converter, seasonal festivals shown without invented dates |
| `hijri.html` | Muslim | **हिलाल**: teal night sky, crescent | Today's real moon phase and Hijri date (Arabic + Nepali), **"next crescent" evening-by-evening visibility check** (age, altitude, elongation), **24-hour prayer clock**, method and Asr school switch, **Qibla compass** (uses the phone's compass), **full Ramadan sehri/iftar table**, Eid card |
| `samudaya-chakra.html` | **All 7 calendars** | Night-sky year ring | **7 tracks** (national/Hindu, Nepal Sambat, Lhosar, Tharu, Mithila, Kirat, Hijri), **white threads join days shared by several communities**, yearly stats, **"एउटै दिन, धेरै नाम"** (one day, many names) list, doors into each suite |

## Shared behaviour (from `kit.js` and `kit.css`)
- **Badges:** "गणना" (computed), "सम्भावित" (expected) and "घोषित" (announced). "समीक्षाधीन" (under review) marks content a community expert still needs to confirm.
- **Timeline and detail:** a month-grouped timeline for this year and next with countdown rings, and a detail card showing rituals, places and sources.
- **Share cards:** drawn in the browser on a canvas, so Devanagari, Tibetan and Arabic render correctly. Saved via the Web Share API, or downloaded as PNG.
- **Sound:** bell and drum, **off by default**.
- **Reduced motion:** when the phone or computer asks for less motion, all animation stops.
- **Tested:** 0 console errors, no sideways scrolling at 390 px and 1280 px (Chromium).

## Rebuild after changing the engine or a page
```bash
node -e "require('esbuild').buildSync({entryPoints:['immersive/suites/entry.ts'],bundle:true,minify:true,format:'iife',globalName:'S',outfile:'immersive/suites/engine.bundle.js',target:'es2020'})"
python3 immersive/suites/build.py        # → immersive/suites/dist/*.html
```
The Nepal Sambat mandala is built separately (`immersive/nepal-sambat-mandala.src.html` + `db/nepal-sambat/immersive-data.json`).

## Moving them into the Next.js app
Each page maps onto a route and a few components, and the engine functions are the same ones the pages call:

| Page section | Next.js |
|---|---|
| Hero countdown, timeline, detail | server components using `suiteCalendar()` / `upcoming()` (ISR) |
| Prayer wheel, Damphu, fire, silli circle, prayer clock, Qibla | client components (`'use client'`), lazy-loaded below the fold |
| Chhath times, Ramadan table | server-rendered from `sunriseSunset()` / `ramadanDay()` for the chosen city (`?city=`) |
| Share cards | client component with `<canvas>` |
| Samudaya ring | `/samudaya/chakra`: compute on the server once a day and send the event list as JSON props |

Suggested routes: `/samudaya/lhosar`, `/samudaya/tharu`, `/samudaya/mithila`, `/samudaya/kirat`, `/samudaya/hijri`, `/samudaya/chakra`, `/nepal-sambat/mandala`.
