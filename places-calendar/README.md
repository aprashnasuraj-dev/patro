# Aafnai Patro — Places, Festivals, Kati and Life-event pages

> **Status in this repository: not wired into production yet.**
> This folder is a self-contained Python generator. `npm run build`, the Worker,
> `dist/` and every existing route are untouched by it. Production runs on
> Cloudflare Workers with a 19,500-file static budget, so these ~21,500 pages must
> **not** be copied into `dist/`. The intended path is the existing explore system
> (`worker/explore`, R2 under `explore/v1/`, `sitemap-explore.xml`): each section
> becomes an explore family. See "Integrating with this repository" below.
> The `deploy/` nginx and Docker files are only for running the pages standalone.

A static-site generator for aafnaipatro.com. It calculates festival dates, unit
conversions and life-event dates from first principles and produces
bilingual (English / नेपाली) pages that sit **alongside** the existing site.
It never touches the existing app: `/date/`, `/calendar/`, `/tools/`,
`/convert`, `/rashifal` and `/guides/` stay exactly as they are, and the new
pages link *into* them.

Full build (BS 2083–2100, built 2026-10-10): **21,548 pages**, 0 problems in
`tests/check_build.py`.

| Section | URL pattern | Example | Pages (en+ne) |
|---|---|---|---|
| Place × festival × year | `/places/{place}/{festival}-{year}/` | `/places/pashupatinath/maha-shivaratri-2083/` | 4,502 |
| Place hubs | `/places/{place}/` | `/places/lumbini/` | 120 |
| Festival × year | `/festivals/{festival}/{year}/` | `/festivals/laxmi-puja/2083/` | 2,054 |
| Festival hubs | `/festivals/{festival}/` | `/festivals/chhath/` | 114 |
| Mountains, mountain × year | `/mountains/{peak}/`, `/mountains/{peak}/{year}/` | `/mountains/everest/2084/` | 950 |
| Treks, trek stops | `/treks/{trek}/`, `/treks/{trek}/{stop}/` | `/treks/everest-base-camp/dingboche/` | 100 |
| **Kati questions** | `/kati/{value}-{from}-kati-{to}/` | `/kati/1-tola-kati-gram/` | 9,808 |
| Kati pair tables | `/kati/{from}-kati-{to}/` | `/kati/ropani-kati-aana/` | 788 |
| Kati topics | `/kati/{topic}/` | `/kati/land/` | 16 |
| Age by birth year | `/kati/umer/{year}/` | `/kati/umer/2060/` | 170 |
| **Birth month** | `/janma/{year}/{month}/` | `/janma/2060/shrawan/` | 2,174 |
| **Shraddha by tithi** | `/shraddha/{month}-{paksha}-{tithi}/` | `/shraddha/kartik-krishna-ashtami/` | 722 |
| Sorha Shraddha | `/shraddha/sorha-shraddha/{year}/` | `/shraddha/sorha-shraddha/2084/` | 22 |

Every page exists in English and in Nepali (`/ne/...`), linked with hreflang.

## Past years are not built

The build starts at the **current BS year** (2083 today) and runs to 2100. When
the year rolls over, the old year's pages stop being generated and
`build/redirects-places.conf` sends their URLs to the hub pages with a 301
(include it in nginx, see `deploy/nginx.conf`), so links and rankings are kept.
Past years are still used in `tests/test_dates.py` to prove the engine is
right; they are just not published.

## Kati — everyday Nepali measurements

4,904 questions across seven topics, each answered exactly with fractions and
written the Nepali way (lakh grouping 1,00,000, Devanagari digits on Nepali
pages):

* **Land**: ropani, aana, paisa, daam, bigha, kattha, dhur, sq ft, sq m, acre, hectare
* **Gold and silver**: tola, lal, gram, kg, troy ounce
* **Market weight**: dharni, bisauli, pau (labelled approximate: the dharni was
  never fixed by law; the UN Statistical Office figure of 2.3325 kg is used)
* **Grain**: muri, pathi, mana, mutthi, litre
* **Length**: haat, bitta, angul, kos (approximate), inch, foot, metre, cm, km
* **Panchang time**: ghadi, pala, bipala, muhurta, prahar, day, hour, minute, second
* **Numbers**: hajar, lakh, crore, arab, kharab, neel, padma, shankha vs thousand,
  million, billion, trillion

Each question page has: the answer, the formula, the answer as mixed local units
("7 kattha 10.23 dhur"), the plot as a square (land), every equivalent, a table
of nearby amounts, the reverse question, a live converter, unit notes with
sources, FAQ structured data — and a link to the matching **existing**
aafnaipatro.com tool (`/tools/landconverter`, `/tools/gold`, `/tools/units`,
`/tools/words`, `/tools/age`) so search traffic flows into the tools.

Factors live in `data/units.yaml`. If the site's own converters use different
rounding, change the factor there once and rebuild. `tests/test_units.py`
checks 34 published equivalences.

Metric-to-metric questions (kg → gram) are skipped on purpose: they are not
Nepal questions and would duplicate across topics.

## Life events

* **Birth months** (`/janma/`, BS 2000 to now): for every day, the tithi, nakshatra
  and moon rashi at Kathmandu sunrise, with the exact time of any change (so a
  reader born after that time knows to use the second value), and the date of
  their **next tithi birthday**. Each day links to the site's own `/date/` page;
  each month links to `/tools/baby-names`, `/rashifal`, `/tools/tithi-reminder`,
  `/tools/janmadin-akhbar` and the age page.
* **Shraddha** (`/shraddha/`): all 360 tithis (12 lunar months × 30), each with
  the next 11 years of dates and tithi start/end times, using the aparahna
  (afternoon) rule; pages say that families may follow another rule. Sorha
  Shraddha pages list the 16 Pitri Paksha days per year.

## Festivals and places

* **57 festival rules** (Hindu, Buddhist, Kirat, Newar jatras, Sikh, Jain,
  Christian, Muslim) and **60 places** across all seven provinces: temples, stupas,
  gumbas, caves, ponds, a church, a gurudwara and a mosque.
* Each place × festival page: tithi times at that exact place, the festival's
  own puja window, Rahu kaal, crowd forecast, best time to go, a link to the
  site's `/date/` page for the full panchang, and all upcoming years.

## Accuracy

`tests/test_dates.py`: **52 of 52** official dates match, including the 2080 and
2082 Nepal Gazette holiday lists, Dashain 2083 as fixed by the Nepal Panchanga
Nirnayak Samiti, Laxmi Puja 2081, Janmashtami 2080/2081, Jitiya, Yomari Punhi
and Sithi Nakha. The kaal rules (udaya tithi, Nishita, Pradosh, Madhyahna,
Aparahna) were tuned against these.

Pin any date the Samiti decides differently in `data/overrides.yaml`. Eid (moon
sighting), Gyalpo Lhosar and Mani Rimdu (Tibetan calendar) are labelled
approximate. Chaitra festivals can fall twice or not at all in a BS year (Ram
Navami has none in 2083); such years get keys like `2084-baisakh` and the
report lists the gaps.

## Linking the existing calendar to the festival pages

`build/places-data/festivals/by-date.json` maps every date to its festivals and
page URLs. To show "Festivals on this day" on the existing `/date/` pages, add
two lines to that template — nothing else on the page is touched, and if the
JSON is unavailable the box simply stays empty:

```html
<div data-aafnai-festivals></div>
<script src="/static/places/festival-links.js" defer></script>
```

## Quick start

```bash
pip install -r requirements.txt        # Python 3.11+
python tests/test_dates.py             # 52/52 official dates
python tests/test_units.py             # 34/34 exact conversions
python -m generator.build              # everything, current BS year → 2100 (~6 min on 3 cores)
python tests/check_build.py build      # links, JSON-LD, hreflang, titles
cd build && python -m http.server 8000 # http://localhost:8000/kati/
```

Flags: `--only kati,janma` (sections), `--years 2083-2090`, `--no-images`,
`--image-years 2083-2085`, `--path-root /explore` (mount under a prefix),
`--base-url`, `--asset-prefix`, `--today YYYY-MM-DD`.

Social cards: one per kati pair and topic, per place, per festival and per
festival-year/place-festival page for the current year to +2 (2,178 cards,
~135 MB). Other pages reuse their parent's card.

## Deploying on aafnaipatro.com

* Copy `build/` to the server and include `deploy/nginx.conf` in your
  `server {}` block. It serves only these paths: `/places`, `/festivals`,
  `/mountains`, `/treks`, `/kati`, `/janma`, `/shraddha` (each also under `/ne/`),
  `/og/`, `/static/places/`, `/places-data/`, `/sitemap-places.xml`, `/sitemaps/`.
* Add `Sitemap: https://www.aafnaipatro.com/sitemap-places.xml` to `robots.txt`
  and submit it in Search Console.
* Daily rebuild example (standalone hosting only): `deploy/rebuild-workflow.example.yml`.
* Docker: `docker build -f deploy/Dockerfile -t aafnai-places .`
* Your own header and footer: edit `generator/templates/base.html`; every other
  template only fills `{% block main %}`.

## Growing further

* **OpenStreetMap import — done, runs on GitHub.** First run (2026-10-10): 8,721 OSM
  features → **7,566 places of worship** (temples, gumbas, stupas, 307 mosques, 275
  churches) and **447 peaks/viewpoints**, all 7 provinces and 76 of 77 districts.
  Generic names are told apart with the nearest village or town
  ("Hanuman Mandir, Gaur"). With this data the generator produces about
  **666,000 pages** (≈10 GB of HTML), 628,000 of them from imported places and
  served `noindex` until they earn impressions; imported places get no crowd
  forecast, because nothing is known about their crowds. That volume can only
  go live through R2 (the explore system), never `dist/`.
* **How the import works.** Actions → "Places: OpenStreetMap import"
  (`.github/workflows/places-osm-import.yml`) downloads the Geofabrik Nepal
  extract (the public Overpass servers reject GitHub's runners), reads every
  named temple, gumba, mosque, church, peak and viewpoint with pyosmium, assigns
  each to its district and province from OSM boundaries in the same file, checks
  the data still builds, and commits
  `data/places_osm.yaml` / `data/peaks_osm.yaml` (to the feature branch, or as a
  PR when run on `main`; monthly by schedule). Imported pages start as noindex
  until they earn impressions. Locally: `python tools/osm_import.py`.
* `python tools/prune.py search-console-pages.csv` noindexes pages with no
  impressions after 90 days and promotes imported pages that earned them.
* Add a place, festival or unit by editing the YAML in `data/` — no code changes.

## Project layout

```
engine/      astro.py (Sun/Moon), bs.py (Bikram Sambat), lunar.py (lunar months),
             festivals.py (rules), panchang.py (daily panchang), units.py (kati),
             life.py (birth-day sky, tithi birthdays, shraddha)
data/        festivals.yaml, places.yaml, peaks.yaml, treks.yaml, units.yaml, overrides.yaml
generator/   model.py, kati.py, life.py (page contexts), images.py, build.py,
             templates/, static/ (CSS, JS, fonts, festival-links.js)
tools/       osm_import.py, prune.py
tests/       test_dates.py, test_units.py, check_build.py
deploy/      nginx.conf, Dockerfile, nginx-standalone.conf
```

## Licences

* Code: yours to use on aafnaipatro.com.
* Mukta typeface by Ek Type — SIL Open Font License (`assets/fonts/Mukta-OFL.txt`).
* astronomy-engine (MIT), nepali-datetime (MIT), Jinja2 (BSD), Pillow (HPND).
* OpenStreetMap data, if imported: © OpenStreetMap contributors, ODbL 1.0.
* Text in `data/` is original; unit factors cite their sources on each page.

## Integrating with this repository

What already exists on aafnaipatro.com and must not be duplicated or shadowed:

| Existing | This package | Decision needed |
|---|---|---|
| `/festivals/...` (prerendered festival pages) | `/festivals/{id}/`, `/festivals/{id}/{year}/` | Merge the computed timings into the existing festival pages, or publish under another prefix (e.g. `/parva/`). Do not ship both. |
| `/place/...` explore family (provinces, districts, palikas) | `/places/{temple}/...` | Keep a separate prefix (e.g. `/tirtha/` or `/mandir/`) or nest under the palika pages. |
| `/janmapatro`, `/janmadin`, `/tools/age` | `/janma/{year}/{month}/`, `/kati/umer/{year}/` | Free prefixes today; check against `seo/published-url-baseline.json`. |
| `/tools/units`, `/tools/landconverter`, `/tools/gold` | `/kati/...` answer pages | Complementary: kati pages answer one question and link to the tool. |

Suggested order:

1. **Kati** and **shraddha** as explore families first: new prefixes, no overlap,
   highest everyday search demand.
2. Birth months (`/janma/`), after confirming the prefix.
3. Festivals and sacred places, after deciding how they relate to the existing
   `/festivals/` and `/place/` pages.

An explore family is an `.mjs` file yielding records (`path`, `title`, `facts`,
`sections`, ...). The bridge is to have this generator emit those records as JSON
lines and add a thin family that reads them; the render side then needs a small
extension in `worker/explore/render.ts` for the richer blocks (day timeline,
converter, birth-month table), guarded by `tests/explore-engine.test.ts`.
