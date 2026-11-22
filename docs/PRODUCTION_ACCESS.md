# Production access

Production operations run only from this repository's `main` branch, after a
credential-free preparation job and approval of the `production` environment.
Build and test jobs do not reference deployment secrets. Artifacts are taken
from the same workflow run and commit; production jobs use isolated hosted
runners and do not persist checkout credentials.

## Owner setup required before enabling production jobs

The GitHub App used for the code changes has write access but no administration
access. Workflow YAML cannot configure reviewers, secret scope, or main branch
protection. Until the following settings are verified, leave the repository
variable `PATRO_PRODUCTION_APPROVAL_CONFIGURED` unset or `0`.

1. Create an environment named `production` under Settings → Environments.
   Require reviewer `aprashnasuraj-dev`. Do not allow administrators to bypass
   protection rules. Leave **Prevent self-review** off if the owner must approve
   deployments that they initiate. Select deployment branches/tags, add only a
   **branch** rule for `main`, and add no tag rules or wildcard rules.
2. Re-enter deployment credentials into that environment from the owner's
   credential manager or replace them with newly scoped credentials. GitHub
   cannot reveal existing secret values for copying. Use the canonical secret
   names below; ordinary CI does not need them.
3. Verify the replacement credentials' account and scopes through the relevant
   provider's read-only validation. Then remove repository-level duplicates,
   including `GIT` (secret names are case-insensitive) and
   `CLOUDFLARE_API_TOKEN`. Remove any organization-level deployment secret
   access to this repository, if applicable. Do not remove a working credential
   before its environment replacement has been verified.
4. Protect `main`: require a pull request, require branches to be up to date,
   require passing **Production access policy**, **Affected PR checks**,
   **Isolated production browser regressions**, and **MM530 remaining-phase
   source gates** checks. Enforce rules for administrators, require conversation
   resolution, and block force pushes and branch deletion. With one maintainer,
   a required independent PR review would block the owner's own PRs; use zero
   required PR approvals unless a second trusted reviewer is available. The
   separate production environment still requires the owner's approval.
5. Set default Actions token permissions to read-only. Require approval of
   workflows from all outside collaborators. Keep write tokens and secrets
   unavailable to pull requests from forks.
6. Confirm Cloudflare's independent Git build/deploy route stays disabled.
   On 2026-11-22, the `patro` Worker production build and deploy commands were
   replaced with immediate failures; previews were disabled. The Git connection
   remains present and auto-build events can still be created, but do not run
   repository code or deploy. There were no deploy hooks for that Worker.
7. Only after settings and secret scopes are verified, set
   `PATRO_PRODUCTION_APPROVAL_CONFIGURED=1`. This is a setup latch, not a
   substitute for GitHub's environment protection. Never enable
   `PATRO_ROOT_ASSET_PARITY_VERIFIED` until the separate live asset reconciliation
   is complete. The date Worker remains separately opt-in.

| Environment secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Approved Worker/KV/R2 operations, scoped to the required account/resources |
| `CLOUDFLARE_D1_API_TOKEN` | Optional separately scoped D1 migrations token; canonical token is fallback |
| `CLOUDFLARE_ACCOUNT_ID` | Existing account identifier |
| `CLOUDFLARE_D1_DATABASE_ID` | Manual database import target |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Optional dedicated R2 S3 pair |
| `CF_KV_NAMESPACE_ID`, `CF_KV_PREVIEW_NAMESPACE_ID` | Existing identifiers, when kept as secrets rather than variables |
| `CF_R2_BUCKET_NAME`, `CF_R2_PREVIEW_BUCKET_NAME` | Existing identifiers, when kept as secrets rather than variables |

The historical `GIT`/`git` deployment-token aliases are deliberately unsupported.
Production secrets belong only to `production`; adding an environment to one
workflow does not protect a duplicate secret at repository scope.

## Validation and residual limits

Run `python scripts/verify-production-boundary.py` and
`python -m unittest discover -s tests -p test_production_boundary.py` after
installing PyYAML. The Production boundary workflow runs these checks without
production credentials. These are structural checks, not proof that every shell
command is safe: review the exact commit before approving production access.

A public repository permits others to copy the source and operate their own
infrastructure. These controls restrict this project's production credentials
and deployment routes; they do not prevent independent copies. Repository
owners, other authorized provider accounts, local deployment credentials, and
external publishing repositories remain separate trust boundaries.

Historical credential findings require rotation at their issuing service.
Deleting a current file or rewriting Git history cannot invalidate a copied
credential. Audit findings containing sensitive details are kept out of this
public repository. The initial audit did not rewrite history or rotate live
credentials.
