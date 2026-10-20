# My Time — Foundation & Exploration

**Status:** Foundation exploration; no production feature code changed.  
**Feature branch:** `feature/my-time-v1`  
**Repository baseline:** `main` at exploration time.  
**Architecture reference supplied by product owner:** [Architectural Framework and Multidimensional Temporal Engineering for “My Time”](https://docs.google.com/document/d/1j-qzxHczYNxpXO1-B6dPMZSj4jFVLj3ek8gYecEsX_c/edit?usp=drivesdk)

## Scope of this first PR

This PR began as repository exploration and now includes the first integrated implementation slice. The supplied Google Drive PDF was extracted and reconciled against the repository. Current changes add an initial astronomy snapshot API under worker/my-time/, dispatch it through the existing worker/optimized-entry.ts, add the canonical /mytime SPA route and first responsive dashboard, and update tools/mobile/home navigation. This remains an initial slice: the feature is not deployed, the API is hidden unless MY_TIME_ENABLED=true, and the current snapshot is not a complete Panchang.

## Verified repository findings

- The repository is `aprashnasuraj-dev/patro`; its default branch is `main`.
- A long-lived branch, `feature/my-time-v1`, was created from `main`.
- The frontend is React 19 + TypeScript, built with Vite 6. It uses a custom pathname router in `src/PatroRouter.tsx`, rather than a conventional file-based Next.js router.
- The deployed edge runtime is Cloudflare Workers with Pages assets. `wrangler.jsonc` declares `worker/optimized-entry.ts` as the single main entry point, uses `nodejs_compat`, and binds static assets and D1. My Time must be dispatched through this existing Worker; no second Worker/service is to be created.
- `astronomy-engine` is already a production dependency. `worker/tithi.ts` contains an astronomical Tithi implementation based on Sun/Moon ecliptic longitudes, Tithi progress, approximate illumination, and a binary search for the next transition. Reuse and factor existing engine/data utilities before adding dependencies or duplicating calculations; inspect existing D1/static datasets first. `wrangler.jsonc` currently shows D1 and Assets bindings, but no KV namespace was found, so do not assume KV exists or silently add a new binding.
- The app already has a localized calendar/home experience and a bespoke SPA router. `/time-machine` is an existing route for the historical Time Machine; **do not reuse or replace it** for My Time.
- Existing worker dispatch is composed from multiple isolated handlers in `worker/optimized-entry.ts`; new API handling must use a new path and a carefully scoped handler so existing dispatch order and fallback behavior remain unchanged.
- `package.json` defines TypeScript checks, Vitest and Node test suites, build/release gates, Cloudflare configuration validation, and static URL-preservation checks. The full build is a long pipeline with many generated assets and verification steps.
- Existing product code contains Nepali and English copy and uses a mixture of client-rendered React and server-rendered Worker HTML. My Time must be bilingual (नेपाली + English) from the first public milestone, not a later translation pass.

## Engineering implications

1. **Avoid framework migration.** Implement within the existing React/Vite SPA and Worker architecture; introducing Next.js would increase deployment and regression risk without being necessary.
2. **Do not assume the current Tithi routine is a complete Panchang engine.** It is a useful existing primitive, but the required calendar conventions, ayanamsa, sunrise rules, boundary behavior, and high-precision ephemeris must be verified separately.
3. **Keep astronomy, tradition-specific rules, and presentation separate.** Calculation modules should return typed, unit-labelled results; UI must not duplicate formula logic.
4. **Treat location, timezone, and calendar date as explicit inputs.** A date-only cache key is not sufficient for location-dependent solar events or personal settings.
5. **Preserve current routing.** Add `/mytime` as a new route behind `MY_TIME_ENABLED`; preserve `/time-machine`, all current calendar routes, redirects, SEO handlers, and API contracts.
6. **Do not promise sub-100 ms uncached calculations.** Measure warm KV/cache hits separately from cold ephemeris calculations and report p50/p95 by response class.
7. **Do not invent personal auspiciousness.** Tarabalam/Chandrabalam and personalized recommendations need explicit birth inputs, tradition/convention selection, privacy controls, and a transparent explanation of the rules used.

## Proposed isolated file structure

```text
src/features/my-time/
  index.ts
  route.tsx
  MyTimePage.tsx
  components/
    TemporalPolarDial.tsx
    PanchangEssentials.tsx
    ChoghadiyaTimeline.tsx
    DiasporaClock.tsx
    SolarHorizon.tsx
    SmartMuhurtaAdvisor.tsx
  hooks/
  state/
  styles/
  i18n/
    en.ts
    ne.ts
  offline/
    cache.ts
    compute-fallback.ts

worker/my-time/
  index.ts
  route.ts
  schemas.ts
  cache-key.ts
  astronomy/
    engine.ts
    solar.ts
    lunar.ts
    julian.ts
  panchang/
    tithi.ts
    nakshatra.ts
    yoga.ts
    karana.ts
    vara.ts
    choghadiya.ts
    hora.ts
    muhurta.ts
  __tests__/

docs/my-time/
  FOUNDATION.md
  ARCHITECTURE_DECISIONS.md
  CALCULATION_VERIFICATION.md
  IMPLEMENTATION_STATUS.md

tests/my-time/
  calculation-contract.test.ts
  route-isolation.test.ts
  polar-dial-accessibility.test.ts
```

This is a proposed namespace, not a claim that all modules are implemented. Exact boundaries may change after reconciling the source architecture document and existing utilities.

## Proposed PR sequence (subject to the source document's three phases)

- **Foundation:** exploration, architectural decisions, feature flag and route contract, bilingual copy contract, baseline regression checks.
- **Calculation core:** explicit astronomy-engine abstraction, verified panchang primitives, deterministic fixtures and boundary tests, versioned cache keys.
- **Experience & offline:** responsive polar dial, modular widgets, saved location preferences, IndexedDB/service-worker behavior, graceful fallback and accessibility.
- **Release hardening:** CI gates, visual regression, worker performance measurement, staged rollout, and hand-off documentation.

The product owner's three-phase roadmap remains authoritative; this sequence must be mapped to its exact phase definitions once the document is accessible.

## Safety and non-goals for this PR

- Existing /time-machine and unrelated routes are preserved; My Time is added only at /mytime and /api/v1/mytime/today.
- No new dependency, D1 schema, KV binding, or separate Worker is added.
- The new API handler is dispatched through the existing worker/optimized-entry.ts entry point and remains disabled unless MY_TIME_ENABLED=true is configured in the Worker environment.
- The API reuses the existing `src/place/timing.ts` and `src/patro-tools/core/astro.ts` provider for location-aware sunrise Panchang, sidereal Tithi/Nakshatra/Pada/Yoga/Karana, Sun/Moon signs, sunrise/sunset, moonrise, and tithi end; it falls back to local noon when sunrise/sunset are unavailable. My Time also reuses the existing calendar archive/D1 fallback and location preferences. Choghadiya, Rahu Kaal, Yamaganda, Gulika, Hora, local eclipse contacts, and browser-local Tarabalam/Chandrabalam have initial implementations. Civil/nautical/astronomical twilight and IndexedDB snapshot caching have since been implemented in the feature branch. Smart Muhurta and service-worker offline fallback remain incomplete.
- New deterministic tests have been added to the existing product test script; GitHub CI is the validation gate, and results must be checked before merge.
- No feature code has been deployed or enabled. A corrective PR restored the default branch after accidental file writes; intended implementation remains isolated on `feature/my-time-v1`.


## Source-document reconciliation — 2026-10-20

The product owner's architecture document is now readable. It defines three phases explicitly:

1. **Phase 1 — Edge Infrastructure & Ephemeris Core:** Cloudflare Worker integration, a WASM Swiss Ephemeris pipeline, and Cloudflare KV caching keyed by 0.1° latitude/longitude grid and local calendar date.
2. **Phase 2 — Frontend UI & Interactive Visualizers:** responsive dashboard grid and the multi-layer 24-hour polar visualizer.
3. **Phase 3 — Personalization & Offline Resilience:** Tarabalam/Chandrabalam, IndexedDB persistence, service-worker offline computation.

### Formula requirements captured from the source

- Tithi: floor(mod(lambdaMoon - lambdaSun, 360°) / 12°) + 1 (30 values).
- Nakshatra: floor(mod(lambdaMoonSidereal, 360°) / (13°20′)) + 1; Pada: floor(mod(lambdaMoonSidereal, 13°20′) / (3°20′)) + 1. If the engine supplies tropical longitude, apply the selected ayanamsa exactly once to obtain sidereal longitude.
- Choghadiya: divide the actual sunrise-to-sunset interval and sunset-to-next-sunrise interval independently into eight equal segments.
- Rahu Kaal: source mapping is Sunday 8, Monday 2, Tuesday 7, Wednesday 5, Thursday 6, Friday 4, Saturday 3; apply to the sunrise-to-sunset eighths.
- Solar apparent time: local apparent noon is the Sun's upper meridian transit, not simply civil noon or longitude-only mean solar time.
- Solar altitude/twilight, Moon phase/illumination, eclipse contacts, Hora, Yamaganda, Gulika, Abhijit, Tarabalam, Chandrabalam, and epoch counters are named scope requirements; each needs a reference fixture and explicit support/availability semantics.

### Source-snippet issues to correct, not copy

The example Worker in the source is illustrative rather than production-safe: its cache key template appears malformed and omits latitude; it fixes timezone offset to +345 minutes; it defaults a local date from UTC; it does not validate query parameters/date/coordinates; and it returns permissive wildcard CORS. Implementation must use an IANA timezone and date-aware sunrise/sunset, validated inputs, explicit allowed origins/methods, versioned cache identity, and graceful handling of missing KV or ephemeris data.

### Phase 1 licensing gate

Before adding any Swiss Ephemeris-derived package or WASM binary, make an explicit licensing decision. The upstream project documents AGPL and a separate commercial/professional license path; a package's WASM wrapper does not remove the upstream license obligations. This is a release blocker for a proprietary/closed-source service unless legal/product ownership confirms a compatible licensing path. See [official Swiss Ephemeris licensing](https://www.astro.com/swisseph/swephinfo_e.htm) and [Cloudflare Workers WebAssembly documentation](https://developers.cloudflare.com/workers/runtime-apis/webassembly/).


## Product-owner refinements (2026-10-20)

- My Time is a deep feature integrated into the existing AafnaiPatro application, not a standalone tool/site/service.
- **One canonical page:** `/mytime`. Keep the existing `/time-machine` historical archive untouched.
- **One Worker:** use `worker/optimized-entry.ts` and its existing dispatch composition. A focused `worker/my-time/` module/handler is allowed, but it must be imported and dispatched by the existing main Worker; do not configure or deploy a second Worker.
- **Reuse before adding:** prefer existing `astronomy-engine`, Tithi implementation, D1 content/calendar sources, locale/time utilities, profile/rashifal/birth-chart interfaces, and app shell. Do not create duplicate engines or data stores where current implementations can be safely reused. WASM/Swiss Ephemeris remains an adapter/precision decision gated by license, compatibility, ephemeris-data, and benchmark evidence.
- **Navigation placement:** add My Time to the tools list; in the mobile home menu place it immediately after JanmaPatro; in desktop home view place it immediately after “आजको नेपाली मिति” in the bottom section. Keep a single page/dashboard, not multiple subtool routes.
- **Personalization:** use explicitly declared/available birth-chart and Rashifal context, alongside preferences/location/timezone and the PDF's other personal-time signals. Make recommendations explainable, consent-aware, and convention-labelled. General mode must work without birth data; never place personal birth inputs in shared public cache keys.


## Current implementation slice — 2026-10-20

### Phase 1 — existing Worker and engine

- Added worker/my-time/index.ts with a typed, versioned snapshot contract, validated date/timezone/coordinate inputs, local-noon conversion using the requested IANA timezone, Tithi name/index/progress, tropical Sun/Moon longitudes, and a simplified illumination estimate.
- worker/optimized-entry.ts dispatches only the new /api/v1/mytime/today path to that handler. It does not introduce a second Worker. Existing D1/Assets bindings remain unchanged; no KV namespace is assumed to exist.
- API rollout is guarded by MY_TIME_ENABLED=true. The deployment flag has not been enabled by this PR.

### Phase 2 — single page and navigation

- Added the /mytime route and one dashboard page at src/features/my-time/MyTimePage.tsx, with bilingual copy, date/timezone/location controls, a live 24-hour polar clock, snapshot cards, method notes, and explicit pending-calculation states.
- Added My Time to the tools directory and searchable feature launcher, after the birth-chart entry in the mobile menu, and as a desktop home entry immediately after today's Nepali date hero.
- Existing /time-machine remains unchanged.

### Remaining before claiming Phase 1/2 complete

- Run and fix the complete CI/typecheck/build/test gates; CI was pending at the last check.
- Reuse and reconcile the existing calendar archive/D1 panchang, solar event, timezone, and birth-chart/Rashifal data contracts before adding overlapping calculations.
- Add sunrise/sunset and polar-day handling, sidereal ayanamsa conventions, Nakshatra/Pada/Yoga/Karana, Choghadiya/Rahu Kaal/Hora/Muhurta calculations with authoritative fixtures.
- Replace pending UI states with verified outputs as each calculation lands; add visual/accessibility regression coverage.
- Phase 3 now reads the existing local JanmaPatro chart context and Rashifal sign preference, calculates Tarabalam/Chandrabalam locally when natal data is available, and requests only the declared sign for the published Rashifal summary. More context-aware Muhurta and offline resilience remain incomplete.


## Latest UX audit — 2026-10-20

- Added a contextual one-line timing summary for active Rahu Kaal/Yamaganda/Gulika, a favorable Choghadiya window, or the next relevant period. Copy is bilingual and tradition-qualified.
- Added live 24-hour progress, Choghadiya and inauspicious-window arcs to the SVG polar dial, plus restrained orbit/glow motion and a legend clarifying live time versus selected-date overlays. `prefers-reduced-motion` disables the motion.
- This remains an initial immersive layer, not a complete HTML5 observatory: Hora/twilight rings, interactive event seeking, drag-to-customize widgets, dual diaspora clock, Julian/MJD/Unix counters and Abhijit Muhurta remain open.
