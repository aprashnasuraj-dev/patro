# PR #117 — Cloudflare preview failure triage (release held)

Status at 2026-10-08: GitHub PR CI, Janma Patro Fast Gate and Rashifal Fast Gate passed for `2eaf192e3dceb8da970ea2375323539316403abb`. Cloudflare's external preview build failed for that commit; its GitHub comment provides no error output or annotations. **Do not merge or deploy** based on GitHub green checks alone.

## Evidence (distinguish fact from hypothesis)

- PR: https://github.com/aprashnasuraj-dev/patro/pull/117
- Latest Cloudflare log: https://dash.cloudflare.com/8cbd02dbb38348565fe56e14fccf1710/workers/services/view/patro/production/builds/18474641-b838-4aaa-a4a1-3f50a4ce13da
- Earlier failures: `6ec5b541-a8e6-4c15-b5ed-7ee266df034a`, `c87cd120-71b8-40cc-9f43-b67b8f689e2c`.
- The earlier preview attempt reported: `Preview creation failed: This Worker does not exist on your account.` It is **not verified** as the current failure's error.
- `wrangler.jsonc` declares `name: patro`, `preview_urls: false`, production custom domain, and `assets.directory: ./dist`.
- `package.json` declares `npm run build`; generated Wrangler configuration is used by the `deploy:cloudflare` script. `DEPLOY.md` also describes a direct Wrangler deploy with the source config. Check the actual Cloudflare dashboard build/deploy command before changing code; documentation and scripts currently differ.
- The PR reports 22,902 protected URLs retained with zero deletions and 3,715 static files. Re-run these guards on any subsequent runtime code change.

## Dashboard triage, in order (read-only first)

1. Open the newest Cloudflare build log, identify the **first failing command** and exact error; record build vs deploy vs preview-creation phase, exit code, and correlation/request ID if available. Redact credentials.
2. Inspect the Worker Builds project: account, repository, production branch, root directory, build command, deploy command, intended Worker/script name, and preview configuration. Confirm whether preview builds target an existing Worker or attempt a first-time preview.
3. Compare the known successful `main` Cloudflare build's configuration/log with this PR's failed build. Check whether the failure happens before npm build, after npm build, during Wrangler deploy, or only during preview URL creation.
4. If error remains `This Worker does not exist on your account`, confirm Worker account/name and preview creation prerequisite in Cloudflare; do **not** rename production Worker, enable preview URLs, disable the check or deploy to production as an unverified workaround.
5. If error is build-related, reproduce with Node 22 and the configured command in a clean checkout; if it is deploy-related, inspect generated Wrangler configuration and account-bound resource references without printing secrets.
6. After a confirmed remediation, rerun affected checks and obtain an actual successful Cloudflare preview. Keep production on hold until owner approval.

## Safe local reproduction (NO deploy)

```sh
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run build
npm run cloudflare:validate
npm run cloudflare:config
npx wrangler deploy --dry-run --config wrangler.generated.jsonc
node scripts/verify-url-preservation.mjs dist
node scripts/verify-static-file-budget.mjs
```

**Do not** run `npm run deploy:cloudflare`, `cloudflare:migrate`, `cloudflare:import-d1:recovery`, or production workflow dispatch during this investigation.

## Decision log

- Latest current cause: **unconfirmed**; Cloudflare dashboard log is required.
- Action: preserve existing production Worker name, D1 IDs, routes, crons and `main` HEAD; do not alter the deployment configuration speculatively.
- Release gate: Cloudflare preview failure persists, so PR remains unmerged and production held.
