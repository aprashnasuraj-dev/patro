# PWA morning notifications and conversion pages

## User behavior

- Every supported browser surface offers installation after the calendar paints. Recent install dismissals are respected; Safari receives Add to Home Screen instructions.
- Morning greetings are part of PWA installation, with no separate subscription offer or account requirement. The browser notification permission prompt supplies consent. Platforms requiring a fresh gesture can be enabled from settings. Decline and disable choices are remembered; reloads never repeatedly request permission.
- Settings controls allow enabling notifications after a decline or turning them off; no greeting card appears on the homepage.
- Only a signed-in profile personalizes the greeting; guests receive nameless greetings. At 06:00 Asia/Kathmandu the server reads that day's validated calendar and festival index, then sends BS date, weekday, available Tithi and up to three recorded events, ending with “शुभ दिन।”
- The five-minute cron processes up to 32 due devices per tick with four concurrent sends. Morning and existing reminder delivery share a 40-send external-request budget per invocation, with reserved headroom; notification throughput must be measured before mass promotion. Indexed due timestamps avoid scanning all users; claims prevent overlapping sends. Successful sends advance to the next day; expired endpoints are deleted and transient failures use bounded exponential retries. The service worker uses a date-specific notification tag.
- Delivery requires permission, a functioning push provider/network and OS support. On iPhone/iPad use the installed Home Screen app. OS delivery timing is outside the site's control. Unsupported push browsers use the local foreground fallback; there is no promise of closed-app delivery there.

## Deployment

The existing validated main release applies D1 schema migration `0004_morning_push.sql` and provisions VAPID secrets before deploying. `scripts/cloudflare/ensure-push-secrets.mjs` lists secret names only, creates a persistent key pair only if both keys are absent, and preserves existing pairs. Incomplete pairs fail explicitly rather than silently rotating subscriptions. Cloudflare credentials need Workers edit and D1 migration permissions.

Guest subscriptions are scoped to an unguessable device secret stored locally; only its hash is stored remotely. Subscription POST/DELETE requests require the same origin. Known HTTPS push-provider endpoints and subscription keys are validated, and subscription writes are rate limited. Personalized names come from a valid account session and are used only in greetings. The API and private data are never added to the offline cache.

## Offline behavior

The build emits a bounded snapshot containing the entire current BS month plus seven days on each side (maximum 64 days), sourced Tithi and festival records. The service worker warms this automatically, plus current month API data, and synthesizes matching calendar/sync responses when the network fails. The converter chunk is warmed after registration and its deterministic date table runs locally. Requested dates outside cached coverage remain unavailable rather than receiving invented Tithi data.

## SEO

`/bs-to-ad/2083-baisakh-1` and `/ad-to-bs/2026-04-14` return server-rendered direct answers, language tags, canonical metadata, breadcrumbs and links to the day/month calendar. Numeric BS months and alternate spellings such as `baishakh` redirect to one canonical slug. Invalid dates return 404; provisional future conversions remain noindex. The build adds one conversion sitemap from the existing validated archive and indexable year window; no per-URL HTML files or DB queries are needed.

Festival runtime and static fallback pages add Schema.org Event objects for actual recorded observance dates, retaining the existing page and breadcrumb graph. No tickets, venues, attendance modes, organizers or precise times are invented. Event markup does not guarantee Google event rich-result eligibility for general observances.

## Verification

Run `npm run build`, `npm run test:morning`, `npm run test:core`, `npm run test:release-safety`, and the Worker dry run. The morning tests use real SQLite and encrypted push construction with a mocked provider to verify ownership, consent, deduplication, recurrence, conversion validity, offline Tithi/month data and notification receipt. The browser gate `scripts/check-pwa-install-ui.cjs` checks one permission request and no repeated offer after decline/reload.

For a real-device acceptance test, install, grant the browser permission, inspect the next morning greeting, open its date link, turn off notifications and confirm subsequent delivery stops. Real provider/device delivery cannot be proven by the mocked test.


## Homepage follow-up

Morning greetings remain part of installation and run in the background, subject to browser notification permission. The homepage has no morning greeting card, name field, status banner, or 6 AM install sales copy. Enable/disable controls live at `/me/settings`, accessible to guests. A browser that rejects an installation-time permission request can be enabled later from settings.

Guest greetings are nameless. Personalized greetings use the authenticated profile, never a manually supplied name. The subscription stores the associated session ID; dispatch joins the account profile only while that session remains valid. Logout or expiry therefore produces a nameless greeting even if the application is closed. Account changes and reconnects synchronize local foreground greetings and the current push subscription. Existing guest-entered names are ignored at delivery.

The idempotent Worker schema upgrade adds `account_session_id` to existing morning subscriptions. No personal calendar, note, reminder or push endpoint data is deleted. The updated homepage shows the sourced Nepal Sambat year in each populated day cell and uses a restrained cream/white/green palette with separate dark-mode colors.
