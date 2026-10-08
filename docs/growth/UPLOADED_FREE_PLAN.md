# Aafnai Patro on the Cloudflare Free plan — budget and wiring (8 Oct 2026)

The owner runs on the Free plan for Workers, D1, KV and R2. This file explains how the growth plan fits those limits and what the rest of the site should change so traffic growth does not hit a daily cap.

## 1. The limits that matter (verified Oct 2026)

| Service | Free limit | What happens when exceeded |
|---|---|---|
| Workers requests | **100,000 / day** (resets 00:00 UTC = 05:45 NPT) | Requests that invoke the Worker get errors (429/1027) until reset |
| Workers CPU | **10 ms per request** | Request fails (Error 1102) |
| Workers subrequests | 50 per request | Throws |
| Cron Triggers | 5 per account | Deploy rejected |
| Worker size | 64 MiB (raised from 3 MB on 4 Sep 2026) | Deploy rejected |
| Static Assets | **Free and unlimited requests**; 20,000 files per version; 25 MiB per file | Only requests matched by `run_worker_first` count as Worker requests |
| D1 | 5M rows read / day; **100K rows written / day**; 5 GB | Queries error until reset |
| KV | 100K reads / day; **1K writes / day**; 1 GB | Operations error until reset |
| R2 | 10 GB-month; 1M Class A + 10M Class B ops / month; free egress | Ops fail / billing required |
| Workers Builds | 3,000 min / month (only if using Cloudflare's Git builds) | The repo deploys through GitHub Actions instead |

**The tightest limit is the 100K Worker requests per day.** Static asset requests do not count, as long as they are not matched by `run_worker_first`.

## 2. What the site costs today (before this patch)

`wrangler.jsonc` had `run_worker_first: ["/*", "!/assets/*"]`, so every request except `/assets/*` invokes the Worker.

A single homepage view costs about **6 Worker requests**:

| Request | Worker | D1 / R2 |
|---|---|---|
| HTML (SEO-injected) | 1 | — |
| `/aap/runtime.js` (a static file, but routed through the Worker for one header) | 1 | — |
| `/api/aap/hit` (pageview analytics) | 1 | **1 insert + index rows** into `aap_pageviews` |
| `/api/v1/auth/me` (also for signed-out visitors) | 1 | session lookup |
| `/api/v1/weather/daily` | 1 | — / upstream |
| `/api/v1/on-this-day` | 1 | D1 or R2 read |

That means the daily cap is reached at **≈16,000 homepage views per day**. Visits beyond that get errors for the rest of the UTC day. Growing traffic without fixing this would break the site.

## 3. What patch 0004 does for the growth pages (done, tested)

All **337 growth pages** (moon, eclipse, DE/FR/ES/IT moon and eclipse, Nepal for the world, US festivals, Nepal weather) are now **static files**.

- **Build:** `scripts/prerender-growth.mjs` runs inside `npm run build` and writes `dist/moon.html`, `dist/moon/new-york.html` and so on. It takes 28 s and produces 339 files, about 4.8 MB. The build fails if the file count passes 19,500.
- **Serving:** `run_worker_first` now excludes `/moon`, `/eclipse`, `/nepal`, `/us/*`, `/weather`, `/de/*`, `/fr/*`, `/es/*`, `/it/*` and `/sitemap-growth.xml`. These pages cost **0 Worker requests, 0 CPU, 0 D1/KV/R2**, with no limit on views.
- **Live values in the browser:**
  - Moon phase, % lit, age and "is tonight a full moon" come from quarter instants embedded for 400 days.
  - The BS date comes from month starts embedded for this year and next.
  - The Nepal time difference is computed from the visitor's own time zone.
- **Weather and trek forecasts:** fetched by the visitor's browser straight from Open-Meteo. That uses 0 Worker requests, and each visitor's call counts against Open-Meteo, not against us.
- **Freshness:** `.github/workflows/growth-daily-refresh.yml` runs at 00:05 NPT and triggers the normal deploy, so crawlers see a fresh snapshot. The pages stay correct without a deploy anyway, because their tables cover 30–400 days.
  - Each deploy also runs the existing On This Day priming, about 370 Worker requests (0.4% of the daily budget).
  - GitHub Actions minutes are free for public repos. If the repo is private, check its build time against GitHub Free's 2,000 min/month: 30 daily runs × build minutes.
- **Worker fallback:** if a growth URL still reaches the Worker (old config, missing file), the Worker only proxies the static file or returns a 301/302/404. It never runs the astronomy engine, so it stays well under 10 ms.
- **Upgrading later:** on Workers Paid, setting `GROWTH_DYNAMIC="1"` switches back to on-demand rendering with the Cache API.
- **Bundle size:** the growth code adds 37 KB gzipped to the Worker (190 KB → 228 KB), against a 64 MiB limit.
- **Tests:** `npm run test:growth-pages` runs 14 tests. They cover the prerender of all 337 pages with no server fetch, the cheap fallback (the test throws if `DB`, `CACHE` or `ARCHIVE` is touched), and the `run_worker_first` exclusions.
- **Browser check:** Playwright, LA time zone, 3 days simulated. Live values updated on every page, no JS errors, no horizontal scroll at 380 px.

## 4. Changes recommended for the rest of the site (not in the patch; no feature removed)

These changes are ordered by how many Worker requests they save per view. Each one keeps the same feature and the same user experience.

| # | Change | Saves / view | Notes |
|---|---|---|---|
| 1 | Add `"!/aap/runtime.js"` and `"!/aap/analytics.js"` to `run_worker_first`. Move their `cache-control: public, max-age=300` into `public/_headers`. | 1 | The Worker only passes these through (`worker/admin-console/index.ts` line 400). Keep `/aap/settings.js` on the Worker if it is dynamic. |
| 2 | Call `/api/v1/auth/me` only when a session cookie exists. Set a non-HttpOnly marker cookie `aap_signed_in=1` on login and clear it on logout, then check `document.cookie` in `src/auth/account-client.ts`. | 1 for signed-out visitors (most) | Signed-in users get the same experience as today. |
| 3 | On This Day: fetch the static `/data/on-this-day/month-MM.json` (same shape `worker/history-fast.ts` already reads from ASSETS) in `HomeExperience.tsx`, and keep `/api/v1/on-this-day` as the fallback. | 1 | Static asset, so free. Also saves the R2 Class B / D1 read. |
| 4 | Homepage weather: fetch Open-Meteo from the browser, as the growth pages do (CSP already allows `api.open-meteo.com`). Keep the API route for the existing caller as a fallback. | 1 | Each visitor's call counts against Open-Meteo, not against us. See the Open-Meteo terms in section 6. |
| 5 | Pageview analytics: turn on **Cloudflare Web Analytics** (free, no Worker, no D1). Keep `/api/aap/hit` but **sample it** (`Math.random() < 0.1`, stored with `weight=10`), or batch it client-side. | 0.9 + D1 writes | Admin console totals stay correct when weighted. D1 writes drop by 10×. |
| 6 | Prerender the SEO HTML for the top SPA routes (`/`, `/rashifal`, `/convert`, `/calendar/...`) into `dist/` and exclude them. | 1 on those routes | Only where the HTML does not change per request. Refresh daily with the same scheduled deploy. |

**Expected result:** about 6 → **1–1.2 Worker requests per homepage view**. The daily ceiling rises from ≈16K to **≈80–100K homepage views/day**. Growth pages stay unlimited on top of that.

## 5. D1, KV, R2 and cron rules for all new work

- **D1 reads (5M/day):**
  - "Rows read" counts every row *scanned*, not returned.
  - Index every column used in `WHERE`/`ORDER BY` on `aap_pageviews` and history tables.
  - The admin dashboard should read **daily rollup rows**, not scan raw pageviews. Have the `43 2 * * *` cron write one rollup row per day and path.
  - Delete raw pageviews older than 30–90 days. This also keeps the database under 5 GB.
- **D1 writes (100K/day):**
  - One insert writes the row plus one row per index.
  - No per-view writes without sampling.
  - Batch writes (`db.batch`) from crons.
- **KV (1K writes/day):** never write KV in a request path. Use KV only for config changed by an admin. Per-request reads are fine up to 100K/day, but prefer static files.
- **R2:**
  - Class B is 10M/month, about 330K/day. Class A is 1M/month, about 33K/day.
  - Prefer **static assets over R2** for anything that changes only per deploy, such as datasets and history JSON.
  - Use R2 for user uploads and for archives that are too big for the 20,000-file / 25 MiB asset limits.
- **CPU (10 ms):**
  - No astronomy or panchang computation in the Worker per request. Compute at build time, or in the browser.
  - The `*/5` cron runs 288 times a day under the same 10 ms CPU limit. Check in `wrangler tail` that it finishes in time, or move it to hourly.
- **Crons (5 per account):** 4 are used. The growth refresh uses **GitHub Actions**, not a Cloudflare cron, so 1 slot stays free.
- **Static file count:** growth adds 339 files. A future `/sun/{city}` or calendar-month family should check `find dist -type f | wc -l` stays under 19,500 (the prerender script enforces this).

## 6. How the next tasks fit the Free plan

These map the NEXT-AGENT-PROMPT tasks onto the Free plan.

| Task | Free-plan design |
|---|---|
| A. Rashifal per sign | Prerender 12 signs × today/tomorrow/week as static files in the daily deploy. 0 Worker requests. |
| B. Date converter answers | Static pages per BS month (the answer for every day of the month is in the HTML). Converter input is handled client-side. Do not make a dynamic page per date. |
| C. Calendar month pages | Static prerender. Each BS year has 12 files. |
| D. Festival answers / countdown | Static page with the date embedded; the countdown is computed in the browser. |
| E. Dashain/Tihar e-cards | Card rendered by canvas in the browser and downloaded or shared directly. No R2 upload. |
| F. Gold/silver price | A GitHub Action at about 11:30 NPT (after the FENEGOSIDA publish) fetches the price, appends `public/data/gold/YYYY.json`, and deploys. 0 Cloudflare ops. If the fetch fails, keep the last value labelled with its date and noindex the page until it is fresh. |

**Open-Meteo:** the free API is non-commercial only. Browser-side calls spread the 10K/day quota across visitors' IPs, but the terms still apply to the site. Buy an API plan before running ads or subscriptions.

## 7. When to move to Workers Paid ($5/month)

Move once the sustained load passes about 70K Worker requests per day after the section 4 fixes (check this in Workers analytics), or if a dynamic per-request feature is needed.

- Paid includes 10M requests/month and 30 s CPU.
- Setting `GROWTH_DYNAMIC="1"` re-enables on-demand growth pages. Static stays cheaper and faster, so keep it either way.
