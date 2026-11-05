# Adsterra deployment — 5 November 2026

## Live placement

The publisher-supplied Popunder, Social Bar, native widget and Smartlink now decorate public HTML. Each HTML document has one async Popunder before `</head>`, one native container near the top of the body, two labelled sponsored links, and one async Social Bar before `</body>`. Native includes the homepage. Existing Google Analytics and AdSense code remains present.

No timers, forced Smartlink redirects, synthetic clicks, bot-only hidden units, or click-triggered impression refresh loops were added. Popunder interaction is controlled by the supplied provider script. The supplied code is not sufficient to configure the Adsterra account's anti-adblock feature; use the provider's official replacement tags if enabled later.

## Delivery and preservation

- The main `patro`, library/article/research, atlas, date, and 20 dedicated advanced-tool Workers received the shared decorator. The original deployed modules and named exports were retained. Dedicated service-worker handlers keep their existing application logic.
- A new `patro-adsterra-gateway` decorates the asset-first page families. See `wrangler.adsterra.jsonc` for its 27 route patterns. `/date/*` passes through this gateway to the existing `patro-date-pages` backend; other gateway routes use the existing `patro` service binding. Public URL and canonical metadata are preserved.
- Cloudflare's `keep_assets` retains asset routing as well as asset bytes. Attempting to change routing while retaining assets did not change the active static routing; the gateway is the verified solution. No static asset manifest, calendar dataset, R2 article object, or D1 record was replaced for this rollout.
- The gateway adds a Worker execution stage to requests on its matching routes, including resource requests sharing a route prefix. Service-binding and rendering CPU costs must be included in usage reviews. It does not add per-visitor database reads for ads.
- Existing content caches remain in use. The public HTML decorator strips stale duplicate copies and appends one managed set after content retrieval; rewritten responses remove stale content lengths and ETags.
- CSP now permits HTTPS creative scripts, connections, images and frames because the ad network rotates delivery domains. This broadens the third-party script trust boundary. Object, base URL, form-action and frame-ancestor restrictions are retained. Admin, API, authentication, personal/private pages and embeds are excluded.

## Repository integration

`shared/adsterra.ts` is shared by the Worker decorator and `scripts/install-adsterra.mjs`. The production build runs the installer after the final tool postbuild/verification steps. It visits generated HTML and date assets, updates CSP, validates exact unit counts and recomputes the deployed advanced-tool manifest hashes. Main and gateway sources are tracked separately; the main deployment must not absorb the gateway's route ownership.

Deploy `wrangler.adsterra.jsonc` only for the gateway. The original main/date/library/atlas assets remain in place. `scripts/adsterra/cloudflare-content-patch.js` is a Cloudflare-tool adapter helper for updating a dedicated live Worker without rebuilding its original application. Supply the transpiled shared module as `AD_MODULE` in the surrounding scope; never print credentials. Its `assetRouting` mode is intentionally blocked because `keep_assets` preserves the old routing.

Do not publish a full root asset rebuild merely to ship this patch. Preserve the existing root asset parity release gate. After a separately verified full static release includes the installer output, gateway retirement can be planned with exact route rollback and live checks. Until then, the portable static module manifest describes the stored assets rather than the streamed ad-decorated HTML.

## Validation

- Three targeted placement tests passed: correct locations and exact counts, repeat-build idempotency, CSP containment, and public/private path selection.
- Two passes over actual captured homepage and tool HTML produced stable output; module SHA-256 and byte totals matched the final transformed file.
- Live checks of 34 representative public pages initially passed, including all 20 dedicated advanced-tool landing pages, the homepage, tools, typing, Nepal map, Dolakha, Panchang, My Time, library, atlas, date and an article. Additional catalogue samples are recorded in the accompanying verification report.
- Browser verification found exactly three async managed loaders, one native container, and provider-populated native creative markup. The homepage calendar and Panchang rendered. This verifies implementation and one browser's native delivery, not account-reported impressions, fill rate or earnings.
- Full repository build/CI has not been run in this partial local source checkout. The source pull request runs the existing CI plus the new focused placement workflow.

## Rollback

Remove the 26 newly created gateway route records and restore `/date/*` to `patro-date-pages` before removing the gateway. The gateway's original destinations remain bound and unchanged. Restore the previous deployment versions for the decorated Workers using the rollout version ledger; do not delete application data or static assets. Repository rollback removes the shared decorator integration and final build hook together.
