# World calendars — build plan and launch checklist

Four new page families for global search traffic, built as one isolated Worker module (`worker/worldcal`).
Research, sources and test vectors: `docs/worldcal/RESEARCH.md` and the
summary in §4 below.

**Status:** built and tested locally on branch `feat/worldcal`. Not pushed and not deployed.

## 1. URL map

| Family | Language | URLs |
|---|---|---|
| Name days | cs, sk, hu (pl disabled) | `/nameday` hub · `/nameday/{country}` today · `/nameday/{country}/{mm-dd}` · `/nameday/{country}/month/{mm}` · `/nameday/{country}/name/{name}` (+ `.ics` reminder) · `/nameday/{country}/search?q=` · `/nameday/{country}/data.json` (CC BY-SA share-alike copy) |
| Ethiopian calendar | en + am | `/ethiopian-calendar` today + converter + Ethiopian clock · `/ethiopian-calendar/date/{yyyy-mm-dd}` · `/ethiopian-calendar/{EY}` · `/ethiopian-calendar/{EY}/{month}` · `/ethiopian-calendar/holidays/{GY}` · `/ethiopian-calendar/time` · `/ethiopian-calendar/convert` (redirect) |
| Bali calendar | id | `/bali-calendar` today · `/bali-calendar/{yyyy-mm-dd}` · `/bali-calendar/hari-raya/{GY}` · `/bali-calendar/wuku/{wuku}` · `/bali-calendar/otonan` (+ `?lahir=` result, noindex) |
| Weton | id | `/weton` today · `/weton/{yyyy-mm-dd}` · `/weton/{hari}-{pasaran}` (35) · `/weton/jodoh` (+ query result, noindex) · `/weton/hitung` (redirect) |
| Moon calendar | de, es, it | `/mondkalender`, `/calendario-lunar`, `/calendario-lunare`: today · `/{yyyy-mm-dd}` · `/{yyyy}/{mm}` · German only: `/mondkalender/haare-schneiden` |
| Sitemaps | — | `/sitemap-worldcal.xml` → `/sitemap-wc-{family}.xml` (≤ 45,000 URLs each) |

Country slugs: `czech-republic`, `slovakia`, `hungary`, `poland` (disabled). Indexable URLs at launch: about **42,000**
(weton 32.5k birth-date pages from 1940, name days 2.7k, Ethiopian 1.8k, Bali 1.2k, moon 3 × 1.2k).

## 2. Request flow (backend)

```
request ─► worker/optimized-entry.ts
            ├─ exploreResponse()        (existing, null for these paths)
            ├─ worldcalResponse()  ◄── new: null unless the path is one of the prefixes above
            │     ├─ 301 to lower-case / no trailing slash
            │     ├─ Cache API hit → return
            │     ├─ route → engine → HTML (no D1, KV or R2)
            │     └─ cache.put (today pages until local midnight, others 7 days)
            └─ …all existing handlers unchanged
```

* No storage reads: engines compute everything; name-day data (≈100 KB JSON) and Bali Saka tables are bundled.
* CPU per cache miss (Node, local): 1–5 ms for calendar pages, 20–90 ms for moon pages (hourly sampling + bisection).
* "Today" pages: `s-maxage` = seconds to the next local midnight of that market's time zone.
* Form endpoints are the only ones whose cache key keeps the query string; result pages are `noindex`.
* Failures return `503 Retry-After` (crawlers retry instead of dropping URLs).

## 3. Frontend

Standalone server-rendered HTML (`worker/worldcal/html.ts`), no SPA bundle, so the answer is in the first byte.
Light/dark via `prefers-color-scheme`, mobile-first (16 px gutters, single-column under 560 px), no external scripts.
Forms are plain GET forms that redirect to canonical pages, so they work without JavaScript. The only script is the
Ethiopian live clock (inline, 6 lines). Each page carries WebPage + BreadcrumbList JSON-LD, canonical, robots and,
for the moon family, `hreflang` alternates between de/es/it for the same date.

## 4. Engines, data and licences

| Engine | Source / method | Verification (tests/worldcal.test.ts) |
|---|---|---|
| Ethiopian | JDN epoch 1724221, leap when EY mod 4 = 3 | Matches ICU/CLDR `ethiopic` on every day 1890–2109; 12 cited vectors |
| Bahire Hasab | Medeb → Wenber → Metqe → Beale Metqe → Tewsak → Nenewe; feast offsets | Equals Julian Easter 1600–2399; cited Fasika 2025–2032 |
| Pawukon / weton | Reingold–Dershowitz `calendar.l` (Apache-2.0) | R&D vector 2001-09-11; full published 2026 holiday list; 17 Aug 1945 Jumat Legi |
| Moon | astronomy-engine (already a dependency); IAU constellations for day types, tropical signs for haircuts | Oct 2026 events within 15–30 min; day types identical to icalendario.net for 29/31 days, the other 2 contain the published type |
| Name days CZ/HU | Wikipedia lists via `namedays-cs` / `nevnap` → **CC BY-SA 4.0** (attribution + share-alike `data.json`) | 366 days, leap rules, upstream HU May shift fixed, NFC-normalised |
| Name days SK | MK SR calendar via `name-day-calendar` → public information (§ 5 Act 185/2015) | Fixed 29 Feb Radomír, typo fixed |
| Name days PL | package states no source → **disabled** | `/nameday/poland` returns 404 |

Re-create the name-day files with `node scripts/worldcal/vendor-namedays.mjs <dir-of-npm-packs>` (instructions in the script).

## 5. Isolation guarantees

* New prefixes only; checked against the 22,902-URL published baseline, every sitemap in `public/`, the explore,
  growth and atlas paths, and known legacy routes (`tests/worldcal.test.ts`).
* One additive hook in `worker/optimized-entry.ts`; no existing file's behaviour changes.
* Separate sitemap index (`/sitemap-worldcal.xml`); `public/sitemap.xml` and `robots.txt` are untouched.
  Submit the new index in Search Console / Bing Webmaster manually.

## 6. Before launch (blockers from the research)

1. **Ethiopian:** confirm whether Genna stays on 7 Jan in 2028 (page currently shows 8 Jan with a warning); confirm Derg
   Downfall Day status for 2027; native Amharic review of holiday names, weekday transliterations and the Ge'ez
   numeral routine.
2. **Bali/Java:** Saka table beyond 2026 (purnama/tilem 2027+) from the printed Kalender Bali; confirm computed 2027
   Galungan/Kuningan when the 2027 Kalender Bali is out; native review of Indonesian copy and primbon meanings.
3. **Moon:** explain the 1–2 h gap against mondkalender-online.de tropical ingress times (check a second source);
   check DPMA/EUIPO for "Maria Thun" / "Aussaattage" (the pages never use those names).
4. **Name days:** confirm the Wikipedia CC BY-SA attribution wording; review CZ against a current printed calendar
   (two packages differ on 65 dates); fetch the 2023 MK SR additions; rebuild PL from pl.wikipedia/Wikidata.
5. **Infra:** Workers Paid plan before heavy crawling (Free = 100,000 requests/day).
6. **Measure:** real Google SERPs and keyword volumes per market (could not be measured in research).

## 7. Release steps (when approved)

1. `npm run build && npm run release:verify` (includes `npm run test:worldcal`).
2. Merge `feat/worldcal` to `main` → the existing Release Gate deploys the Worker.
3. Smoke: `/nameday/hungary`, `/ethiopian-calendar`, `/bali-calendar`, `/weton`, `/mondkalender`, `/sitemap-worldcal.xml`.
4. Submit `https://aafnaipatro.com/sitemap-worldcal.xml` in Google Search Console and Bing Webmaster Tools.
5. Watch Search Console coverage per prefix for 4–6 weeks; widen or narrow `INDEX_WINDOW` in `worker/worldcal/config.ts`.
