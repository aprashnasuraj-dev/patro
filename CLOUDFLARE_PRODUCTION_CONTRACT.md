# Aafnai Patro — Cloudflare Production Contract

Production: **https://aafnaipatro.com**  
Branch: **main**  
Runtime: **Cloudflare Worker + static Vite/React assets**  
Database: **Cloudflare D1 binding `DB`**  
Cache: optional **Cloudflare KV binding `CACHE`**

## Required product contract

- Calendar-first home page.
- Astronomy remains `/tools/astro`, not the home page.
- Exactly 29 canonical public tools.
- Exactly six community calendars plus `/samudaya/chakra` aggregate hub.
- `/time-machine` and `/on-this-day` remain separate first-class features.
- FM, TV and Samachar stay available; no feature may be silently removed.
- Personal functions consolidate under `/me`.
- Legacy URLs redirect to canonical routes rather than disappearing.
- All public routes use the shared Aafnai Patro shell and brand.
- SEO generation, sitemap, robots, structured metadata and prerendering are release requirements.

## Cloudflare build/deploy

The current repository's package contract uses:

```bash
npm ci
npm run release:verify
npm run deploy:cloudflare
```

Cloudflare Pages/Vercel assumptions must not be introduced into production logic.

## Data safety

The public repository must not contain service-role secrets or raw proprietary master calendar archives.
Historical records must retain sources; missing facts must not be invented.
