# Step 2.1 — Static analytics scripts

Inspected staticAsset: it only passes file bytes through with MIME, nosniff,
noindex and cache headers. The static bypass preserves those in _headers and
leaves /aap/settings.js Worker-backed. Both root and generated config exclude
only runtime.js and analytics.js. No feature is removed. Contract passes.
Rollback: remove the two exact run_worker_first exclusions.
