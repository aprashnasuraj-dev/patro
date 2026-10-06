# Rashifal native fast-path integration

This branch adapts the user-supplied **Nepal Miti Rashifal Implementation Bundle v1.0.0** to Aafnai Patro's current Cloudflare-first architecture without retaining the bundle's Python/Vercel/PostgreSQL runtime dependency.

## Why the live page was failing

The previous Rashifal chain still referenced legacy Supabase/Vercel publication machinery. The public page could render, but universal publications could be missing and the personal path depended on an external engine/service-secret chain. That is incompatible with the current native Cloudflare direction and with the requirement that public reads avoid D1/R2.

## New runtime model

- `worker/rashifal-native.ts` handles metadata, universal and personalized Rashifal before `connectedWorker`.
- Public content is deterministic for a **period key**. The key is daily, Sunday-start weekly, BS/Gregorian monthly, or BS/Gregorian yearly.
- A period is calculated once per Cloudflare edge cache and then reused through `caches.default`. Recalculation after eviction is deterministic and returns the same publication for the same engine/window/system.
- Public generation has **no D1, R2, Supabase or Vercel engine dependency**.
- Personal birthday input uses `POST`, is `private, no-store`, is never written to a database/object store, and is never echoed back raw.
- The UI supports Nepali and English, Vedic and Western views, all 12 signs, daily/weekly/monthly/yearly periods, and an optional birthday-based personal view.

## Bundle logic retained

The native implementation preserves the bundle's main model rather than its deployment stack:

- Nepal civil time (`Asia/Kathmandu`)
- Sunday-start weekly windows
- BS month/year windows when requested
- Lahiri sidereal context for Vedic mode
- mean Rahu and opposite Ketu
- whole-sign houses
- Chandra Bala-style house scoring
- Tara Bala for personal Vedic readings when a birth anchor is available
- Vedha-based classical transit scoring
- solar whole-sign themes and transit/natal Sun-Moon aspects for Western mode
- five editorial domains: work, resources, relationships, daily balance, learning
- bilingual Nepali/English deterministic narratives
- 0–100 values explicitly labeled editorial indices, not probabilities

The astronomy backend is the repository's existing `astronomy-engine` dependency, not Swiss Ephemeris. Lahiri is implemented as a documented approximation in this fast native path. This should not be represented as Swiss/DE431 precision.

## Broadcast cadence

| Period | Publication identity | Sampling | Shared behavior |
| --- | --- | --- | --- |
| Daily | Nepal civil date | 03:00, 09:00, 15:00, 21:00 NPT | same 12-sign publication for the day |
| Weekly | Sunday start date | 09:00 + 21:00 each day | same publication Sunday–Saturday |
| Monthly | BS or Gregorian month start | noon each civil day | same publication for the month |
| Yearly | BS or Gregorian year start | 24 evenly spaced samples | same publication for the year |

The public response contains `broadcast_key`, `publication_strategy` and `x-rashifal-broadcast-key` so cache behavior can be inspected without accessing storage.

## Personalization semantics

The birthday mode accepts a Gregorian birth date and optional Nepal local birth time. With a time, Vedic mode anchors to the calculated sidereal Moon sign and Western mode to the tropical Sun sign. Without a time, noon Nepal time is used only as a clearly labeled temporary anchor; the interface directs users to Janma Patro for exact birth-chart work.

Raw birth input is not persisted. This mirrors the privacy direction used for the Janma Patro work on the same feature branch.

## Fast validation

`.github/workflows/rashifal-fast-gate.yml` is intentionally scoped to Rashifal files. It performs source-contract checks and dependency guards only. It does **not** invoke npm installation, the full Vite/SEO/prerender build, Playwright, Lighthouse, D1/R2 inventory, Wrangler deployment, or the repository-wide release gate.

A full product/release gate is still appropriate before final production merge; it is simply not repeated during each Rashifal iteration.
