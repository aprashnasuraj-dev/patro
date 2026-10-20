# My Time — Architecture Decisions

**Status:** Proposed; validate against the product owner's architecture document before implementation.

## ADR-001 — Integrate with the existing platform

**Decision:** Use React + TypeScript + Vite for the frontend and the existing Cloudflare Worker entry architecture for edge APIs.

**Reason:** The repository already uses these technologies. A separate Next.js migration is not required to deliver the requested feature and would expand regression scope.

**Consequences:** Use one canonical `/mytime` page, lazy-load its UI, and isolate its handler/calculation modules under `worker/my-time/` while dispatching them through the existing `worker/optimized-entry.ts`. Do not create a second Worker. Existing route behavior remains the compatibility baseline.

## ADR-002 — Feature isolation and rollout

**Decision:** Gate the new route and API with `MY_TIME_ENABLED` (default off until explicitly configured) and keep all new modules in `src/features/my-time/` and `worker/my-time/`.

**Acceptance:** When disabled, `/mytime` must not expose the feature and all pre-existing routes must behave as before. The feature must not claim that a frontend-only flag protects an API; the Worker endpoint must enforce its own rollout gate.

## ADR-003 — Separate astronomical primitives from Vedic rules

**Decision:** Maintain independent modules for ephemeris inputs, coordinate/time conversions, Panchang element calculations, traditional timing rules, and UI rendering.

**Reason:** Astronomical event computation and tradition-specific interpretation are different layers. This permits independent verification and prevents a visual or language change from altering calculated values.

**Acceptance:** Every calculated value carries its time basis, location assumptions, engine/version metadata, and convention where applicable. Boundary tests cover transitions, sunrise/sunset, polar edge cases, daylight-saving changes, and missing event results.

## ADR-004 — Cache keys must preserve calculation identity

**Decision:** Use a canonical, versioned key containing the requested civil date, a 0.1° latitude/longitude cell, timezone identifier, calculation profile/ayanamsa, and engine/data version wherever those dimensions affect the result.

**Reason:** The requested 0.1° spatial grid is useful for locality but is not a complete cache identity by itself. Timezone, convention, engine version, and date can affect output. Personal birth-chart calculations must not enter shared location cache entries.

**Initial form (to validate against the source document):**

`my-time:v1:{YYYY-MM-DD}:{latCell}:{lonCell}:{tz}:{profile}:{engineVersion}`

Normalize coordinates deterministically; handle negative values and grid boundaries consistently. Set a 24-hour TTL only for date-scoped data whose freshness model permits it. Live countdowns should derive from cached event timestamps rather than be cached as a static “now” value.

## ADR-005 — High precision is an explicit capability, not a label

**Decision:** Define an ephemeris interface that can support the existing `astronomy-engine` path and a future Swiss Ephemeris/WASM adapter, without adding a large dependency until package compatibility, licensing, Workers/WASM behavior, and ephemeris-data distribution have been checked.

**Reason:** A library name alone does not establish accuracy or Cloudflare compatibility. Swiss Ephemeris licensing and data-file requirements can affect product distribution.

**Acceptance:** Publish engine name/version, ayanamsa, precision notes, and fallback status with results. Never silently label an approximate fallback as Swiss Ephemeris/high precision.

## ADR-006 — Bilingual copy is a first-class contract

**Decision:** All user-facing My Time strings are authored in English and Nepali from the start, with a deterministic language preference/fallback.

**Acceptance:** Screen-reader labels, empty/error/offline states, calculation caveats, widget settings, and share cards are bilingual. Use the site's existing font and locale conventions where appropriate; do not introduce a parallel design system unnecessarily.

## ADR-007 — Offline-first must remain honest

**Decision:** Cache verified result payloads and static feature assets for offline reading; run client-side fallback calculations only for supported computations.

**Acceptance:** Display when results are cached, when they were computed, which engine produced them, and which capabilities are unavailable offline. Do not imply that cached data is live. Personal data remains local unless a user explicitly opts into sync.

## ADR-008 — Personalized recommendations need explainability

**Decision:** Smart Muhurta recommendations return candidate windows and a transparent rule breakdown rather than an opaque score alone.

**Acceptance:** Distinguish traditional/cultural guidance from scientific claims; disclose required birth details and selected convention. Do not store natal data in shared KV cache. Allow users to use general daily windows without providing birth details.

## ADR-009 — Performance targets must be measured

**Decision:** Measure cached and uncached requests separately, with location/date/profile dimensions and p50/p95 latency.

**Acceptance:** A target such as sub-100 ms applies to warm edge cache hits under a defined test setup; it is not promised for cold calculations, WASM initialization, or cache misses until measurements demonstrate it.

## Open decisions

- Exact formulas and convention rules from the architecture document.
- Swiss Ephemeris/WASM package selection, license model, data files, and Worker compatibility.
- Supported latitude bounds and fallback behavior for polar day/night.
- Exact feature flag source and deployment environment policy.
- Existing preference/location interfaces to reuse and whether any user sync is already supported.
- Exact cache-grid rounding/encoding specified by the source plan.


## Source document confirmed — Phase gates and calculation cautions (2026-10-20)

The source document defines Phase 1 as Edge Infrastructure & Ephemeris Core, Phase 2 as Frontend UI & Interactive Visualizers, and Phase 3 as Personalization & Offline Resilience. These gates are now the roadmap baseline.

### Calculation conventions

- Compute Tithi from the modulo-360° Moon-minus-Sun longitude difference in 12° bins.
- Compute Nakshatra and Pada from **sidereal** lunar longitude in 13°20′ and 3°20′ bins respectively; apply Lahiri ayanamsa once, not twice.
- Divide daylight Choghadiya from actual local sunrise to local sunset; divide nighttime Choghadiya from sunset to the following sunrise. Do not assume 24 hours or equal civil hours.
- Use the source's Rahu Kaal weekday-to-eighth mapping: Sun 8, Mon 2, Tue 7, Wed 5, Thu 6, Fri 4, Sat 3.
- Treat the source's Worker code as a conceptual example, not a deployable implementation. The shown cache-key template is malformed/incomplete, fixed +05:45 is invalid for general diaspora timezones, UTC date defaults can select the wrong local day, and input/CORS validation is insufficient.

### Swiss Ephemeris selection is blocked on licensing

Official upstream licensing describes a choice between AGPL and a professional license. Before selecting a wrapper or shipping its WASM binary, confirm the site's licensing/business model can comply. Moshier mode does not by itself remove upstream license obligations. Also verify the specific wrapper's maintenance, bundle size, ephemeris-data needs, Worker compatibility, and reproducible test fixtures.

### Cache design refinement

The 0.1° × 0.1° grid is required by the source but must not be the only key dimensions. Include local date, normalized grid cell, IANA timezone (or a documented timezone resolution policy), calculation profile/ayanamsa, schema version, and engine version. Personal birth data must not be shared through the public location cache. Cache event instants and derive countdowns at render time.


## Product-owner decisions (2026-10-20)

- Canonical URL is `/mytime` (not `/my-time`) and all interactive visualizers live on this single page.
- Route API requests through the existing main Worker `worker/optimized-entry.ts`; new handler modules may be scoped under `worker/my-time/` but are not separate Worker deployments.
- Reuse current engine, D1/static data, existing birth-chart/Rashifal and locale utilities after inspecting their real contracts. No duplicate worker, database, engine, or profile store without evidence that one is necessary.
- Navigation insertion is specific: tools list; mobile home menu immediately after JanmaPatro; desktop bottom section immediately after “आजको नेपाली मिति”.
- Phase 3 personalization is a cross-feature integration, only using birth details users have declared or consented to use. Recommendations expose the rules and conventions that affect them.
