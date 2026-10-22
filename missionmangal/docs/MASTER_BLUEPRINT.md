# Mission Mangal | Master implementation blueprint v0.1

## Scope and rollout
This is the engineering baseline for a **2,000-article portfolio**, not a promise that 2,000 long-form fact-checked articles can be produced on free API plans within one day. Suggested planning buckets (subject to evidence and audience validation): science/space 250; nature/environment 250; technology/AI 250; history/cultures 250; geography/global data 200; engineering/how-things-work 200; practical everyday curiosity 200; arts/media/language 200; current discoveries/data-driven explainers 200 = 2,000. These are quotas for discovery, *not* compulsory low-quality articles.

Each cluster has a hub, a unique primary intent per child article, source map, international context, useful internal links, question derivatives and a refresh policy. Measure search demand (where accessible), social discussion, cross-region relevance, competition, evergreen life, first-hand research opportunity and coverage gaps. No mechanical 0.8 embedding cutoff can substitute for actual semantic-intent review.

## Pipeline state machine
DISCOVERED -> QUALIFIED -> SOURCED -> CLAIM_LEDGER -> BRIEFED -> DRAFTED -> MEDIA_CLEARED -> VERIFIED -> EDITED -> HUMAN_REVIEWED -> STAGED -> APPROVED -> DEPLOYED -> MEASURED -> REFRESH_DUE. Failure: BLOCKED or NEEDS_RESEARCH. Every transition records input hashes, source snapshots, agent/model/version, costs, reviewer and timestamp; retries are idempotent.

## Source/evidence contract
Each article must reference **5–20 distinct sources used to substantiate actual claims**, with source ID, canonical URL/DOI, title, publisher, author (when known), date, retrieval date, claims supported, passage or dataset snapshot, publication scope, license/attribution, freshness and reliability evaluation. Prefer original studies, data publishers and primary institutional documents when applicable; corroborate material contested claims independently. Same syndication chain is not independent corroboration. Every sourced claim must point to evidence IDs. Cite inline and provide the corresponding reference list. An unreachable source needs archival/provenance review rather than automatic blind removal. Exclude fake citation padding.

## Media package
At least one relevant approved image per article (original chart/diagram/photo where possible), with provenance, license, credit, alt text, dimensions and optimization plan. Relevant video/audio may be embedded only when appropriate and permitted by the service and publisher; provide descriptive title, privacy/performance controls, caption/transcript when practical, fallback URL and avoid autoplay. A remote image URL is not a copyright license. Preserve source attribution on charts and reproducible transformation scripts.

## Five catalogs are *discovery inputs*, not vetted APIs
- https://github.com/mnfst/awesome-free-llm-apis
- https://github.com/open-free-llm-api/awesome-freellm-apis
- https://github.com/oniondas/Awesome-Hidden-AI-Credits-Free
- https://github.com/public-apis/public-apis
- https://rapidapi.com/collection/list-of-free-apis

Pin a reviewed SHA of each GitHub repository when actually vendoring. RapidAPI collection is a web catalog, not a cloneable Git repository; inventory links manually/through permitted APIs. Do not copy unknown code to the build path or automatically call every listed service. Resolve duplications to *providers*; for each adapter verify official terms, commercial use, current free quota, signup/credit-card, geography, PII/data retention, rate limits, caching, media rights, attribution and endpoint health. Treat upstream free-tier claims as unverified until corroborated by official provider docs. An allowlist permits only approved endpoints.

## Model routing
User-reported GitHub Actions secret labels: `siliconflow_api`, `groq_api`, `openrouter`, `Gemini API Key`, `pollinations`, `healthy-crab api`. These are not confirmed values or necessarily valid shell variable names. GitHub workflow maps exact secret names to normalized ephemeral environment names (only in explicitly approved CI jobs). Prefer doing all provider inference in a dedicated Cloudflare Worker with independently configured Worker secrets for ongoing orchestration; GitHub secrets do not migrate automatically. No keys in PR jobs, untrusted forks, static HTML or `VITE_*` client values. Use least privilege and concurrency/rate-budget counters, 429 backoff with Retry-After, circuit breakers and model capability benchmarks. Zero available providers -> queue pauses; never replace verified citations with invented ones.

Suggested adapter roles (only after validation): Gemini/Groq/OpenRouter/SiliconFlow for research assistance/drafting, Pollinations for suitable licensed media or text if permitted, healthy-crab pending exact provider identification and terms; public data from World Bank, Our World in Data, NASA, Wikidata, Crossref, OpenAlex, REST Countries, Wikipedia, NOAA/Open-Meteo as topic warrants. Never construe an LLM response itself as an independent factual citation.

## Portfolio data model
Tables/records: topic, cluster, question_intent, article, source, evidence_snapshot, claim, claim_source, data_series, transform, media_asset, citation, model_run, provider_budget, quality_gate, review_decision, content_revision, publication, refresh_job. Index canonical topic/intent hash and source DOI/URL. Keep content packages versioned in Git; D1 stores bounded orchestration metadata, not an unbounded scraping archive. Public reference pages are statically emitted to avoid per-visit Worker inference/API calls. Avoid arbitrary bulk commits that trigger huge Cloudflare builds; batch with measured limits.

## Quality and publication gates
Deterministic validator first; secondary independent model-assisted claim review next; editor resolves critical or high-stakes disputes. Require 5–20 distinct used/verifiable references, complete claim map, data/unit/date correctness, image rights/alt, link health, no plagiarism or keyword stuffing, canonical/metadata/schema and original insight. Failed articles remain private draft. Review all pilot articles, then use risk-based audits; do not claim occasional random audits guarantee accuracy.

## Build, security and measurement
The existing site's `main` and `patro` Worker remain authoritative. Keep the new engine namespaced under `missionmangal/` until integration is separately accepted. PR checks only exercise deterministic local validation, tests and catalog review. Any network fetching/model runs require explicit manual workflow and approved secrets scope. Production publication requires explicit release decision. Track source coverage, factual corrections, article originality, build time, indexation, click-through, per-region audience, returning readers, original media usage, provider failures, refresh debt, and RPM/affiliate revenue only from actual analytics. Do not assume anecdotal earnings.

## Acceptance milestones
M0: isolated branch + PR + schemas + CI. M1: official provider/terms inventory + pinned catalogs + safe adapters. M2: reproducible 10-article research pilot with source/media packages. M3: 3 topic clusters, preview integration and performance tests. M4: progressive content expansion with quality gate and measured cost. M5: 2,000 *approved* distinct packages and sustainable refresh controls. Merging this initial scaffolding is **not** permission to auto-publish.
