# Step 3: request/cron audit and remaining production measurements

Four Cloudflare crons remain unchanged. The daily GitHub refresh dispatches the existing full release-gate workflow, rather than the historic storage-reconcile deploy bypass. No new Cloudflare cron is added.

Public configuration refresh no longer writes KV. Admin publish also keeps its Cache API/memory copy and D1 version, with KV writes disabled unless AAP_CONFIG_KV_WRITE=1 explicitly restores the prior mirror. Existing KV keys remain readable. Push KV gates are disabled by default (PUSH_KV_GATE=1 restores prior behavior); reminders still use their existing indexed D1 job query on each five-minute tick. This avoids request-time KV writes and cross-colo gate staleness while preserving delivery cadence. The additional idle D1 query is 288/day, not per page view. Cache API put is not KV put.

Calendar/history immutable sources now prefer ASSETS; R2 remains the fallback. Outer durable reference-response R2 reads/writes are skipped when ASSETS exists; REFERENCE_R2_FIRST=1 restores them. Time Machine compact index already uses static assets. No account/private storage changes. Existing remote archives are not deleted. Runtime cosmic/weather data caches remain because their values change independently of deploy.

Rollup backfill is bounded to four completed days per existing daily invocation; unrolled raw days remain queryable and cannot be pruned. This prevents unbounded initial backfill per scheduled invocation. Existing elapsed-time/local scheduled verification cannot prove production CPU <10ms. Production wrangler tail CPU, three-day request/write comparisons, remote migration, and console sitemap submissions require the owner merge/deploy and authenticated production access; do not mark them complete prematurely.

Optional step 2.6 skipped: root/SPA HTML varies with admin cookie, preview, published labels, disabled routes, theme/banner and configuration. Existing dynamic behavior is preserved.

Homepage additionally uses static AD/BS shards, with the original sync/month API fallbacks. /api/v1/events combines the same legacy festival/holiday results and preserves runtime holiday overrides and original endpoints. This still requires a live events Worker request. It would be inaccurate to claim every homepage view is exactly one Worker request, or that 100k daily visitors are guaranteed within Free quotas. Report measured browser counts, rather than the prompt's assumed baseline of six.
