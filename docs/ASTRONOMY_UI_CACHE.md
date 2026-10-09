# Astronomy readability and NASA request audit

The astronomical calendar at `/tools/astro` had dark-theme child labels inside
global light-theme cards. The new `.astro-app` palette keeps readable dark cards
and their typography scoped to this route, independent of the site theme. Headline
shadow is removed, body labels use at least 14px, and calendar labels use 12px.
Below 1100px the lunar and calendar cards stack. On phones the month grid scrolls
inside its own focusable region at a readable cell width; Agenda provides the
existing full-width date list. This prevents a wide grid shrinking the whole page.

## Actual request flow

The React page requests our same-origin APOD and cosmic APIs when its selected
date changes. It never exposes the NASA key or calls NASA JSON APIs directly.
Browser memory caches repeat requests for the same date within a page session.
The lunar phase/Tithi calculations use Astronomy Engine and the calendar archive,
independent of NASA media APIs.

Both API routes check Cloudflare's regional Cache API. APOD then checks shared R2
under `runtime/apod/v2/YYYY-MM-DD.json`; successful media is retained for 30 days. Cosmic's outer
response is cached for 15 minutes; its component caches use these intervals:

| Feed | R2 lifetime |
| --- | --- |
| NASA media, Mars rover archives, exoplanets, technology | 24 hours |
| Near-Earth objects and EPIC | 6 hours |
| EONET and DONKI | 15 minutes |
| InSight weather archive | 7 days |

The cosmic code also consults imported D1 snapshots, using valid snapshots before
upstream calls and stale snapshots when fresh producers are unavailable.

There is **no scheduled daily NASA publication job** in `worker/jobs.ts`. Public
requests trigger upstream refreshes when caches miss or expire; time travel to a
new date can produce multiple calls across the feeds. Cache hits do not consume
NASA API quota. Media images are loaded from their source image hosts separately.

## APOD correction

The live `2026-10-07` endpoint returned `is_fallback: true`,
`fallback_reason: NASA_HTTP_400`, with `s-maxage=86400` during inspection. Nepal's
date can advance before NASA publishes that UTC day's media. Failure responses
now use a 15-minute outer cache, and fallback objects are stored in R2 for 15
minutes to avoid repeated failed upstream attempts. Successful R2 entries remain
30 days. APOD and cosmic calls for the same date share one pending APOD lookup
within an isolate/environment, eliminating their concurrent duplicate requests.

This is not a global exactly-once guarantee: regional edge eviction, R2 propagation,
missing bindings, and concurrent cold Workers can still produce duplicate upstream
calls. A strict once-per-day publication service would require a scheduled producer
and global coordination, with historical-date backfill and explicit delayed-release
retries. DONKI/EONET currently refresh more frequently by design.

## Verification

`node --test tests/astronomy-cache.test.mjs` mocks upstreams and verifies concurrent
deduplication, successful R2 reuse across environments, bounded failure caching,
and distinct dates. TypeScript, Vite production compilation, and Worker bundling
verify integration. Chromium checks at 390px and 1440px verified no page overflow, readable 12px
calendar labels, stacked mobile panels, and functioning Grid/Agenda toggles with
mocked API responses. Production upstream quota telemetry remains unverified.
