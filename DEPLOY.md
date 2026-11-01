# Internal Deployment Checklist

Production deployment details are restricted to authorized maintainers. Preserve existing Cloudflare Worker, D1, asset bindings, deployment scripts and environment configuration. Never commit credentials or private exports.

## Public HTML analytics gate

Every public/branded HTML deployment must ship exactly one managed Google tag for `G-KWLDWTSK14` in `<head>`, using the canonical `shared/google-tag.ts` implementation or byte-equivalent `data-patro-google-tag` markup. Extend CSP narrowly for Google Tag Manager/Analytics and the exact initializer hash when required; do not weaken CSP with blanket `unsafe-inline` solely for analytics.

Before promotion, verify the release bytes and at least one live representative HTML response contain exactly one `googletagmanager.com/gtag/js?id=G-KWLDWTSK14` loader and one `gtag('config', 'G-KWLDWTSK14')` call. Missing or duplicate analytics blocks release. API, JSON, XML, robots, sitemaps and other non-HTML assets remain untagged.
