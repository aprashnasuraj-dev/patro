# My Time — Implementation Status | कार्यान्वयन स्थिति

**Last updated:** 2026-10-20  
**Overall:** Integrated foundation + first implementation slice in review | आधारभूत र पहिलो कार्यान्वयन समीक्षामा  
**Feature branch:** `feature/my-time-v1`  
**Rollout:** Not enabled; no production behavior changed.

## At a glance | संक्षिप्त स्थिति

| Workstream / काम | Status / अवस्था | Notes / टिप्पणी |
|---|---|---|
| Repository exploration / कोडबेस अध्ययन | Complete / पूरा | Existing SPA router, main Worker, astronomy-engine, D1/static sources, navigation, and tests inspected |
| Isolated branch / अलग शाखा | Complete / पूरा | `feature/my-time-v1` created from `main` |
| Foundation documentation / आधारभूत दस्तावेज | In review / समीक्षामा | This status page and architecture guardrails are proposed |
| Panchang formula verification / पञ्चाङ्ग सूत्र प्रमाणीकरण | Partial / आंशिक | Shared location-aware Panchang now supplies sunrise Tithi, Nakshatra/Pada, Yoga, Karana and sidereal signs; additional fixtures and convention review remain |
| Edge API and cache / एज API तथा क्यास | In progress / जारी | /api/v1/mytime/today dispatched by the existing main Worker; feature flag required; no new binding |
| Bilingual dashboard / द्विभाषिक ड्यासबोर्ड | Initial slice / पहिलो चरण | /mytime page, polar clock, settings, snapshot panel, navigation placements added |
| Offline and accessibility / अफलाइन तथा पहुँचयोग्यता | Not started / सुरु नभएको | No service worker or IndexedDB changes yet |
| CI and regression proof / CI तथा प्रतिगमन परीक्षण | Running / चलिरहेको | Added timezone/API and temporal-window tests to the product test script; latest GitHub CI must still be confirmed |

## Verified today | आज पुष्टि गरिएका तथ्य

- The existing application is React 19 + TypeScript + Vite, with a custom SPA router.
- Cloudflare Worker deployment already uses `nodejs_compat`, static assets, and D1.
- `astronomy-engine` is already installed and used by `worker/tithi.ts`.
- `/time-machine` is an existing historical archive route and will remain unchanged. My Time is planned for the new `/mytime` route.
- The repository has existing type-check, test, build, release, and Cloudflare validation scripts.

## Next milestones | आगामी चरण

1. Confirm the exact three-phase roadmap, formulas, and cache key against the supplied architecture document.
2. Inventory existing location/timezone/preference and panchang utilities in enough depth to avoid duplicating working logic.
3. Add feature-flagged route/API contracts and isolated deterministic calculation tests.
4. Implement calculations in small reviewable PRs, each with fixture provenance and error-boundary coverage.
5. Add the bilingual dashboard and visual regression/accessibility checks.
6. Validate offline behavior, warm-cache latency, cold-path performance, and pre-existing route behavior before gradual rollout.

## Known blockers and risks | अवरोध तथा जोखिम

- The Google Docs link was supplied, but the document body was not available through the currently connected document/repository actions during this exploration. Detailed formula claims and phase mapping are therefore pending direct verification. An exported PDF/Markdown copy or supported document connection is needed to follow the architecture document rigorously.
- The existing Tithi function is a starting primitive, not proof that all required Panchang calculations, tradition conventions, and edge cases are already implemented.
- High-precision Swiss Ephemeris support depends on package/WASM compatibility, data distribution, and licensing review.
- Full offline computation cannot be claimed until the supported client-side calculations and their accuracy limits are tested.

## Release policy | रिलिज नीति

No existing calendar, festival, Panchang, API, database, or navigation behavior should change as a side effect of My Time. Do not enable the feature in production until the feature flag, regression suite, calculation fixtures, accessibility checks, and rollback path are verified.


## Source architecture document now available | मूल आर्किटेक्चर दस्तावेज उपलब्ध

The supplied Google Drive PDF was successfully extracted on 2026-10-20. The three required phases are confirmed:

1. **Phase 1 — Edge Infrastructure & Ephemeris Core / एज पूर्वाधार तथा इफेमेरिस कोर:** Worker + WASM ephemeris + 0.1° grid/date KV cache.
2. **Phase 2 — Frontend UI & Interactive Visualizers / फ्रन्टएन्ड UI तथा अन्तरक्रियात्मक दृश्य:** responsive dashboard and multi-layer 24-hour polar visualizer.
3. **Phase 3 — Personalization & Offline Resilience / व्यक्तिगतकरण तथा अफलाइन विश्वसनीयता:** Tarabalam/Chandrabalam, IndexedDB, service-worker computation fallback.

The requirements include Panchang essentials, Choghadiya, Rahu Kaal/Yamaganda/Gulika, Hora, Abhijit, Tarabalam/Chandrabalam, local apparent solar time, solar altitude and twilight, lunar phase/illumination, eclipse contacts, diaspora dual clocks, calendar eras, Julian/MJD/Unix counters, and offline use.

**New release blocker:** upstream Swiss Ephemeris has an AGPL/professional dual-license model. The selected WASM package must be reviewed for both upstream and wrapper licenses before use in production. See [official licensing details](https://www.astro.com/swisseph/swephinfo_e.htm). Cloudflare supports precompiled WebAssembly modules, but bundle/startup/CPU characteristics must be measured; see [Cloudflare Workers Wasm docs](https://developers.cloudflare.com/workers/runtime-apis/webassembly/).

No functional code has been merged or deployed yet. Next work is formula/reference-fixture design and licensing/package verification before Phase 1 implementation.


## Product-owner scope confirmation (2026-10-20)

- Architecture is one integrated feature and one canonical page at `/mytime`; not a separate tool service or Worker.
- Phase 1 must dispatch through `worker/optimized-entry.ts` and reuse current astronomy, Tithi, D1/static datasets, and existing profile-related sources where contracts support it. No KV binding is assumed present.
- Phase 2 navigation order is explicit: tools list; mobile home menu immediately after JanmaPatro; desktop bottom section immediately after “आजको नेपाली मिति”. Preserve `/time-machine`.
- Phase 3 reads the existing declared birth-chart/Rashifal context locally and computes initial Tarabalam/Chandrabalam; smart Muhurta, additional preferences and offline resilience remain to be completed with transparent rules and privacy-safe cache boundaries.
