# Mission Mangal generation runbook

## Current implementation boundary
The SEO planner produces candidate opportunities, canonical URL proposals and transparent heuristic scores. It does not claim search volume, ranking likelihood, publication readiness or create fake article bodies. Research adapters must retrieve actual pages, capture publication metadata and excerpts, map every claim to sources, and verify per-asset reuse rights before the editorial pipeline can advance.

## Start
1. Open Actions → Mission Mangal SEO opportunity planner → Run workflow on `missionmangal-bulk-generation-ready`.
2. The workflow tests the isolated Python engine and uploads `missionmangal-seo-opportunities-<run id>`.
3. Download the artifact and review duplicate flags, category distribution, canonical routes and titles.
4. For article generation, configure only reviewed model adapters in the isolated runner. Existing GitHub secret names do not prove the secrets exist or that the credentials are valid. Use repository Actions secrets with exact normalized env mappings; never print them.
5. Run in batches with the append-only ledger. Resume from the latest ledger status rather than resetting the file. Retry transient 408/409/425/429/5xx and network errors with bounded backoff; do not retry permanent auth/invalid-request errors indefinitely.
6. Every candidate must pass source, claims, rights, similarity, fact and editorial review gates before it can be marked approved.
7. Stage at least 2,001 unique, approved records before the production integration PR. Run the existing route-collision audit, preserve current Facts routes, and verify sitemap URLs equal actual rendered pages. Do not merge into main or deploy until the integration PR is reviewed.

## Provider catalogue
- `data/model-provider-catalog.json` is a discovery list of model providers, not an executable allowlist. Confirm current model IDs, terms, commercial-use rights, free-tier quotas, endpoint protocols and credentials before enabling.
- `data/research-provider-catalog.json` lists research and media APIs. Publicly reachable does not mean commercial reuse is permitted. Confirm each source's license and each media asset's rights independently.
- The existing router intentionally fails closed when a provider is not enabled, has no valid secret, lacks a positive quota, or has not passed terms checks.

## Reliability contract
- Work in idempotent, checkpointed batches; save each stage before moving to the next.
- Failed candidates remain blocked with a diagnostic reason; the whole run should continue to other independent candidates.
- A failed test blocks staging. Never turn a failed check into a passing status just to finish a batch.
- Artifacts are staging outputs only. The isolated pipeline must not modify the live Vite build, Cloudflare Worker, D1 schema, or production sitemap.
- 2,001 candidates are not 2,001 articles. The acceptance target is 2,001 unique, source-backed, rights-cleared, human-reviewed and approved articles with working pages.
