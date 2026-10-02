# Production Deployment Checklist

Aafnai Patro has one production Cloudflare topology:

- Worker: `patro`
- Worker entry: `worker/connected-entry.ts`
- Static Assets: `./dist`, binding `ASSETS`
- D1 database: `patro`, binding `DB`
- Production custom domain: `https://aafnaipatro.com`

There is no Cloudflare Pages production project or Pages service binding in the supported deployment path.

## 1. Repository release gate

Use Node 22 and run from a clean checkout:

```bash
npm ci
npm run release:verify
npx wrangler deploy --dry-run --config wrangler.jsonc
```

Do not deploy if any command fails.

## 2. Cloudflare resources

Confirm the Worker `patro` and D1 database `patro` exist. `DB` is required. `CACHE` is optional and must never become a correctness dependency.

Optional deployment overrides:

```text
CF_D1_DATABASE_ID
CF_D1_DATABASE_NAME
CF_D1_PREVIEW_DATABASE_ID
CF_KV_NAMESPACE_ID
CF_KV_PREVIEW_NAMESPACE_ID
CF_DEPLOY_MODE
```

Provider credentials belong in Cloudflare secrets. Core calendar, conversion, Community, Time Machine, On This Day and D1-backed public content require no Supabase secret.

`SUPABASE_COMPAT_ORIGIN` is a non-secret transition origin and may be used only by `worker/connected-entry.ts` for the explicitly allow-listed TV, FM and Samachar compatibility surface. No other route may depend on it.

## 3. Fresh D1 bootstrap

For a newly provisioned empty D1:

```bash
npm run deploy:cloudflare:bootstrap
```

The bootstrap order is enforced in code:

1. build the production SPA;
2. generate the deterministic D1 content snapshot;
3. prepare the bound Wrangler config;
4. apply additive schema migrations;
5. query remote `content_records`;
6. import the canonical snapshot only when the remote row count is exactly zero;
7. re-count and run exact remote parity verification;
8. deploy Worker `patro` with Static Assets.

If D1 already contains any public content rows, the snapshot import is skipped. Existing populated D1 databases are never bulk-reseeded by bootstrap or normal deployment.

## 4. Routine production release

```bash
npm run deploy:cloudflare
```

Routine release performs the same safety sequence: build, generate snapshot, apply additive migrations, inspect remote D1, seed only an actually empty database, verify remote D1, then deploy Worker `patro`.

## 5. D1 data rules

Before release, `npm run cloudflare:verify-snapshot` and the remote verifier must agree with `cloudflare/d1/expected-public-counts.json` and `cloudflare/d1/data-policy.json`.

Key invariants:

- `time_machine_moments` stays at the complete 706-record canonical archive;
- Rashifal publications are retained canonical data, not disposable cache;
- cache-class datasets may differ only when `data-policy.json` explicitly marks them regenerable/disposable;
- migrations and generated snapshots must not contain destructive `DELETE`, `DROP` or `TRUNCATE` operations against canonical public data;
- private/user data is not part of the public snapshot.

## 6. Production verification

After deployment verify at minimum:

- `/api/v1/health/d1` and public D1-backed content;
- AD/BS/NS conversion and round-trip behavior;
- Community Suite selected-date synchronization;
- Time Machine and On This Day;
- Rashifal;
- TV, FM and Samachar, including selective compatibility behavior;
- mobile navigation and responsive layouts;
- direct navigation/refresh and real 404 behavior;
- no unexpected 5xx responses.

## 7. Domain and rollback

Production traffic is attached directly to Worker `patro` through the custom domain `aafnaipatro.com` defined in `wrangler.jsonc`.

Rollback is a Worker deployment rollback to the last known-good release. A rollback must not reseed or reset D1. The selective TV/FM/Samachar compatibility backend may remain available during its observation window, but it is not a general API rollback path.

## 8. Never commit

- Cloudflare API tokens;
- Supabase anon/service-role/database credentials;
- database passwords;
- provider secrets;
- generated `wrangler.generated.jsonc`;
- private/user database exports.
