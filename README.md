# Aafnai Patro · आफ्नै पात्रो

Aafnai Patro is a Nepali calendar, astronomy, history, Community calendar, media, Jyotish and utility platform.

## Production architecture

Production has one supported Cloudflare topology:

```text
GitHub repository:   aprashnasuraj-dev/patro
Production branch:   main
Worker:              patro
Entrypoint:          worker/connected-entry.ts
Static Assets:       ASSETS -> ./dist
D1 binding:          DB -> patro
Custom domain:       aafnaipatro.com
Preview URLs:        disabled
```

Cloudflare Pages is not part of production. The old split Pages/API service-binding topology is retired.

Native Cloudflare routes run first. `SUPABASE_COMPAT_ORIGIN` is a non-secret transition origin used only by `worker/connected-entry.ts` for the explicitly allow-listed TV, FM and Samachar compatibility routes. Calendar, conversion, Community calendars, Time Machine, On This Day, tools and Rashifal do not require Supabase credentials to serve production public/reference content.

## Release invariants

- AD/BS/Nepal Sambat/Panchang canonical calendar: **77,070** rows, AD `1826-04-11` through `2037-04-13`.
- Time Machine: exactly **706** canonical D1 records.
- On This Day: **5,454** records.
- Tool catalog: **29** canonical tools.
- Nepal Sambat day map: **14,972** rows.
- Community suites: Nepal Sambat, Lhosar, Tharu, Mithila, Kirat, Hijri and Samudaya Chakra.
- Rashifal: checked-in native/bundle runtime; no mandatory D1 publication seed and no mandatory Supabase table.
- NEPSE/market snapshots: not required for launch, D1 bootstrap, doctor checks or release verdict.
- KV: optional; first production deployment must work without a KV namespace.

## Local release verification

Node.js 22 is the CI baseline.

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run release:verify
npm run cloudflare:validate
```

## Fresh D1 bootstrap

```bash
npm run deploy:cloudflare:bootstrap
```

The deployment applies additive schema migrations, inspects remote `content_records`, imports the deterministic public/reference snapshot only when the row count is exactly zero, verifies exact remote parity, then deploys Worker `patro` with Static Assets. Existing populated D1 databases never enter the bulk seed path.

## Routine production deploy

```bash
npm run deploy:cloudflare
```

The same seed-only-when-empty guard protects routine releases. KV remains optional.

## Cloudflare Git import

```text
Repository:        aprashnasuraj-dev/patro
Production branch: main
Worker name:       patro
Build command:     npm run cloudflare:production-check
Deploy command:    npm run deploy:cloudflare
Root directory:    repository root
```

Do not create a separate Pages project.

## Production feature surfaces

The build retains the full application: main AD/BS/Nepal Sambat calendar, Panchang/astronomy, all 29 canonical tools, seven Community experiences, Time Machine, On This Day, Rashifal/Jyotish, FM, TV, Samachar, personal tools, SEO/GEO/AI-agent surfaces, PWA/offline support, and mobile/desktop UI.

TV/FM/Samachar may use the selective compatibility bridge only when their native route does not answer. No generic Supabase API proxy is allowed.

## Key deployment files

- `wrangler.jsonc` — canonical production Worker configuration.
- `wrangler.toml` — Git-import discovery mirror.
- `worker/connected-entry.ts` — production Worker entry and selective compatibility boundary.
- `cloudflare/d1/expected-public-counts.json` — deterministic D1 bootstrap counts.
- `scripts/ensure-d1-content.mjs` — seed-only-when-empty D1 guard.
- `scripts/deploy-cloudflare.mjs` — production deploy order.
- `DEPLOY.md` — production checklist.
- `docs/CLOUDFLARE_GIT_DEPLOY.md` — Git import and smoke-test runbook.

## Security

Never commit Cloudflare API tokens, Supabase service-role keys, database passwords, provider secrets, generated private exports, or private/user database dumps.
