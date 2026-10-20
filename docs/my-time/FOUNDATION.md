# My Time — Foundation & Exploration

**Status:** Foundation exploration; no production feature code changed.  
**Feature branch:** `feature/my-time-v1`  
**Repository baseline:** `main` at exploration time.  
**Architecture reference supplied by product owner:** [Architectural Framework and Multidimensional Temporal Engineering for “My Time”](https://docs.google.com/document/d/1j-qzxHczYNxpXO1-B6dPMZSj4jFVLj3ek8gYecEsX_c/edit?usp=drivesdk)

## Scope of this first PR

This PR records initial repository findings and proposes an isolated implementation structure. It does not modify any existing page, API route, data model, worker dispatch, or navigation behavior. The linked architecture document's detailed contents were not available through the connected repository/document tools during this exploration; exact formulas and the three roadmap phase gates must be reconciled against that source before implementation claims are made. Please provide an exported PDF/Markdown or enable a supported document connection for line-by-line verification.

## Verified repository findings

- The repository is `aprashnasuraj-dev/patro`; its default branch is `main`.
- A long-lived branch, `feature/my-time-v1`, was created from `main`.
- The frontend is React 19 + TypeScript, built with Vite 6. It uses a custom pathname router in `src/PatroRouter.tsx`, rather than a conventional file-based Next.js router.
- The deployed edge runtime is Cloudflare Workers with Pages assets. `wrangler.jsonc` declares `worker/optimized-entry.ts` as the entry point, uses `nodejs_compat`, and binds static assets and D1.
- `astronomy-engine` is already a production dependency. `worker/tithi.ts` contains an astronomical Tithi implementation based on Sun/Moon ecliptic longitudes, Tithi progress, approximate illumination, and a binary search for the next transition.
- The app already has a localized calendar/home experience and a bespoke SPA router. `/time-machine` is an existing route for the historical Time Machine; **do not reuse or replace it** for My Time.
- Existing worker dispatch is composed from multiple isolated handlers in `worker/optimized-entry.ts`; new API handling must use a new path and a carefully scoped handler so existing dispatch order and fallback behavior remain unchanged.
- `package.json` defines TypeScript checks, Vitest and Node test suites, build/release gates, Cloudflare configuration validation, and static URL-preservation checks. The full build is a long pipeline with many generated assets and verification steps.
- Existing product code contains Nepali and English copy and uses a mixture of client-rendered React and server-rendered Worker HTML. My Time must be bilingual (नेपाली + English) from the first public milestone, not a later translation pass.

## Engineering implications

1. **Avoid framework migration.** Implement within the existing React/Vite SPA and Worker architecture; introducing Next.js would increase deployment and regression risk without being necessary.
2. **Do not assume the current Tithi routine is a complete Panchang engine.** It is a useful existing primitive, but the required calendar conventions, ayanamsa, sunrise rules, boundary behavior, and high-precision ephemeris must be verified separately.
3. **Keep astronomy, tradition-specific rules, and presentation separate.** Calculation modules should return typed, unit-labelled results; UI must not duplicate formula logic.
4. **Treat location, timezone, and calendar date as explicit inputs.** A date-only cache key is not sufficient for location-dependent solar events or personal settings.
5. **Preserve current routing.** Add `/my-time` as a new route behind `MY_TIME_ENABLED`; preserve `/time-machine`, all current calendar routes, redirects, SEO handlers, and API contracts.
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

- No existing file is modified or deleted.
- No dependency is added.
- No D1/KV binding or schema is changed.
- No Worker route or frontend route is registered yet.
- No calculation is described as high-precision until verified against an authoritative reference and an independent engine/fixture.
- No existing branch is force-pushed and `main` is not modified.
