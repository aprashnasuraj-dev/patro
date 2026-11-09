# Mission Mangal production readiness audit — 2026-10-16

**Decision: NO-GO for bulk generation, production deployment, or merging PR #146.** The last observed checks at commit `7c2e39762685eef7deea03e8a8a9638de553c24b` passed; this demonstrates only tested scaffold behavior. Branch was 85 commits ahead and 0 behind main when inspected. Audit is documentation-only and does not activate deployment.

## Verified foundations
- All three pinned Git submodules are present; PR validation recursively checks out and imports catalog candidates without activating them.
- Four canonical URL families and a single private staged sitemap support 2,000 synthetic approved packages.
- Existing Facts, calendar, root build, worker entry and existing SEO files were not modified by PR diff. This does not guarantee future routes are collision-free.
- Tests cover structural 5–20 source gating, editorial byline, schema basics, URL uniqueness, local ledger retries and mocked provider fallback.

## Blocker 1 — provider activation and centralized quota ownership
`missionmangal/config/adapter-allowlist.json` sets `enabled:false` with `adapters:[]`. GitHub secret names are user-reported, not readable via this connection. `blog-engine/engine/model_router.py` usage is a per-process dictionary; each matrix runner may oversubscribe shared free accounts. Existing HTTP 429 fallback is not a distributed quota lease. Create dedicated transactional quota tables (provider, window, available tokens/requests, reserved/committed counts and idempotency key), atomic conditional reservations, conservative accounting of ambiguous network timeouts, provider-specific Retry-After/circuit breakers, lease expiration/reconciliation, a single secure authenticated quota broker (D1 coordinator/Durable Object or another genuinely serialized transaction path), and cross-run concurrency tests. Obtain official documented current commercial limits and account permission prior to enabling adapters. Never use many accounts to evade terms.

## Blocker 2 — real evidence verification wiring
`verify_content.py` has preliminary passage presence, numerical literal and keyword overlap checks, but `pipeline.advance` calls neither `require_passage_audit` nor semantic source verification before it marks an item `verified`. It labels advisory different-provider review as verified. `publisher.eligible` calls only `structural_verify`. Implement source snapshot retrieval with hash/DOI/version, passage offsets and license, claim-specific entailment/contradiction with independent corroboration, provenance and freshness tracking, numeric/unit/date normalization, APA field validation, citation-to-claim-to-reference reciprocity, plagiarism review, media/embed rights checking, and rejection on unresolved critical claims. A language model agreement or keyword overlap is not proof. Add adversarial fixtures (fabricated statistic, swapped citation, syndicated duplicates, retracted paper, year/unit mismatch, unsupported quote).

## Blocker 3 — static asset integration and production release
`missionmangal/scripts/build.mjs` emits `.missionmangal-staging` only; the existing root Vite build and Cloudflare Worker do not ingest it. Nested `blog-engine/.github/workflows/*.yml` files are non-operative templates; deploy job is explicitly disabled. Review actual production `wrangler.jsonc` entry `worker/optimized-entry.ts`, not merely older README mentions of `connected-entry.ts`. Implement artifact copy **after** root Vite build, collision/overwrite hard stops for all four families especially existing `/facts/`, host Worker static response and canonical GET/HEAD smoke tests, sitemap accessibility/discovery, robots additive line, rollback and domain preview verification. No external sitemap ping before URLs return HTTP 200. Explicit owner approval is required before enabling this integration or merging to main.

## Cross-component inconsistencies and missing workflows
- The article JSON schema only allows `draft,blocked,review,approved`, whereas the ledger states include `discovered,researching,sourced,editing,verifying,verified,rendered,published,retired`. Schema parsing is currently tested but not real record conformance. Unify one canonical state contract.
- The renderer tests use synthetic, self-labelled `verified:true` source objects and fictitious example.org media. They do not prove externally validated references or commercially licensed images. Do not publish those packages.
- Current staging renderer escapes article Markdown as prose and displays evidence in a separate notes section; it does not enforce full inline source citations for every claim within article paragraphs, HTML heading structure, linked in-body media transcripts, or strict APA 7 completeness.
- The related-link helper renders `article.related_links` but the publisher has no confirmed ledger-to-render wiring or existing-route availability test.
- `semantic_gate.py` implements cosine over supplied vectors but no end-to-end real embeddings store/search integrated at intake.
- The JSONL ledger's exclusive-create lock only covers one shared filesystem and is not safe for GitHub Actions matrix/distributed execution. D1 job leases and atomic idempotency are needed.
- No live API health test with real credential scope, original chart/media acquisition, 10-article production-quality pilot, 2,000-article full portfolio, or fully tested SEO/Cloudflare deployment was evidenced.

## Go/no-go acceptance before bulk article execution
1. Synchronize schema, ledger, renderer and status/publish_approved contracts; assert their compatibility in CI.
2. Vet/enable several actual API providers using official terms, verify secrets via trusted job without printing them, test normal/failing/quota scenarios and shared quota broker under concurrent runners.
3. Run 10 real evidence-backed articles of four types through full research, editing, semantic passage checks, rights checks, APA citations and editorial sign-off; evaluate originality and cost.
4. Expand to batches with durable IDs, distributed leases, per-article checkpoints, generated artifacts, source/media review and no automatic release.
5. Explicitly approve a separate live-domain integration after full non-regression of Facts, calendar, other routes and D1. Perform production smoke/rollback rehearsal; only then publish and expose sitemap.
