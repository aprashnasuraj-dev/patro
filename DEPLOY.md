# Production Deployment Checklist

Aafnai Patro has one production Cloudflare topology:

- Worker: `patro`
- Worker entry: `worker/connected-entry.ts`
- Static Assets: `./dist`, binding `ASSETS`
- D1 database: `patro`, binding `DB`
- Production custom domain: `https://aafnaipatro.com`
- Preview URLs: disabled

A separate Cloudflare Pages project is not part of the supported production path.

## 1. Repository release gate

Use Node 22 from a clean checkout:

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run release:verify
npm run cloudflare:validate
```

Do not deploy if any command fails.

## 2. Cloudflare resources

`DB` is required. `CACHE`/KV is optional and must never become a first-deploy or correctness dependency. Optional overrides are `CF_D1_DATABASE_ID`, `CF_D1_DATABASE_NAME`, `CF_D1_PREVIEW_DATABASE_ID`, `CF_KV_NAMESPACE_ID`, and `CF_KV_PREVIEW_NAMESPACE_ID`.

Core calendar, conversion, Community, Time Machine, On This Day, D1 public/reference content and native/bundle Rashifal require no Supabase credential. `SUPABASE_COMPAT_ORIGIN` is a non-secret transition origin and may be used only by `worker/connected-entry.ts` for TV, FM and Samachar.

## 3. Fresh D1 bootstrap

```bash
npm run deploy:cloudflare:bootstrap
```

Enforced order: production build → deterministic snapshot → additive schema migrations → remote D1 row-count inspection → seed only when `content_records` is exactly zero → exact parity verification → Worker/Static Assets deploy.

Existing populated D1 databases are never bulk-reseeded by bootstrap or normal deployment.

## 4. Routine release

```bash
npm run deploy:cloudflare
```

Routine release uses the same seed-only-when-empty protection and exact D1 verification.

## 5. Release data rules

- `time_machine_moments` is exactly **706** records.
- Rashifal is served by the checked-in native/bundle runtime and is excluded from mandatory D1 bootstrap/count verification.
- `market_snapshots`/NEPSE is not a launch, doctor, bootstrap or release-gate requirement.
- private/user data is excluded from the deterministic public snapshot.
- a populated D1 must never enter the bulk seed path.

## 6. Post-deploy smoke

Verify Calendar/AD-BS-NS, Panchang/Astronomy, Community suites, Nepal Sambat, Time Machine, On This Day, Rashifal, all 29 tools, FM/TV/Samachar, PWA/offline assets, mobile/desktop navigation and direct-route refresh. NEPSE/market data is not a release smoke requirement.

## 7. Never commit

Cloudflare API tokens, Supabase credentials, database passwords, provider secrets, generated `wrangler.generated.jsonc`, or private/user exports.
