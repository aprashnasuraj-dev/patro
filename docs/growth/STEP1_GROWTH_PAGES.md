# Step 1 — Merge uploaded static growth pages

Integrated the four patches by merging their final files onto the current feature
branch. Shared package/config/entry files were merged: the AI binding, four crons,
all scripts and previous run_worker_first entries remain. Existing route inspection
found no exact/prefix collisions with /moon,/eclipse,/nepal,/weather,/us,/de,/fr,/es,/it;
/nepal-sambat is a separate prefix and remains Worker-backed.

14/14 uploaded growth tests pass. The normal build prerenders 337 unique pages;
the fallback proxies assets or returns a cheap 404/redirect with no D1/KV/R2.
Unverified festival pages retain noindex. DE/FR/ES/IT need native-speaker review.
The uploaded budget document is preserved as a supplied reference; it is not a
claim that real production CPU or traffic limits have been measured.

Rollback: revert this commit's growth exclusions, or remove them in config.
GROWTH_DYNAMIC=1 is an optional Paid-only fallback, never enable it on Free.
Existing routes and APIs are not deleted. Production verification follows owner
merge; no live deployment or sitemap-console submission is performed here.
