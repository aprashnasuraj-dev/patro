# Mission Mangal — evidence-first global publishing engine

**Status: isolated development scaffold; production disabled.** This directory is additive to Aafnai Patro's existing Vite/React + Cloudflare Worker + D1 architecture. Do not replace the root deployment, Worker entrypoint, routes, calendar datasets, SEO pipeline or D1 bootstrap. No content is publicly published by this branch.

## 2,000-article mission
Build a diversified, globally relevant editorial portfolio, not only boring-question SEO. Candidate themes: science and space, nature, technology, history, geography, cultures, language, everyday explanations, open-data discoveries, curiosity, visual storytelling, environment, engineering and practical knowledge. Qualify each article individually for distinctive reader intent, source availability, originality, global accessibility and potential audience. Do not manufacture traffic estimates or guarantee virality.

**Hard article gates:** 5–20 distinct, *actually used*, relevant, verified references; source-to-claim mapping; at least one legally usable, relevant image with alt text, credit and license; audio/video when genuinely pertinent and embeddable with rights/accessibility considered; original contribution; factual and numerical checks; no near-duplicate intent; no unsupported medical/legal/financial claims. A list of source URLs is not verification. Fail closed if insufficient verified references. Sources and viewpoints are different concepts. Cite claims inline and render references. Never fabricate quotes, statistics, citations or media rights.

## Existing production contract
Root README and CLOUDFLARE_PRODUCTION_CONTRACT.md specify **one Cloudflare Worker with Vite assets and D1**, deployed from main. Mission Mangal does **not** create a Pages deployment or change the live app by default. Future integration must add namespaced routes to the existing Worker and build output only after tests and explicit review. GitHub secrets and Cloudflare Worker secrets are separate stores: do not assume automatic synchronization.

## Steps
1. Validate source directories and model providers, terms, rate limits, commercial publishing permissions and quotas; pin actual upstream SHAs prior to vendoring.
2. Build allowlisted provider adapters and local evidence manifests; do not execute arbitrary endpoints found in community catalogs.
3. Rank and cluster article opportunities with global audience intent, source depth and a unique information gain requirement.
4. Research -> claim ledger -> brief -> draft -> media rights -> independent fact checks -> human review -> static render -> PR preview.
5. Pilot 10 articles; evaluate 3 clusters; scale through measurable batches to 2,000 approved articles, then maintain and refresh.
6. Only a separately approved integration PR can wire any publishing route, schedules, Worker secret bindings or live deployment.

## Initial developer commands
```bash
node missionmangal/scripts/validate-article.mjs missionmangal/examples/article.json
node --test missionmangal/tests/*.test.mjs
```

Do not put provider keys, raw private data or customer material in this repository. No attempt will be made to enumerate GitHub secret values.

## Updated content families (supersedes the earlier blogs-only paragraph)
The current implementation supports `/articles/{slug}/`, `/blogs/{slug}/`, `/facts/{slug}/` and `/what/{slug}/`, chosen according to content format. The published byline is **AafnaiPatro Editor Team**; source author–date citations and an APA-style bibliography are rendered. `blog-engine/` includes an append-only resumable Python ledger and offline-only pipeline and workflow templates. Existing Facts routes must pass a collision audit before any future release. All four families are collected in one private staging sitemap until explicit route integration.
