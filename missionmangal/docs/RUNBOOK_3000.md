# Mission Mangal 3,000+ runbook (branch: missionmangal-3000-root-urls)

Flow: discover -> human picks topics -> seed (reserved) -> sharded CI research+draft -> merge to `missionmangal-content` (status `review`) -> human `approve.mjs` -> preview build + smoke -> merge to main by owner.

**Update 2026-10-18:** titles come from `data/ideas-2000.json` (your 2000-article sheet) via `import-ideas.mjs`; APIs/LLM adapters are owner-attested; per-article human review is replaced by automated gates (grounding, rights-allowlisted image with credit, uniqueness, length). Health/money topics are held unless `allow_ymyl`. Pages disclose AI assistance. Merging to main is still one manual click after the preview smoke passes.

1. (superseded) Enable APIs: set `approved:true` in `config/research-apis.json` per provider after reading terms.
2. Enable LLMs: copy entries from `config/adapter-allowlist.example.json` into `adapter-allowlist.json` with real model IDs and `official_terms_verified/commercial_use_verified:true`, `enabled:true`, top-level `enabled:true`. Create GitHub secrets (underscores only, no spaces) in the `mission-mangal-generation` environment.
3. `node missionmangal/scripts/discover-topics.mjs` -> review `queue/candidates.txt` -> `node missionmangal/scripts/seed-topics.mjs <file> --type topic`.
4. Actions -> "Mission Mangal generate" (20 shards x <=360 min). Topics left unfinished stay `reserved`; just re-run.
5. Review drafts on `missionmangal-content`; add a rights-cleared image to each article's `media`; run `approve.mjs <id> --reviewer "Name" --sources-checked --media-checked`.
6. Actions -> "Mission Mangal preview build + smoke" with the exact approved count. Merge only after it passes and root /facts, calendar and sitemap routes are checked.

Throughput is bounded by approved free-tier quotas and human review, not by CI minutes. Blocked reasons (NEEDS_RESEARCH, NO_PROVIDER, GROUNDING_FAILED) are summarised in `reports/last-merge.json`.
