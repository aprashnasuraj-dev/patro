# Explore pages

Data-driven page families served by `worker/explore` from R2, behind the Cloudflare edge cache.
They live only under their own URL prefixes and their own sitemap index, so no existing page,
route or sitemap is touched (`tests/explore-engine.test.ts` enforces this on every release).

## How a request is served

1. Edge cache (1 day fresh, 7 days stale-while-revalidate) — most views end here.
2. Cache miss → one R2 read of `explore/v1/pages<path>.json` → HTML → cached.
3. Sitemaps are prebuilt files streamed from `explore/v1/sitemaps/`.

No database is involved, so traffic scales with the cache, not with queries.

## Adding a family

1. Add an entry to `worker/explore/families.json` (unique `id`, a new `prefix` nobody uses yet).
2. Add `scripts/explore/families/<id>.mjs` exporting `id` and `async function* records()`.
   Each record:

   | field | required | notes |
   |---|---|---|
   | `path` | yes | lower-case slug path under the prefix, ≤ 300 chars |
   | `parent` | yes | the URL parent (`null` only for the prefix root) |
   | `title`, `description`, `lastmod` | yes | `lastmod` = date the facts last changed (YYYY-MM-DD) |
   | `sort` | no | ordering among siblings |
   | `title_ne`, `summary`, `summary_ne` | no | Nepali and English text |
   | `facts` | for indexing | `[{label,label_ne,value,value_ne,href}]`, at least `min_facts` |
   | `sections`, `links`, `geo`, `website`, `child_heading(_ne)` | no | extra content |
   | `source_name`, `source_url` | strongly advised | shown on the page |
   | `quality: {allow_index:false, reason}` | no | serve the page but keep it out of search |

3. `npm run explore:build` and check `.cloudflare/explore/report.json`.
4. `npm run test:explore`, then run the **Explore pages to R2** workflow.

Only pages that pass the quality gate (enough facts, a real description, not a duplicate) are
listed in sitemaps and marked `index`; the rest are served with `noindex, follow`.

## Deploying

Run **Actions → Explore pages to R2** (manual). It builds, refuses a >20% page-count drop unless
`allow_shrink` is ticked, and uploads under `explore/v1/` in the ARCHIVE bucket only.
Up to 5,000 objects upload with the existing Cloudflare token; beyond that add
`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (R2 S3 API token) and it switches to an
incremental `rclone sync`.

Then submit `https://aafnaipatro.com/sitemap-explore.xml` in Google Search Console and Bing.

## Scale and cost notes

- The builder streams in two passes; a 2M-page synthetic family is in `tests/fixtures/explore`
  (`node scripts/explore/build.mjs --config tests/fixtures/explore/families.json --families-dir tests/fixtures/explore --out /tmp/x`).
- At ~1M views/day the site needs Workers Paid (Free stops at 100,000 requests/day).
