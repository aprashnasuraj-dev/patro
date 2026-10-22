# Frontend delivery ledger — 91 experiences across five groups

**State: preparation only / not release approved.** This ledger differentiates design-system coverage from finished, numerically validated functionality.

## Current authoring inventory

| Area | Authored source | What the user actually sees |
|---|---|---|
| Discovery | HomePageCurrent, HomePanchang, Tools, FeatureLauncher | Five prominent entries from homepage/Tools and the daily Panchang summary |
| Five HTML5 group hubs | FeatureGroupHub and feature-group-hub.css | Breadcrumbs, concise group hero, bilingual feature search, availability filters, navigation, selected-feature details and related groups |
| Feature-specific editorial experience | FeatureExperience, feature-experience.css and FEATURE_SYMBOL | Ninety-one addressed spotlight states; meaningful, AafnaiPatro-branded symbols; five visually distinct CSS themes; accessible headings, focus styles and reduced motion |
| Existing experience (17) | catalog disposition reuse | Direct canonical navigation; no copy of an existing engine, route or user profile |
| Browser preview (45) | five lazy workspaces and reusable components | A calculated or exploratory module loaded only when requested or directly linked; not described as independently validated |
| Reference/source-review (29) | feature-reference-guides.ts | Individual bilingual explanation and exact outstanding source/rule condition for each feature; no manufactured festival date or prediction |
| Daily Panchang | PanchangWorkspace, DaylightArc, static archive adapter, versioned contract | Daylight arc, BS/NS where archived, Tithi/Paksha/Nakshatra/Yoga/Karana, local day windows, 12/24/24+ timeline with archive-vs-calculation disclaimer |
| Muhurat | MuhuratWorkspace and MuhuratDayRibbon | Actual sunrise-scaled interval visualization, date-range table, existing Sait entry and explicit official-publication distinction |
| Jyotish | JyotishWorkspace and read-existing-birth | Existing birth-chart context, natal table and opt-in additional calculator surfaces; no new birth profile |
| Planets | PlanetsWorkspace and PlanetWheel | Data-derived 12-sign wheel plus bilingual zodiac key, numeric position table and optional event searches |
| Heritage | RegionalWorkspace | Nepal-first canonical community/calendar links; regional traditions held distinct from BS/NS and sourced before date publication |
| SEO | Existing sitemap index and pages route inventory | Five canonical group URLs added to the established sitemap hierarchy; 91 group fragments do **not** create 91 duplicate indexable pages |

## Design and implementation constraints

- The five hub pages are new static HTML targets in the prerender plan; the existing home and Tools outputs are updates, not additional URLs. Final `dist` count and byte sizes are **not measured**.
- Decorative artwork and practical diagrams use HTML/CSS/inline SVG; there are no newly required remote images.
- Feature spotlights never show internal audit identifiers or third-party comparison branding.
- One shared `useUiLanguage` state controls these pages. All important instructions/actions are authored in Nepali and English; actual full copy/overflow screenshot checks remain outstanding.
- Calculations and their numerical correctness are separate release gates. An authored preview or illustrated card is not an accepted rulepack, an independent astronomical accuracy test or an official festival decision.
- Cloudflare has **zero newly requested storage bindings, database tables, migrations or calculator endpoints**. The current static archive URL remains an ordinary network asset fetch; browser-side computation does not mean zero asset bandwidth.
- Existing My Time implementation is excluded from modifications and reused only via links. The read-only natal bridge accesses existing JanmaPatro state and honors a saved timezone where present.

## Mandatory visual and functional acceptance before PR

1. Inspect 320, 375, 768, 1024 and 1440 px for all five groups, in Nepali and English, both dark and light.
2. Verify every catalog card links to its intended destination, including opening fragment URLs directly and using Back/Forward navigation.
3. Confirm all search and availability filters operate together and report the correct counts without loading a heavy calculator.
4. Verify keyboard-only focus order, 44 px touch target where practical, screen-reader labels, color contrast and reduced motion.
5. Confirm no per-feature language selector appears and the homepage choice propagates after navigation.
6. Check calculated visuals against the underlying table: solar arc vs sunrise/sunset; Muhurat bars vs intervals; planet markers vs longitude.
7. Check each of 29 topic-specific reference cards is actually informative in both languages and never suggests an unverified definitive result.
8. Preserve previously working home, month/year browsing, Today, date conversion, Sait, JanmaPatro, Moon, Eclipse, Community calendars and My Time.
9. Inspect network traffic after initial hub load: no unintended D1/Worker calculator requests and no heavy calculation bundle before explicit opening or a direct feature deep link.
10. Run local TypeScript, targeted tests, production build and generated sitemap/route audits **only when permitted locally**. Do not create PR, trigger PR CI, merge or deploy from this ledger.

## Remaining release blockers

The crosswalk remains 91/91 **presented** but not 91/91 fully implemented/verified. The 29 reference features have specific copy, not production rule algorithms. Exact archive transitions, Nepal observance precedence, independent comparison tolerances, performance profiling and mobile screenshots remain unverified. No UI-source change should be equated with passing these release gates.
