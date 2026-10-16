# Mission Mangal generation runbook

## Current implementation boundary
The content workflow discovers candidates from curated seeds plus Wikipedia search, retrieves passages/abstracts from Wikimedia, Crossref and OpenAlex, and searches Wikimedia Commons for image candidates. SEO scores are transparent heuristics, not search-volume or ranking predictions. Search-result counts do not imply article readiness. Research adapters must retrieve actual pages, capture publication metadata and excerpts, map every claim to sources, and verify per-asset reuse rights before the editorial pipeline can advance.

## Start
1. Open Actions → Generate content (isolated staging) → Run workflow on `missionmangal-bulk-generation-ready` for the full candidate/research workflow, or use the SEO opportunity planner for discovery only.
2. The content workflow tests the isolated Python engine, discovers candidate topics, fetches public source leads, prepares editorial perspectives, and uploads `aafnaipatro-content-staging-<run id>`. The target is 2,500 candidate topics; the final count depends on distinct search results and duplicate filtering, and the workflow reports shortages instead of manufacturing candidates.
3. Download the artifact and review duplicate flags, category distribution, canonical routes and titles.
4. The model adapter allowlist is intentionally disabled by default. Review `missionmangal/config/adapter-allowlist.example.json`, copy the desired supported adapters into `missionmangal/config/adapter-allowlist.json`, and only then set `enabled: true`, each adapter `enabled: true`, and the two terms-review flags to true after checking the current provider terms and commercial-use rules. Set matching GitHub Actions secrets (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `SILICONFLOW_API_KEY`, or `OPENAI_API_KEY`) in repository Settings → Secrets and variables → Actions. The workflow never echoes secret values. I cannot inspect secret values or prove they exist from the repository connector.
5. Run in batches with the append-only ledger. Resume from the latest ledger status rather than resetting the file. Retry transient 408/409/425/429/5xx and network errors with bounded backoff; do not retry permanent auth/invalid-request errors indefinitely.
6. Every candidate must pass source, claims, rights, similarity, fact and editorial review gates before it can be marked approved. The current automated audit deliberately reports zero approved articles; human review and any missing evidence/media requirements remain blocking.
7. Stage at least 2,001 unique, approved records before the production integration PR. Run the existing route-collision audit, preserve current Facts routes, and verify sitemap URLs equal actual rendered pages. Do not merge into main or deploy until the integration PR is reviewed.

## Provider catalogue
- `data/model-provider-catalog.json` is a discovery list of model providers, not an executable allowlist. Confirm current model IDs, terms, commercial-use rights, free-tier quotas, endpoint protocols and credentials before enabling.
- `data/research-provider-catalog.json` lists research and media APIs. Publicly reachable does not mean commercial reuse is permitted. Confirm each source's license and each media asset's rights independently.
- The existing router intentionally fails closed when a provider is not enabled, has no valid secret, lacks a positive quota, or has not passed terms checks. The model provider catalog lists more providers than the router currently implements; unsupported protocols must not be added to the active allowlist until their adapters are implemented and tested.

## Reliability contract
- Work in idempotent, checkpointed batches; save each stage before moving to the next.
- Failed candidates remain blocked with a diagnostic reason; the whole run should continue to other independent candidates.
- A failed test blocks staging. Never turn a failed check into a passing status just to finish a batch.
- Artifacts are staging outputs only. The isolated pipeline must not modify the live Vite build, Cloudflare Worker, D1 schema, or production sitemap.
- 2,001 candidates are not 2,001 articles. The acceptance target is 2,001 unique, source-backed, rights-cleared, human-reviewed and approved articles with working pages.

## Repository API catalogue note
A `public-apis/` directory was not found on `main`, `missionmangal`, or this working branch during repository inspection. The workflow currently uses the explicit JSON research/model catalogues and the public Wikimedia, Crossref, OpenAlex and Commons APIs; it does not silently clone or execute an unverified third-party API list.
