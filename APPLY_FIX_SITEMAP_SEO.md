# fix/sitemap-seo — apply to `main`

Base commit: `3ab5947` (docs(release): finalize Aafnai Patro 10-step release record).
Commit: `fix(seo): submit only indexable, canonical URLs in sitemaps` (17 files).

## Option A — git patch (recommended, keeps the commit message)
```bash
git checkout main && git pull
git checkout -b fix/sitemap-seo
git am fix-sitemap-seo.patch
npm run build && npm run test:full-product && npm run test:release-safety
git push -u origin fix/sitemap-seo   # open a PR, or merge to main
```

## Option B — overlay
Copy every file in this folder (except this README, the .patch and the .bundle) into the repo root,
overwriting the existing files, then build/test and commit.

## After deploy
1. In Google Search Console → Sitemaps, resubmit `https://aafnaipatro.com/sitemap.xml`.
2. Old child sitemaps (`sitemap-calendar-1883.xml` … `-2072.xml`, `sitemap-days-*` for the same years) now
   return 404; GSC will drop them. Remove any that were submitted individually.
3. Rebuild/redeploy once shortly after BS New Year (≈14 April) so the ±10-year window rolls forward with
   the Worker's runtime cutoff.
