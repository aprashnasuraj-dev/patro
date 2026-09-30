# Deployment / Cutover Checklist

This file is the top-level operator checklist for the `cloudflare-migration` branch. It does **not** authorize deployment by itself. The detailed runbook is `docs/CLOUDFLARE_GIT_DEPLOY.md`.

## 1. Pre-deploy repository gate

Use Node 22 and run:

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run test:cloudflare-contract
npm run typecheck
npm run test:core
npm run test:typing
npm run test:patro-tools
npm run cloudflare:validate
```

Do not continue if any command fails.

## 2. Cloudflare resources

Provision or confirm:

- Worker: `mero-patro`
- Pages project: `mero-patro-pages`
- D1 database bound as `DB`
- KV namespace bound as `CACHE`
- Pages service binding `PATRO_API -> mero-patro`

Build-time resource IDs:

```text
CF_D1_DATABASE_ID
CF_KV_NAMESPACE_ID
CF_D1_DATABASE_NAME            # optional; default mero-patro
CF_D1_PREVIEW_DATABASE_ID      # optional
CF_KV_PREVIEW_NAMESPACE_ID     # optional
CF_DEPLOY_MODE                 # optional
```

Runtime provider keys belong in Cloudflare secrets, never browser/Vite variables.

## 3. First native Worker bootstrap

Run once after D1/KV exist:

```bash
npm run deploy:cloudflare:bootstrap
```

Required order:

1. build and repository validation;
2. generate deterministic D1 import;
3. validate snapshot and SQL statement limits;
4. generate bound Wrangler config;
5. apply schema migrations;
6. import public/reference content;
7. verify exact remote D1 counts and boundary data;
8. deploy Worker.

This import intentionally excludes private/user state.

## 4. Pages Git project

Configure Cloudflare Pages:

```text
Repository:         aprashnasuraj-dev/patro
Production branch:  cloudflare-migration
Build command:      npm run build
Output directory:   dist
Root directory:     repository root
```

Bind:

```text
PATRO_API -> mero-patro
```

Deploy the API Worker before Pages so the service binding has a live target.

## 5. Routine Worker release

After the one-time bootstrap:

```bash
npm run deploy:cloudflare
```

Routine deployment builds, applies schema migrations, and deploys the Worker. It does **not** replay the full deterministic reference archive.

Pages can be deployed by Git integration or explicitly with:

```bash
npm run deploy:pages
```

## 6. Preview verification before DNS

With a Cloudflare preview origin:

```bash
TARGET_ORIGIN=https://<cloudflare-preview-host> npm run cloudflare:smoke
```

Also verify manually:

- home/calendar/search/planner;
- earliest/current/latest calendar dates;
- Nepal Sambat and Panchang;
- astronomy/APOD/cosmic;
- FM and TV playback + error handling;
- Samachar/history/time machine;
- Jyotish/Rashifal;
- representative tools;
- community calendars;
- PWA install/update/offline behavior;
- direct navigation/refresh;
- no unexpected 5xx;
- compatibility fallback rate is understood.

## 7. Domain cutover

Cut over only after the preview gates pass.

Recommended sequence:

1. keep Vercel/Supabase intact;
2. attach the production domain to Pages;
3. observe Pages/Worker logs;
4. monitor compatibility fallback traffic;
5. migrate remaining route families one at a time;
6. retire old infrastructure only after the observation/rollback window closes and legitimate traffic is zero.

## 8. Rollback

Frontend rollback: move the production domain back to the last known-good Vercel deployment.

API/data rollback: keep the protected Supabase origins and source tables untouched during the migration observation window.

D1 is populated from deterministic checked-in snapshots; it does not become the sole rollback authority until parity is signed off.

## 9. Never commit

- Cloudflare API tokens;
- Supabase service-role keys;
- database passwords;
- provider secrets;
- generated `wrangler.generated.jsonc`;
- private/user database exports.
