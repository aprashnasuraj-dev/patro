# Branch-only preparation and non-deploy guard

## Current working branch

- Name: `feature/panchang-jyotish-fast-gate`
- Base: `main` at `eff3b05031cf2134731f1b57a83953bcd59d0645`
- First checklist commit: `91b7483daec1050be20d73ba62fe7ee17bbc3acb`
- PR created: no.
- PR CI / fast gate run manually: no.
- Cloudflare write/deploy command invoked: no.

## Workflow policy

The current repository has a main-branch Release Gate, PR CI, and several specifically-scoped fast gates. This branch is deliberately named separately from existing feature branches that have push-triggered scope checks or import jobs. It must not be based on a branch whose automatic workflow overwrites files or commits generated kits.

- Do not call `workflow_dispatch`, rerun a workflow, create a PR, merge, or invoke the deployment command while preparing.
- A focused feature gate can be added on this branch only if it runs on `pull_request` to `main` (with appropriate paths) and/or `workflow_dispatch`. Do not add a `push` trigger that runs checks automatically while each preparation commit is being authored.
- A future focused gate can run typecheck, catalog/schema checks, existing core tests, browser-only-network policy tests, My Time non-change guards, bilingual tests, route-preservation, SEO sitemap contract, and static output/size report. It must never deploy.
- Existing PR CI may run once a PR is explicitly authorized, but it is a validation step, not deployment. This task does not authorize a PR.
- Existing Release Gate remains unchanged and can only deploy/publish under the current main-branch release policy after merge. Do not change its trigger or environment.
- Do not touch `wrangler.jsonc`, Worker entrypoints, `.github/workflows/release-gate.yml`, D1 migrations, scripts that write to R2/KV, or Cloudflare route settings for this feature.
- Before creating a PR later, inspect exact workflow triggers and matching path filters against the final changed files, not merely workflow names.

## No-Cloudflare-write evidence

The source repo has `production_branch: main` and `preview_urls: false` in its Wrangler config. That is supporting repo-side evidence but is not a substitute for checking any external dashboard integration. All changes in this feature branch are sent only to GitHub's feature branch; no tool/API action is made against Cloudflare.

Final branch audit must show:
- [ ] the only permitted `worker/**` source modifications are static SPA route allowlisting in `worker/connected-entry.ts` and non-executable SEO copy in `worker/connected-seo.ts`; no new request handler, API, storage access, router ownership change, or deployment behavior is introduced;
- [ ] no changes under `cloudflare/**`, `supabase/**`, `wrangler*.jsonc`, `scripts/cloudflare/**`, `migration/**`, `db/**`, `worker/optimized-entry.ts`, `worker/my-time/**` or any deployment workflow;
- [ ] no new SQL or schema files;
- [ ] no deploy/migrate/import/upload/cache-purge command in a changed script;
- [ ] no D1/R2/KV/Worker writes or calls added by the new tools;
- [ ] no PR, no CI run, no merge and no production deployment occurred in this prep stage.

## Stop condition

If a required feature appears to need new server-side functionality or new persistent data, pause and design a browser/static alternative. Do not silently make a Cloudflare runtime change.
