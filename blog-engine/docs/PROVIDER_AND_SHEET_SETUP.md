# Content generation setup

## Existing Google Sheets topic list

The staging workflow imports the first worksheet as CSV from the provided spreadsheet ID using the read-only Google Sheets export endpoint. It recognizes common title/topic/question/keyword headers and optional category, intent/query, and type columns. Imported topics are merged with the curated seed list and de-duplicated before discovery. The artifact `.missionmangal-staging/sheet-import-report.json` records the outcome and any access/schema problem.

The sheet must be accessible to GitHub's runner without signing in. If it is private, publish a read-only CSV export or use a repository variable `TOPIC_SHEET_CSV_URL` pointing at an authorized read-only export URL. Do not put OAuth refresh tokens in the repository.

## Required GitHub Actions secrets

Open **Settings → Secrets and variables → Actions → New repository secret**. Add valid provider credentials under these exact names:

- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `SILICONFLOW_API_KEY`
- `HEALTHYCRAB` (the Pollinations secret name you supplied; the workflow maps it to `POLLINATIONS_API_KEY`)
- `POLLINATIONS_API_KEY` (supported fallback name)

The workflow passes these as environment variables only. It does not log or commit values. Do not paste API keys into source files, workflow YAML, issues, or pull-request comments. A provider name or nickname is not necessarily a valid API credential; verify it in the provider dashboard before use.

The GitHub connector used for this change does not expose repository-secret write access, so credentials cannot be securely installed by this workflow authoring integration. The workflow now checks `HEALTHYCRAB` first for Pollinations and falls back to `POLLINATIONS_API_KEY`; set whichever secret name already holds your actual Pollinations API token. A secret's name may be `healthycrab`, but its value still needs to be a valid Pollinations API key issued by enter.pollinations.ai. Empty/missing/invalid keys do not enable a provider.

## Provider discovery sources reviewed

These are discovery catalogues, not authoritative permission grants or proof of a free/commercial tier:

- https://github.com/mnfst/awesome-free-llm-apis
- https://github.com/open-free-llm-api/awesome-freellm-apis
- https://github.com/oniondas/Awesome-Hidden-AI-Credits-Free
- https://github.com/public-apis/public-apis
- https://github.com/pollinations/pollinations/blob/main/APIDOCS.md

The public Pollinations API documentation describes OpenAI-compatible text requests at `https://gen.pollinations.ai/v1/chat/completions`, image generation at its `/image/{prompt}` endpoint, bearer authentication for secret keys, and model discovery through `/v1/models`. The working-branch allowlist now enables `openai/gpt-oss-20b` for draft/edit/review; OpenAI identifies gpt-oss under Apache 2.0, subject to its usage policy. Pollinations API calls may consume account Pollen, so successful use depends on the secret being a valid token, account balance, and current model access. The image stage also calls Pollinations and may consume credits. No secret value is committed.

## Run and review

The generation workflow is designed for resumable staging, not automatic publishing. Run it from **Actions → Generate content (isolated staging) → Run workflow** on the working branch, set the target count, and enable drafting only after provider secrets and terms are verified. Inspect the artifact's run summary, source packets, licensed media, blocked topics, and verification report. A request for 2,500 candidates does not guarantee 2,000 complete, well-sourced, approved articles: the pipeline must not fabricate evidence or auto-approve drafts.

GitHub generally only offers `workflow_dispatch` for workflows present on the default branch. This workflow is currently in a feature branch/PR, and no changes have been merged to `main`. Do not merge it solely to make the workflow button appear; review the PR and decide when ready.
