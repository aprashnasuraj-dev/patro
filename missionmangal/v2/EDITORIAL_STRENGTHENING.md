# Mission Mangal v2 strengthening plan
Status: implementation contract for the next isolated iteration. This document does not enable publishing or change production routes.

## Objective

Improve evidence quality, editorial usefulness, source transparency, and reader-facing presentation without weakening the current grounding gate, scraping ethics, budget controls, or manual release boundary. “Human-like” means readable, specific, varied, and editorially coherent—not impersonating a named writer, hiding AI involvement, gaming AI detectors, or fabricating experience.

## P0 — release and quality gates

1. Keep v2 isolated from `main`, the live Worker, D1 bootstrap, existing calendar routes, and existing SEO routes. Generated content is staged on `missionmangal-content-v2`; publication requires a reviewed PR and release-gate pass.
2. Do not require a bulky per-article audit report or manual review queue for all 5,000 articles. Run compact, deterministic automated gates on every candidate before release and emit aggregate counts plus concise failure codes. Keep detailed diagnostics only for failed candidates, sampled tests, and debugging.
3. Fail closed on unsupported material claims, fabricated quotes, broken/mismatched URLs, inadequate independent evidence, missing references, rights problems, title/intent collisions, and route-specific quality floors. A provider response of “success” is not a quality result.
4. Distinguish hard failures from warnings. A missing optional image is a warning when the route permits no media; ungrounded claims, unsafe fetches, policy denials, and route collisions are hard failures. Do not release an article just because its prose reads smoothly.
5. Run regression fixtures and deterministic tests before batch release. Use stratified sampling to validate the automated gates, not to manually audit every article. Any sampled systemic failure blocks the batch until fixed.

## P1 — writer: human editorial quality

### Research-to-draft contract

- Build an evidence ledger before drafting. Each factual claim has a stable claim ID, one or more source IDs, exact supporting excerpt(s), and a support type: direct, calculated, contextual, contested, or inference.
- Keep facts, interpretation, and uncertainty separate. Calculations must expose formula, inputs, units, period, and rounding. Conflicting sources must be represented as a disagreement, not silently averaged.
- Generate a short brief first: intended reader, exact question, answer in one paragraph, what is known, what remains uncertain, why the page adds value, and planned sections. Do not pad to a word count.
- Never use em dashes. Use periods, commas, colons, parentheses, or a hyphen for numeric ranges. Treat an em dash as a deterministic release-gate failure.
- Detect and remove exact repeated sentences and block near-duplicate sentence patterns; avoid repeated openings across the batch, duplicated facts, and conclusions that restate the introduction.
- Use concrete examples, explanations of mechanisms, comparisons, useful caveats, and reader-relevant implications where evidence supports them. Avoid generic intros, repeated summaries, empty transitions, canned “in today's world” language, filler transitions, formulaic “delve into” language, and forced FAQs.
- Vary sentence length, paragraph rhythm, openings, transitions, and structure according to topic and intent. Use concise answer, explainer, timeline, comparison, dataset interpretation, field guide, or evidence review as appropriate. Do not force every topic into the same template, and do not add stylistic variety at the expense of accuracy.
- Preserve named entities, dates, quantities, units, and technical qualifiers. Run a post-write claim audit against the ledger; any new factual statement must map to evidence or be removed.
- Prefer original synthesis and information gain over synonym rewriting. Never copy long passages, imitate a living writer, invent first-hand testing, or claim an editor visited/used something without evidence.
- Disclose automation honestly in site-level editorial policy. Human review status must be real metadata, not a generated claim.

### Route-specific floors

Keep configurable route floors in `config.json`, but enforce these principles:
- General explainers: direct answer early, sufficient primary/authoritative evidence, plain language, one meaningful example when supported.
- Structured/open-data pages: deterministic rendering from source data wherever possible; show units, period, geography, methodology, missingness, revision date, and downloadable/source links. Prefer this over LLM prose for stable tables.
- Research pages: broader source diversity, competing explanations, methods and limitations, primary-source priority.
- YMYL: keep high-risk advice out of automatic release unless it meets a stricter route-specific evidence policy and stays informational. If automated checks cannot establish safe, supportable scope, hold the item rather than creating a manual queue for 5,000 articles. No personalized diagnosis, legal determination, or financial recommendation. Disclaimers do not repair unsupported claims.

## P2 — broaden discovery across the open web

### Discovery and source ranking

1. Remove Wikipedia as the discovery bottleneck. Use cached evidence, official APIs and open datasets, Brave or Tavily when configured, a public search fallback, and citation trails. Add scholarly and institutional discovery providers as the source layer grows.
2. Support relevant sources across thousands of distinct domains over time without crawling the entire web indiscriminately. Discover per topic, rank candidates, and fetch only a bounded number of pages. Public HTTPS sites are candidates, not automatically trusted evidence.
3. Score candidates on authority signals, directness, recency, topical fit, methodology transparency, and independence. Do not treat multiple pages from one publisher as independent corroboration. Require independent domains for automatic approval where the route policy requires corroboration.
4. Capture metadata where available: canonical URL, title, author, publisher, publication/update date, retrieval time, HTTP status, content type, robots decision, declared license, and content hash.
5. Use bounded per-topic fetch counts, per-host delays, explicit timeouts, response-size caps, concurrency limits, retry budgets, and a shared host cooldown. Do not retry permanent 4xx, robots denials, or opt-outs.
6. Validate public address resolution and avoid following unvalidated redirects. If robots policy cannot be read, skip the page instead of assuming permission. Keep raw page text transient. Respect site terms, copyright, rate limits, and provider commercial-use restrictions. Do not bypass CAPTCHAs, paywalls, or anti-bot controls.

### Source quality and freshness

- Define freshness classes by content type: live/current facts, annual statistics, historical facts, stable scientific explanations, and policy/legal material. Set route-specific refresh intervals.
- Detect stale pages and conflicting versions; preserve retrieval timestamps and source version/hash so changed sources can trigger re-review.
- Use source independence, not raw URL count, as corroboration. One press release syndicated to 8 sites is one evidence lineage.
- Never label an article “fact checked” solely because it has citations. That label requires the actual checks and review state to pass.

## P3 — references and frontend exposure

### Reader-facing references (prefer this over APA-style author-date clutter)

Use a clean, expandable **Sources & further reading** section rather than forcing APA parenthetical citations throughout general-interest pages. This is a readability choice, not permission to hide provenance.

- In the body, use compact numbered source markers such as `[1]` after factual claims or paragraphs. Each marker links to the exact reference entry and is keyboard accessible.
- At the bottom, render numbered reference cards: title, publisher/author, publication/update date when known, accessed date, and a descriptive “Read source” link. Add source type labels such as Primary data, Research paper, Government, or Background.
- Provide a “Why this source?” note for important claims and distinguish primary evidence from contextual reading.
- Offer an optional “Show inline citations” mode; never make citations hover-only or inaccessible on mobile.
- Preserve DOI/official report identifiers where useful. Do not invent author/date metadata. If APA is required by the subject or user, provide a dedicated citation format toggle/export instead of making it the default UI.
- Cite each consequential claim near where it appears. A references list with no claim mapping is insufficient.

### Suggested article-page components

1. **Quick answer**: 2–4 sentence answer near the top; omit when the page is a narrative where a summary would spoil the structure.
2. **Key points**: 3–5 evidence-backed bullets, only if they add scan value.
3. **At a glance**: compact table for definitions, numbers, dates, or comparisons; include units and period.
4. **Evidence confidence**: plain labels such as Strong / Mixed / Limited, with a short explanation and link to methodology. Do not use pseudo-precise percentages unless calibrated.
5. **Interactive visuals**: only when data exists and can be reproduced; include source, axes, units, alt text, and a text/table alternative.
6. **Further reading**: 3–5 curated next steps from already verified sources, not a generic related-keyword block.
7. **Updated / reviewed metadata**: show publication/update date and human review status only when true.
8. **Correction/report issue link**: give readers a way to report a source error and record the resolution.

All components must be responsive, semantic HTML, keyboard navigable, screen-reader labelled, fast, and safe to render. Avoid layout shifts, heavy client bundles, auto-playing media, intrusive overlays, and fabricated ratings or confidence scores.

### Structured article schema

Add optional fields without breaking existing content:
- `answer_summary`
- `key_points[]`
- `claims[]` with `id`, `text`, `source_ids[]`, `support_type`, `confidence_label`, and optional `calculation`
- `sources[]` with stable `id`, `title`, `publisher`, `author`, `published_at`, `updated_at`, `retrieved_at`, `url`, `source_type`, `canonical_url`, `sha256`, `license`, and `independence_group`
- `review` with `status`, `reviewed_at`, and `reviewer_type`
- `freshness` with `class`, `review_after`, and `reason`
- `media[]` with rights, credit, license, alt text, and provenance

Do not break the current article contract: introduce fields as optional, version the schema, and provide migration fixtures before changing renderers.

## P4 — testing, rollout, and measurement

Before scaling:
- Run unit tests, article schema validation, grounding tests, route/slug collision audit, and a renderer smoke test.
- Validate a stratified sample across routes and topic families, including failures and borderline cases. This is quality-system validation, not a requirement to manually review all 5,000 articles. Score factuality, source fit, readability, originality, usefulness, accessibility, and duplication separately.
- Compare v1/v2 on accepted-page rate, unsupported-claim rate, source independence, extraction success, cost per accepted article, time-to-review, and reader engagement when available. Do not optimize raw article count alone.
- Start with a small canary, then 25, 100, and larger batches only after the prior gate passes. Preserve resumability and idempotence.
- Keep production release separate from batch generation. Do not publish unless the fail-closed automated release gate passes; manual review of every candidate is not required.

## Definition of done

- No production route, Worker, D1 schema, or existing page changes from this scope alone.
- Every candidate passes automated pre-release gates; compact aggregate metrics and failure codes are available without producing 5,000 bulky reports.
- Writer produces natural, intent-specific prose with no em dashes, repeated sentences, or unsupported additions.
- Scraper discovers relevant sources beyond Wikipedia across a broad, dynamically expanding set of websites, while enforcing safe URL/redirect handling, robots/opt-out policy, host budgets, and transient raw text.
- References are readable, accessible, directly tied to claims, and never fabricated.
- Frontend additions are schema-versioned, backward-compatible, responsive, and tested.
- Quality is measured by accepted, useful, supportable pages—not output volume or an “AI-human” score.
