# Cloudflare Production Deployment Runbook

Current production branch: `main`.

## Current target topology

```text
https://aafnaipatro.com
        |
        v
Cloudflare Worker: patro
        |
        +-- Workers Static Assets: ./dist
        +-- D1 binding DB -> database patro
        +-- native Patro/calendar/FM routes
        +-- selective Supabase compatibility fallback for preserved routes
```

Canonical Worker config: `wrangler.jsonc`.

Important production invariants:

- Worker name: `patro`
- entrypoint: `worker/connected-entry.ts`
- production branch: `main`
- canonical domain: `aafnaipatro.com`
- `preview_urls: false` in the production JSON config
- custom-domain route for `aafnaipatro.com`
- D1 database: `patro`
- routine deploys apply schema migrations before publishing Worker/assets
- `dist/_redirects` must not be uploaded as a Worker Static Assets routing file

`wrangler.toml` remains for compatibility with older/local tooling. Production deployment commands explicitly use `wrangler.jsonc`.

## 1. Repository validation

Run:

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run cloudflare:validate
npm run cloudflare:production-check
```

The checked-in archive invariants are:

```text
parts:          78
rows:           77,070
first AD date:  1826-04-11
last AD date:   2037-04-13
final part:     70 rows
source version: patro-archive-v79
```

Normal CI verifies the archive. It does not rebuild or reimport the full one-time D1 snapshot.

## 2. Routine production deployment

The repository deployment command is:

```bash
npm run deploy:cloudflare
```

`scripts/deploy-cloudflare.mjs` performs the routine deployment in this order:

1. build the application;
2. remove `dist/_redirects` before Worker asset upload;
3. generate an override config only when Cloudflare resource overrides are supplied;
4. apply committed D1 schema migrations remotely;
5. deploy the Worker and static assets with Wrangler.

Routine deployment does **not** bulk-reseed the reference dataset.

## 3. Cloudflare Git integration

Normal Cloudflare Git deployment should point at:

```text
Repository: aprashnasuraj-dev/patro
Branch:     main
Worker:     patro
Build:      npm run build
Deploy:     npm run deploy:cloudflare
```

The Worker/service name must remain `patro` unless a deliberate migration is performed. Do not rename the production Worker merely to match old documentation or historical Pages experiments.

## 4. Direct recovery deployment

The repository also contains `.github/workflows/cloudflare-direct-deploy.yml` as an independent recovery path.

It is intentionally manual-only (`workflow_dispatch`) and exposes two modes:

- `verify`: authenticate with Cloudflare, build, then run a Wrangler production dry-run;
- `deploy`: authenticate, apply D1 migrations, then run the normal production deployment.

Required GitHub repository secret:

```text
CLOUDFLARE_API_TOKEN
```

The workflow already pins the production Cloudflare account ID. The token must have the minimum permissions needed for the `patro` Worker, routes, Static Assets and D1 migration/deploy operations.

Do not commit Cloudflare tokens, database passwords or provider secrets.

## 5. Git-integration failure recovery

A Cloudflare check such as:

```text
Workers Builds: patro
Preview creation failed: This Worker does not exist on your account.
```

is an account/integration failure until proven otherwise. Repository build success alone does not prove production was deployed.

Recovery order:

1. confirm `main` passes Build, Doctor, Security, Cloudflare migration and Cloudflare production-readiness gates;
2. confirm `wrangler.jsonc` still names `patro`, uses `worker/connected-entry.ts`, disables preview URLs and owns `aafnaipatro.com` as a custom domain;
3. reconnect or re-import the repository in the Cloudflare Worker Git integration if Cloudflare no longer resolves the Worker/project association;
4. trigger a fresh production build from `main`;
5. if the Git integration remains unusable, configure `CLOUDFLARE_API_TOKEN` in GitHub Secrets and use the manual direct-deploy workflow;
6. verify the resulting Cloudflare check contains a successful build and a Worker Version ID before treating the deployment as complete.

Historical evidence from 2026-10-01: a missing-Worker Git-integration error was followed by a successful `patro` deployment only after the Cloudflare Git integration was reconnected and a redeploy was triggered. The successful Worker version from that recovery was `096e9ef5-69ce-4ea2-b951-4e6d83f1b917` on commit `2c5e0e99d654eba61b0fe9927879d20175b04bce`.

## 6. Smoke tests after deployment

Do not validate only the home page. At minimum verify:

```text
GET /
GET /api/v1/health
GET /api/v1/sync?date=2026-09-30
GET /api/v1/astronomy/tithi?date=2026-09-30&lat=27.7172&lng=85.3240
GET /api/v1/tools/catalog
GET /api/v1/time-machine
GET /api/v1/on-this-day?date=2026-09-30
GET /fm
GET /tv
GET /samachar
```

Also verify direct browser refresh/navigation for the main SPA routes, manifest/service-worker delivery, FM playback, TV playback and Samachar loading.

The compatibility layer is selective. A response carrying `x-patro-backend: supabase-compat` indicates that request fell through to the preserved compatibility backend.

## 7. Production connectivity contract

The current Worker entrypoint is `worker/connected-entry.ts`.

Behavior:

1. try the native Cloudflare Worker first;
2. only on native `404` for explicitly supported compatibility routes, call the preserved Supabase compatibility router;
3. do not convert native `5xx` failures into compatibility traffic;
4. do not restore a generic `/api/v1/*` proxy.

This preserves native Cloudflare behavior while keeping TV/Samachar and other explicitly allow-listed compatibility surfaces connected during migration.

## 8. D1 bootstrap and recovery

The one-time/full bootstrap path remains:

```bash
npm run deploy:cloudflare:bootstrap
```

Use this only when rebuilding the native data plane, not for routine releases. It generates/verifies the deterministic reference snapshot, applies schema, imports public/reference data and deploys the Worker.

For ordinary releases use `npm run deploy:cloudflare` instead.

## 9. Rollback

If a newly deployed Worker is unhealthy:

1. use Cloudflare version history/rollback where available;
2. keep Supabase compatibility services intact during the observation window;
3. do not delete D1/Supabase source data as part of an application rollback;
4. restore the last verified production Worker version before attempting another migration change.

## 10. Secret policy

Never expose in Vite/browser configuration or commit to Git:

- `CLOUDFLARE_API_TOKEN`;
- Supabase service-role keys;
- database credentials;
- provider/API secrets;
- VAPID private keys;
- administrative allowlists or bearer secrets.

Build IDs, Worker version IDs and database IDs are resource identifiers; they are not authentication credentials.
