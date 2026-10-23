# Newlook Fastgate — Master Redesign Checklist

Branch: `newlook-fastgate` (created from `main`). Status: planning / baseline audit. Owner: product + frontend. This file is the source of truth; check boxes only after evidence is linked in a PR or audit note.

**Brand sentence:** Aafnai Patro is a warm, culturally grounded, calm and precise daily Nepali almanac, presented with modern bilingual clarity.

**Hard boundaries:** visual/presentation, navigation and content organization only; do not alter BS/AD conversion, Panchang and Jyotish algorithms, data sources, festival facts, natal profile linkage, existing URLs, APIs, Worker dispatch, auth or analytics. Do not remove any existing tool. Any festival/month transliteration change requires owner review. No trackers, ads, autoplay, remote scripts, unlicensed imagery or production deployment without approval. Nepali and English changes ship together. Do not equate a festival, cultural observance and legally declared public holiday.

**Baseline verified in repository:** React + TypeScript app with custom `src/PatroRouter.tsx`, active homepage in `src/HomePageCurrent.tsx` (via `src/ReferenceHomePage.tsx`); alternative tools/older home in `src/AafnaiPages.tsx`; Cloudflare Worker configured in `wrangler.jsonc` (`worker/optimized-entry.ts`, Assets, D1-related build scripts). Existing build includes URL preservation, brand/copy, SEO, TypeScript and release gates. Do not overwrite the existing homepage/data normalization without tests. A production deployment is not part of checklist initialization.

**Status convention:** [ ] todo, [x] done. Every item requires both-language/mobile/desktop verification where relevant. Numbering is stable; append new discoveries under the relevant task before adding new top-level tasks.

## Phase A — Baseline and design direction
- [ ] **01. Baseline inventory:** capture current `main` commit SHA, routes, sitemap, actual tool registry, hero/sidebar/footer elements and major breakpoint screenshots; map critical API contracts and external assets.
- [x] **02. Cloudflare baseline:** read-only audit Worker routes, build/deployment setup, custom domain, cache/assets rules, current configuration and safe preview path; never mutate production resources for design review.
- [ ] **03. Regression snapshot:** capture representative Kathmandu dates (including month boundaries, a Saturday, festival, observance and absent data), bilingual screenshots, current page weight and Web Vitals baseline.
- [x] **04. Brand principles:** document the brand sentence, use/don't-use examples and component acceptance rubric (warm/cultural/calm/precise; no distracting ornament).
- [x] **05. Content and terminology audit:** record ALL typos/spacing/truncations and inconsistent bilingual names including “Astronomica calendar”, “Dhanya Purnima / Udhhauli”, “Sait rules”; propose corrections but do not change festival/month transliterations pending review.
- [ ] **06. Canonical destination inventory:** map every header/chip/sidebar/group/footer/tool link to exactly one canonical tool name, description, category and existing URL; explicitly include all current deep links and redirects.
- [ ] **07. Design concept sign-off:** wireframe responsive home, mobile bottom nav, menu, calendar, festival, tools and dark variants before broad implementation.

## Phase B — Design foundations
- [ ] **08. Semantic color tokens:** assess Nepal flag references; verify final crimson/blue shades and WCAG AA on off-white `#FBF7F0`, ink `#1F2937`; define separate holiday, today, selected, focus and status roles.
- [ ] **09. Full dark palette:** theme tokens for surface/text/border/hover/holiday/today/selected/focus, tested independently rather than isolated dark cards.
- [ ] **10. Seasonal accent resolver:** apply Dashain red, Tihar marigold/gold or default blue only from EXISTING verified festival dates; no hardcoded or invented festival dates; absent dates fall back to default.
- [ ] **11. Typography:** choose one licensed/local or efficiently hosted Devanagari family and Latin family; five-role type scale, Nepali line-height >=1.6 and correct language/script markup.
- [ ] **12. Spacing and surface system:** 8px rhythm, consistent radii/shadows, desktop/mobile max widths, responsive grids and touch sizes >=44px.
- [ ] **13. Icon system:** audit Unicode icons (☾, ⌛, ✦, ✧, ◎, ▦, ◷); replace with one consistent accessible outline set without adding uncontrolled third-party scripts.
- [ ] **14. Motion specification:** gentle durations/easing for month/card/buttons/countdowns/moon; `prefers-reduced-motion` eliminates nonessential transitions and animation.

## Phase C — Information architecture and shell
- [ ] **15. Five-item top nav:** Calendar, Panchang, Festivals, Tools, About; utility area for search/theme/language/sign-in; preserve other routes inside hubs/menu.
- [ ] **16. Mobile navigation:** Calendar, Panchang, Tools, My space; accessible active states, safe-area padding and no obstruction of page content.
- [ ] **17. Tools registry/canonical naming:** authoritative bilingual metadata registry; preserve current tool URLs and all existing routes; avoid renaming the underlying feature APIs.
- [ ] **18. Five-category Tools hub:** Daily Panchang; Auspicious Timing; Jyotish Calculators; Planets & Astronomy; Nepal Calendars & Converters, with each existing tool listed once and described in both languages.
- [ ] **19. Category pages:** headings, short guides, tool listings, useful internal links, canonical URLs, breadcrumbs, mobile layouts and missing-data states.
- [ ] **20. Structured footer:** Calendar/Panchang/Tools/About columns + Privacy/Terms/Contact/Sources; replace the keyword wall visually only after mapping links to real category pages and validating discoverability.
- [ ] **21. Header/menu/search usability:** keyboard, pointer, screen reader, language switching, search and back/forward behavior; prevent regressions in existing router.
- [ ] **22. Install entry:** consolidate to one dismissible existing PWA install prompt; persist user dismissal and preserve PWA/offline functionality.

## Phase D — Today and signature calendar
- [ ] **23. Today's hero hierarchy:** the Nepali BS date is visually dominant; AD date, greeting and supporting context, responsive and bilingual.
- [ ] **24. Time-aware greeting:** use local Nepal date/time with correct language and hydration-safe updates; no assumptions from browser locale alone.
- [ ] **25. Sun-path visualization:** sunrise/current position/sunset calculated for DISPLAY from current provided timestamps and correct locality; handle polar/missing/invalid times with no fabricated values.
- [ ] **26. Panchang summary/action:** only source-backed tithi/nakshatra/day summary; dedicated Full Panchang link; clearly distinguish unavailable data from a claim of auspiciousness.
- [ ] **27. Larger calendar cells:** Nepali weekday headers, BS/AD dates, tithi, optional festival dot, responsive size; full label in preview/day panel, Saturday/holiday visuals separate from observances.
- [ ] **28. Today/selected semantics:** today ring versus selected solid fill with separate contrast-safe holiday decoration and correct aria-current/aria-selected behavior.
- [ ] **29. Day detail and preview:** desktop hover/focus preview, mobile tap panel; multiple full festival names, distinction among holiday/festival/observance and source-backed Panchang.
- [ ] **30. Calendar navigation:** prev/next month with source-backed BS month lengths, Back to Today, gentle slide, mobile swipe, no accidental horizontal page scroll.
- [ ] **31. Week view:** compact seven-day strip with explicit toggle, retained selection and accessible keyboard use.
- [ ] **32. Calendar legend/keyboard:** single-line legend, arrows across day/month boundaries, Enter/Space details, visible focus and screen-reader descriptions.
- [ ] **33. Calendar safety tests:** month rollover, leap/edge dates, missing API, slow network, duplicate observances, both numeral systems, Kathmandu timezone and no logic/data drift.

## Phase E — Festival, sky and homepage organization
- [ ] **34. Upcoming festivals:** sidebar first, accurately sourced countdown with timezone-safe updates; absent/uncertain dates are never invented.
- [ ] **35. Festival page template:** existing URL preserved; date, meaning, observance, optional verified how-to, source and related Panchang/tools, bilingual title/description.
- [ ] **36. Festival art and season:** reusable line art/header variants, license/artist credit where applicable; never deploy unlicensed stock/Mithila motifs.
- [ ] **37. Sky card:** consistent light/dark surface, moon phase and next full moon only from existing astronomical data; subtle reduced-motion-safe treatment.
- [ ] **38. Home section hierarchy:** slim header > Today > calendar > upcoming festivals > sky > 4–5 tools category tiles > structured footer; mobile Today > calendar > festivals > tools.
- [ ] **39. Sidebar/content policy:** remove news from HOME display, keep On This Day neutral and culturally respectful, avoid duplicative modules; underlying existing pages/routes remain.
- [ ] **40. My space/quick note:** relocate note rather than delete; BS-by-default date formatting, localized empty states, opt-in, no technical status copy exposed publicly.
- [ ] **41. Preferences:** remember theme/language/location with privacy-conscious defaults, explicit consent for optional reminders, resilient persistence and a reset option.

## Phase F — Share, states and polish
- [ ] **42. Shareable daily Panchang:** generate a bilingual image from actual API data, correct font rendering and safe fallback for missing fields; native share/download behavior.
- [ ] **43. Festival greetings:** reusable Dashain/Tihar/other templates with checked bilingual text; only publish verified dates and suitable licensing.
- [ ] **44. SEO and OG:** page-specific title/description/OG image/canonical/hreflang where appropriate; test crawlers, prerendered pages and current URLs.
- [ ] **45. Loading/empty/error/offline:** content-shaped skeleton, explanatory bilingual empty/error and retry, accurate offline capability messaging and nonblocking graceful fallback.
- [ ] **46. Favicons/PWA/visual polish:** coherent icons, manifest assets, alignment, captions, shape/shadow fidelity and consistency at all breakpoints.
- [ ] **47. Localization and accessibility:** human review of standard Devanagari, no spelling changes without approval; lang tags, AA contrast, focus, keyboard, 44px targets and reduced motion.
- [ ] **48. Performance/security:** mobile-first Lighthouse and Web Vitals comparison, font/image loading, lazy route preservation, CSP/no new trackers, safe persisted preferences and no additional third-party scripts.

## Phase G — Quality gates and release
- [ ] **49. Automated preservation gates:** run `npm run typecheck`, relevant homepage/iconography/localization/URL/calendar/Panchang/Jyotish tests, `npm run build`, `npm run release:verify`; report exact pass/fail logs, and distinguish pre-existing failures.
- [ ] **50. Visual and functional QA:** both languages x light/dark x mobile/tablet/desktop; date/festival edge cases, menu/search/links, PWA/offline, accessibility and performance comparisons.
- [ ] **51. Preview and review:** branch-only preview deployment through existing approved pipeline, real Cloudflare assets/routing checks, copy/transliteration review, screenshots and rollback plan; do not point production at the branch.
- [ ] **52. Final PR and gated release:** link before/after and preservation evidence, reconcile against latest `main`, peer review, merge only after tests and authorization; production deploy is a separate decision.

## Execution order and log
- **Checklist initialized:** 52 numbered tasks; 0 implementation tasks marked complete. Current implementation begins at **#01 Baseline inventory**, followed by **#02 Cloudflare baseline** and **#03 Regression snapshot**. Creating this branch/document is setup and not falsely counted as completion of an audit or redesign.
- 2026-10-23: branch `newlook-fastgate` created from default `main`; verified `package.json`, `src/PatroRouter.tsx`, `src/AafnaiPages.tsx`, `wrangler.jsonc` before writing plan.
- 2026-10-23: #01 IN PROGRESS. Initial evidence committed in [`01_BASELINE_INVENTORY.md`](./01_BASELINE_INVENTORY.md). Confirmed actual homepage is `HomePageCurrent.tsx` through `ReferenceHomePage`; identified core data/display dependencies and read-only Cloudflare route findings. Screenshots/full navigation inventory remain open; do not check off #01 yet. #02 Cloudflare inventory partially gathered, but formal review pending.

- 2026-10-23 Phase A: committed audit artifacts 02–07. #02 configuration inventory complete (remote performance/release validation deferred #51), #04 principles documented, #05 targeted editorial audit complete (owner approval for transliteration pending), #01 full inventory and #03 actual visual/performance measurement still open, #06 automated full tool/route crosswalk still open; #07 implementation specification documented but user visual sign-off not presumed. Evidence: ./02_CLOUDFLARE_BASELINE.md through ./07_WIREFRAME_DIRECTION.md. Phase A is **not yet fully complete**.

- 2026-10-23 continuation: #06 source-derived search registry crosswalk committed at [`06_SEARCH_REGISTRY_CROSSWALK.md`](./06_SEARCH_REGISTRY_CROSSWALK.md): 53 parsed registry item destinations, 54 unique whole-file literal hrefs including markup. Core shell/navigation/home hrefs also scanned; full generated sitemap/edge route crosswalk is pending, so #06 remains unchecked. Outstanding blocker for completing Phase A: access to an executable browser and baseline Lighthouse/screenshot capture for #01/#03 and owner visual sign-off for #07. No falsified measurements or completion marks.
