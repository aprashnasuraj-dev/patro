# Cloudflare Git Production Runbook

## Production target

```text
Repository:          aprashnasuraj-dev/patro
Production branch:   main
Worker:              patro
Entrypoint:          worker/connected-entry.ts
Static Assets:       ASSETS -> ./dist
D1:                  DB -> patro
Custom domain:       aafnaipatro.com
Preview URLs:        false
```

Production is one Cloudflare Worker with Workers Static Assets. Do not create a separate Pages project.

## Before import

The exact PR SHA merged to `main` must pass the Release Gate. The gate checks build/TypeScript, 29 tools, Community/mobile, SEO/PWA, Worker/D1 contracts, migration snapshot, security, Wrangler dry-runs and Lighthouse.

## Git import settings

```text
Repository:        aprashnasuraj-dev/patro
Production branch: main
Worker name:       patro
Build command:     npm run cloudflare:production-check
Deploy command:    npm run deploy:cloudflare
Root directory:    repository root
```

The deploy command uses `wrangler.jsonc`. `wrangler.toml` is only the Worker-only Git-discovery mirror and must remain aligned.

## D1 behavior

`DB` is required. KV is optional.

On every deploy the repository applies additive schema migrations and inspects remote `content_records`. If the count is zero, it imports the deterministic canonical snapshot exactly once. If the count is greater than zero, bulk import is skipped. Exact remote parity verification runs before Worker deployment.

Canonical release invariants include Time Machine exactly 706 records. Rashifal is native/bundle and does not require seeded D1/Supabase publication rows. NEPSE/market snapshots are not release dependencies.

## Compatibility boundary

`worker/connected-entry.ts` allows read compatibility only for TV, FM and Samachar. Calendar, Community, Time Machine, On This Day, Rashifal, tools and other native public routes cannot fall through to a generic Supabase API proxy.

## Post-deploy smoke

Check `/`, `/tools`, `/convert`, `/rashifal`, `/time-machine`, `/on-this-day`, `/samudaya`, `/nepal-sambat/mandala`, `/fm`, `/tv`, `/samachar`, `/jyotish/china` and `/me`, then all 29 tool routes and all seven Community routes.

API smoke: `/api/v1/health`, `/api/v1/sync?date=2026-09-30`, `/api/v1/calendar/2083/6?calendar=bs`, `/api/v1/tools/catalog`, `/api/v1/time-machine?limit=5`, `/api/v1/on-this-day?date=2026-09-30`, `/api/v1/rashifal/universal?period=daily&system=vedic&calendar=bs&date=2026-09-30`, `/api/v1/news?limit=5`, `/api/v1/radio/catalog?country=NP&limit=12`.

Verify `/robots.txt`, sitemap indexes, `/llms.txt`, `/seo-manifest.json`, `/sw.js`, and `/manifest.webmanifest`.

If the Cloudflare integration reports that Worker `patro` does not exist, recreate/reconnect the account-side Worker Git project. That external association is not a repository build failure.
