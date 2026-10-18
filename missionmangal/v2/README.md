# Mission Mangal v2: adaptive, cache-first, budget-aware

v1 pushed all 5,000 topics through one research-heavy pipeline (8 sources, 3 images, 5-11 LLM calls each) while every provider rate-limited.
Pass 1 ended: 0 approved, 3,635 research-blocked, 1,235 provider-blocked (SiliconFlow 402, Gemini 404, Groq/OpenRouter 429), 83 grounding failures.

## What changed
| v1 problem | v2 fix |
|---|---|
| One gate for every topic | `classify.mjs` routes: general / structured / research / ymyl. Per-route source + word floors (`config.json`). Images optional. |
| Dead providers found after 1,235 failures | `preflight.mjs`: 1 tiny call per provider, tries candidate models (Gemini 404), flags 402. Only healthy providers are used. |
| 25 shards x independent provider loops | `llm.mjs`: each worker owns `daily*0.85/workers` of every provider plus an RPM slice; 429 cooldowns honour Retry-After; budget exhausted => clean stop, work stays queued. |
| 5-11 LLM calls/article | `write-compact.mjs`: 2 calls (grounded skeleton, then body+FAQ). Same verbatim-passage grounding gate. |
| Research repeated from scratch | `plan.mjs` reconciles pass-1 + rescue + checkpoint branches; cached evidence is reused. No API call for topics with enough saved sources. |
| Discovery only via rate-limited APIs | `discover.mjs`: Wikipedia article -> its cited external links -> trusted-domain filter -> **Scrapling** (`scrapling_worker.py`, robots.txt + per-host delay + noai/noindex honoured, plain fetch only) -> v1 `snapshot()` -> optional Cloudflare render. Only excerpts + sha256 are stored. |
| Blunt `/econom/` regex held statistics pages as YMYL | open-data/statistics categories route to `structured`; real health/drug/money-advice stays `ymyl` (held unless `allow_ymyl`). |

`core/quality.mjs` is policy-aware but defaults to the strict v1 rules, so v1 articles audit exactly as before. An article carries `quality_policy` (min sources >= 2, media optional) only if v2's gate set it.

## Running
Nothing starts on push. Either commit `missionmangal/v2/run-request.json` on this branch (e.g. `{"workers":8,"limit_per_worker":3}` for a smoke test), or use "Run workflow" once the file is on the default branch.
Re-run daily with `resume_run_id` = the previous v2 run: provider budgets reset, finished topics are skipped, evidence is reused.
Output goes to branch `missionmangal-content-v2`; `main` and `missionmangal-content` are never touched. Publishing stays manual.

## Not done yet
Deterministic (LLM-free) templates for structured datasets; image recovery; human review queue for ymyl.
