# Mission Mangal readiness update — 2026-10-16

## Delivered on draft branch
- Five actual Git repositories are SHA-pinned submodules: 3 LLM catalogs plus public-apis/public-apis and public-api-lists/public-api-lists. GitHub Actions recursively clones all five; offline catalog importer reads their README/data metadata. Ray Winkelman is an external commentary article (not a Git repo); RapidAPI is a web collection (not a Git repository).
- An actual CI log from the five-catalog import reported **2,159 deduplicated candidate domains**. These are NOT 2,159 active, working, independent or free inference APIs; many are unrelated data sources. The inventory is discovery only.
- Python ledger pipeline now calls require_passage_audit before marking verified; Python publisher also requires passage audit, signoff and checks for excessive copying. Keyword/numeric overlap is a fail-closed warning, not semantic entailment; human corroboration still needed.
- Schema now covers ledger's full status vocabulary, all four content types and editorial byline.
- Added a SQLite BEGIN IMMEDIATE shared-file atomic quota primitive and concurrency test; added a standalone optional Cloudflare Durable Object coordinator and authenticated quota HTTP client; router can use shared quota client via quota= argument. Coordinator **is not deployed** and production GitHub workflows **are not enabled**.
- Added opt-in, collision-checking artifact integration script; it copies approved staging pages only after the existing Vite build and refuses overwriting existing assets. It is NOT wired into root build or deployed Worker, and does not modify existing Facts features.
- The provider registry remains disabled with zero approved adapters because a directory listing is not an endpoint verification. Check actual GitHub secret names through a trusted manual workflow, official model IDs, commercial terms, current limits and consent/privacy before approving adapters. Do not store credentials in Git or run catalog code.

## Remaining strict no-go conditions
1. Deploy and authenticate the centralized quota coordinator separately, verify all GitHub runners share it, test simultaneous reservation, request replay, outages and provider-specific window behavior. The local SQLite concurrency test alone does not guarantee distributed readiness.
2. Establish cryptographic evidence snapshot provenance and independently check source semantics, retract/corrections, number units, APA completeness, citations inside all published paragraphs and media rights. Review 10 genuine representative articles.
3. Approve actual models and data APIs one-by-one; distinguish research-data APIs from LLM inference APIs. Official terms and current free tier must be recorded. No automatic account rotation/quota bypass.
4. Run root build and preview smoke tests for all four route families, protected legacy /facts and existing calendar, sitemap and robots availability, rollback. Then explicitly authorize merging/publishing.
**Conclusion:** Better functional scaffold; still NO-GO for 2,000-page publishing or main merge until these prerequisites pass.
