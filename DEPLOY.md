# Production Deployment Checklist

Aafnai Patro has one supported production Cloudflare topology:

- Worker: `patro`
- Worker entry: `worker/connected-entry.ts`
- Wrangler source of truth: `wrangler.jsonc`
- Static Assets: `./dist`, binding `ASSETS`
- D1 database: `patro`, binding `DB`
- Production custom domain: `https://aafnaipatro.com`
- Preview URLs: disabled
- KV/`CACHE`: optional

Cloudflare Pages is not part of the production or first-deploy path.

## 1. Repository release gate

Use Node 22 from a clean checkout:

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run release:verify
```

Do not deploy if verification fails.

## 2. Cloudflare Git connection

Use the following Worker Builds settings when connecting the repository:

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config wrangler.jsonc`
- Worker name: `patro`

The deploy command must remain a direct Wrangler deploy. It must not run D1 migrations, seed/import content, or require KV before the Worker can be created.

`wrangler.jsonc` already declares `worker/connected-entry.ts`, `./dist`, the required `DB` binding, `aafnaipatro.com`, and `preview_urls: false`.

## 3. Runtime/data boundaries

`DB` is required. `CACHE`/KV is optional and must never become a first-deploy or correctness dependency.

Core calendar, conversion, Community, Time Machine, On This Day, D1 public/reference content and Rashifal do not require Supabase at runtime. Rashifal is served exclusively through the checked-in native/bundle implementation.

`SUPABASE_COMPAT_ORIGIN` is a non-secret transition origin and is permitted only for TV, FM and Samachar compatibility traffic.

## 4. D1 bootstrap or recovery — operator only

The Git-linked deploy does not mutate or seed D1. If a new/empty production D1 must be prepared, run the explicit operator bootstrap separately:

```bash
npm run deploy:cloudflare:bootstrap
```

That command is recovery/bootstrap tooling, not the normal Cloudflare Builds deploy command. Existing populated D1 databases must never be bulk-reseeded.

Optional resource overrides used by operator tooling are `CF_D1_DATABASE_ID`, `CF_D1_DATABASE_NAME`, `CF_D1_PREVIEW_DATABASE_ID`, `CF_KV_NAMESPACE_ID`, and `CF_KV_PREVIEW_NAMESPACE_ID`.

## 5. Release data rules

- `time_machine_moments` is exactly **706** canonical records.
- Rashifal is excluded from mandatory D1 bootstrap/count verification; no D1 or Supabase publication table is required for it.
- `market_snapshots`/NEPSE is not a launch, doctor, bootstrap or release-gate requirement.
- Private/user data is excluded from the deterministic public snapshot.
- A populated D1 must never enter the bulk seed path.

## 6. Manual Worker deploy

After a local production build:

```bash
npm run build
npm run deploy:cloudflare
```

`npm run deploy:cloudflare` is intentionally just `wrangler deploy --config wrangler.jsonc`.

## 7. Post-deploy smoke

Verify Calendar/AD-BS-NS, Panchang/Astronomy, Community suites, Nepal Sambat, Time Machine, On This Day, Rashifal, all 29 tools, FM/TV/Samachar, PWA/offline assets, mobile/desktop navigation and direct-route refresh. NEPSE/market data is not a release smoke requirement.

## 8. Never commit

Cloudflare API tokens, Supabase credentials, database passwords, provider secrets, generated `wrangler.generated.jsonc`, or private/user exports.
