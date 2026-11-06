# Cloudflare cache rule

On 5 November 2026 the `http_request_cache_settings` phase received an enabled `set_cache_settings` rule with `cache: false` for the site's authentication, private, family, account, token and personalized routes. The ruleset ID is `9d6f2552fe8b4b9298140176ca4ebe80`; the rule ID is `54a6919b83d4487d96101b5e2104bb26`.

This deliberately does not bypass every `/api/` route: public calendar, Panchang and other endpoints have existing targeted caching. Static library content also remains cacheable. Worker-level cache operations may take precedence over cache rules, so the rule is not proof that every future private response is uncached. Preserve and review the live expression before updating the zone's cache rules.

Rocket Loader was already disabled at the zone level. The ad scripts additionally carry `data-cfasync="false"`.

Early Hints was enabled on 5 November 2026. Supported library article/research responses include a `Link` preload for their existing first-party stylesheet. Early Hints cache misses can appear as internal `earlyHintsCache` 504 entries in raw Cloudflare logs; they are not end-user failures.
