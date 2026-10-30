# Date pages deployment

The release gate builds the date HTML into `.cloudflare/date-pages` and deploys
this Worker after the main `patro` Worker. Matching static assets are served
before Worker code. Missing dates use the `ORIGIN` service binding and retain
Panchang, archive coverage and the short public response cache.

The production zone route `aafnaipatro.com/date/*` is managed in Cloudflare and
points to `patro-date-pages`. It is deliberately omitted from `wrangler.jsonc`:
the release token can upload scripts and assets but cannot modify zone routes.
Wrangler skips route publishing when no routes are declared, preserving the
existing zone route during subsequent deployments, including Bali releases.

Keep `/atlas*` and `/sitemap-atlas*` assigned to the existing `patro-day-atlas`
Worker. Do not redeploy that Worker from its repository wrapper: production also
contains features deployed directly through Cloudflare.
