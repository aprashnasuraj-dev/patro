# Aafnai Patro homepage: audit, implementation and release plan

Audit date: 24 October 2026. Repository base: `ccd6b744`. Scope: the whole homepage, navigation, calendar, tools, reading, notes, footer and floating controls. This document distinguishes **implemented** changes from **proposed** follow-up work. A passing source or server-render test is not a browser, cultural or WCAG conformance certification.

## 1. Assumptions and questions

1. **Calendar, tools and reading are the product's three main entry points.** Keep the Aafnai Patro brand; this is a wider homepage, not a rename of the company or domain. Published guides are the first reading content. A separate blog CMS is outside this change.
2. **Automatic location is intentional.** The user explicitly corrected the supplied brief: Dallas was the audit browser's detected location. Preserve browser/network location intelligence, actual location labels and its fallback behavior. Do not impose a Kathmandu weather default or mandatory location selector. Kathmandu remains the explicitly labelled Panchang reference location.
3. First visits use Nepali; explicit URL or saved language choices override that default. English navigation does not imply that every historical article has an English translation.
4. Existing date engines, My Time personalization, Jyotish, notes, voice input and all public URLs remain available. Reorganizing entry points is not permission to rewrite those calculations.
5. Native Nepali editing, Nepal Bhasa terminology and official holiday-date adjudication need qualified review before release. No cultural explanation or disputed holiday span is invented here.

### Evidence and date verification

The public homepage at https://aafnaipatro.com was opened and its rendered page inspected, including a full-page screenshot, on the audit date. The actual loaded page showed **7 Kartik 2083 / Saturday 24 October 2026**, Trayodashi changing at **13:52** to Chaturdashi, sunrise **06:09**, sunset **17:26**, and **NS 1146 कौला थ्वः झिंस्वमिला**. These are observations at that time, not hardcoded homepage constants. Today continues to derive from Kathmandu's civil date, archive data and the existing calculations.

The loaded calendar showed Kartik 1 on 18 October; Tihar 8–12 November, Falgunand Jayanti 11 November and Chhat 15 November. The prompt's Dashain-through-24-October assertion did **not** match the loaded event result, which ended on 23 October. The captured initial page and hydrated data were inconsistent. Do not extend that holiday in code without authoritative source review. The loaded Nepal Sambat month changed on 10 November after Aunsi on 9 November. The existing distinction between astronomical full moon and Panchang Purnima stays in the sky component. The supplied violent-incident example was not the current rotating entry: the observed card cycled through a Malta plane crash and sport. Both observations support making history deliberate navigation instead of unsolicited rotating content.

## 2. Audit table

Evidence labels: **Live** = rendered production page inspection; **Source** = repository implementation. Severity reflects task impact, not an assertion that the whole site is broken.

| # | Area | Problem | Evidence | Severity | Recommended fix / disposition |
|---|---|---|---|---|---|
| 1 | Header | Primary navigation grows after hydration | Live: initial Calendar, Astronomy, Horoscope, Tools, More gained Jyotish, Time Machine and another astronomy link | Major | Six primary entries; remove imperative duplicate injection. Implemented. |
| 2 | Header | Astronomy has two similar labels | Live: Astronomy and Astronomical calendar | Major | One clearly named destination in directory; preserve specialist routes. Implemented. |
| 3 | Header | Reading is hard to discover | Live: guides mainly near footer | Major | Articles & guides in desktop, mobile menu, bottom navigation and homepage. Implemented. |
| 4 | Header | Account icon lacks an obvious task | Live: compact Google-style icon | Major | Label My space; keep named Google sign-in in account/notes. Implemented. |
| 5 | Header | Browser language overrides Nepali-first brief | Live: English navigation on fresh English browser | Major | Nepali default, saved/query choice retained. Implemented. |
| 6 | Hero | Locale can change independently of navigation | Live: hero became Nepali under English navigation; Source: CalendarCellEnhancer | Major | React owns labels; stop mounting locale-mutating enhancer. Implemented. |
| 7 | Hero | Month spelling differs | Live/source: कार्तिक source versus कात्तिक display | Minor | Normalize presentation through existing BS_MONTHS; retain source data. Implemented. |
| 8 | Hero | Date freshness must survive an open tab | Source: date initially computed on mount | Major | Re-evaluate Kathmandu day on focus and a one-minute interval. Implemented. |
| 9 | Panchang | Dense equal-weight facts obscure primary daily answer | Live: six facts plus solar times, transition and links compete | Minor | Tithi, paksha, solar times and transition stay visible; supplementary facts/source links in More Panchang details. Implemented. |
| 10 | Weather | Brief incorrectly calls a detected foreign city a bad default | Live: Dallas, US; user confirmed audit/browser location | Minor | Preserve automatic weather; keep actual place label and visible states. Implemented, no mandatory selector. |
| 11 | Mid-page | Repeated quick-access navigation | Live: quick strip, Daily tools and Explore more overlap | Major | Four common tasks plus one categorized directory. Implemented. |
| 12 | Mid-page | Calendar competes with discovery surfaces | Live: several feature groups before/around core calendar | Major | Today and common tasks, then calendar/selected day, then deeper discovery. Implemented. |
| 13 | Calendar | No control over cell density | Live: all detail layers competing at once | Major | Five independent labelled layer toggles. Implemented. |
| 14 | Calendar | Nepal Sambat names are ellipsized | Live: long Roman names cut in cells | Major | Compact numeric form plus full accessible text, tooltip and selected-day detail. Implemented. |
| 15 | Calendar | Cultural terms are unexplained | Live: thwa/ga without an adjacent explanation | Minor | Help entry links existing Nepal Sambat page; defer new definitions to Nepal Bhasa review. Implemented link; editorial review pending. |
| 16 | Calendar | Grid requires many tab stops | Source: ordinary date buttons without a roving grid pattern | Major | Grid/row/cell semantics, one tab stop, arrows and boundary keys. Implemented. |
| 17 | Calendar | API failure can masquerade as no events | Source: event fallback caught errors into empty arrays | Major | Preserve successful rows, report partial failure, retry; genuine empty list distinct. Implemented and tested. |
| 18 | Calendar | Picker relies on an imperative enhancer | Source: injected month/year controls | Major | React-owned selects and navigation; preserve URLs and back/forward. Implemented. |
| 19 | Calendar | Empty selected panel is ambiguous | Live/source: absence of details lacks availability context | Major | Distinguish no listed event from unavailable event data. Implemented. |
| 20 | Calendar | No homepage subscription action | Live: no accessible .ics action by month grid | Minor | Download and subscribe-by-URL disclosure using existing festival sources. Implemented. |
| 21 | Notes | Developer status leaks into product copy | Live: “Voice ready · Live Browser recognition” | Minor | User-facing voice availability; remove engine internals. Implemented. |
| 22 | Notes | English controls within Nepali context | Live: conversion checkbox microcopy mixed | Major | Bilingual checkbox and account labels. Implemented. |
| 23 | Notes | Rich editor loads before it is needed | Source: delayed but unconditional note mount | Minor | Native disclosure; lazy mount once, retain draft on collapse. Implemented. |
| 24 | History | Unrequested distressing news competes with day planning | Live: rotating fatal plane-crash entry | Major | Remove homepage carousel; keep On This Day and Time Machine destinations. Implemented. |
| 25 | Sky | Full moon and Panchang could be conflated | Live: existing explanatory distinction is useful | Major | Preserve sky component and its explanation; no speculative dates added. Preserved. |
| 26 | Bottom | 64 and 29 count different things | Live: 64 specialist features versus 29 canonical public tool routes; Source: valid separate registries | Minor | Remove ambiguous homepage count; use group entry counts. Do not label 64 false. Implemented. |
| 27 | Bottom | Long flat link cloud repeats navigation | Live: ungrouped frequently used links after discovery panels | Major | Six task categories; suppress homepage DiscoveryPanel cloud, retain saved shortcuts on tool pages. Implemented. |
| 28 | Bottom | Artificially spaced text weakens scanning | Live/brief: fragmented labels in link cloud | Minor | Use shared directory labels; remove cloud on homepage. Implemented. |
| 29 | Footer | Eleven flat links lack hierarchy | Live: tools, policy and community destinations mixed | Major | Three labelled groups plus brand and settings; unique footer destinations. Implemented. |
| 30 | Floating | Install card, search FAB and assistant overlap reading/controls | Live: bottom-corner competition on narrow layout | Major | Single footer install; search in header/task entry; assistant footer launcher. Implemented. |
| 31 | Floating | Installation asks before the user chooses | Source/live: timed notice | Major | Install only on user action, preserving native prompt and manual fallback. Implemented. |
| 32 | Search | Modal focus can escape to page | Source: dismissal existed but focus trap absent | Major | Trap tab, restore trigger focus and scroll on close. Implemented. |
| 33 | Page | Repeated identical cards flatten hierarchy | Live: shortcut/discovery/feature panels share visual weight | Minor | Task strip, calendar grid, directory disclosures and editorial rows have distinct roles. Implemented. |
| 34 | Page | Contrast and Devanagari clipping need systematic checks | Source: many competing styles and compact cell text | Major | Shared light/dark tokens, 1.5–1.8 line-height, minimum 13px date metadata; token tests. Browser/zoom verification pending. |

## 3. Information architecture

### Primary navigation (six entries)

| Nepali | English | Destination |
|---|---|---|
| पात्रो | Calendar | `/` |
| उपकरण | Tools | `/tools` |
| लेख र निर्देशिका | Articles & guides | `/guides` |
| ज्योतिष | Jyotish | `/jyotish` |
| समययन्त्र | Time Machine | `/time-machine` |
| थप | More | Disclosure: media, community calendars and secondary tools |

Mobile retains one bottom navigation, with Calendar, Reading, Convert, My space and Tools. The drawer exposes the wider catalogue. Search and theme/language/account controls are utilities, not extra primary sections.

### Homepage order

1. Product descriptor and task search: establish the wider purpose without a marketing wall.
2. Today summary: BS/AD/NS dates, primary Panchang and expandable extra facts; correct named time reference.
3. Four common actions: conversion, typing, EMI and dictionary; replaces repeated shortcut groups.
4. Calendar and selected day: task workspace. Adjacent desktop sidebar contains upcoming festivals, My Time, automatic weather and sky; it follows the calendar on mobile.
5. Full tool directory: six expandable categories plus specialist hubs. Existing tool implementations remain on their own routes.
6. Reading: three real published guides and the full reading index; no fictional article routes.
7. Optional personal note: editor on demand, with account/voice behavior preserved.
8. Grouped footer: Calendar & discovery, Tools & help, About & policies; brand, language selector, one install action and optional assistant action. No repeated footer hrefs.

The history carousel, homepage link cloud, duplicate enhancer navigation, floating search and unsolicited installation are removed. History, search, assistant and installation remain available through deliberate controls.

### All 29 canonical tools, grouped in six categories

Each slug below is prefixed with `/tools/`. Groups are shared by `/tools` and the homepage via `src/tool-directory.ts`.

| Plain Nepali category | English | Canonical tool slugs (29 total) |
|---|---|---|
| मिति र पात्रो | Dates & calendars | `astro`, `bstoad`, `adtobs`, `calc`, `age`, `clock`, `tithi-reminder` |
| भाषा र लेखन | Language & writing | `nepali-typing`, `preeti-converter`, `spell-check`, `voice-typing`, `ocr`, `read-aloud`, `words` |
| ज्योतिष र संस्कार | Jyotish & rituals | `sait`, `baby-names`, `name-check` |
| पैसा र कर | Money & tax | `forex`, `gold`, `emi`, `vat`, `incometax` |
| नाप र दैनिक उपयोग | Measures & everyday tasks | `landconverter`, `units`, `fuelprice`, `nepaliqr` |
| सिर्जना र सहायक | Create & assist | `janmadin-akhbar`, `future-letter`, `patro-bot` |

The directory additionally retains `/convert`, `/tool/nepalidictionary`, `/mytime`, `/rashifal`, `/jyotish/china`, `/time-machine` and `/on-this-day`. These are not added to the “29 canonical /tools routes” count. Specialist hubs remain `/panchang`, `/muhurat`, `/jyotish`, `/planets`, `/nepal-calendar`. Existing “name check” title/description inconsistencies need content-owner review against the actual tool before relabelling its capability.

### URL and canonical policy

**Implemented:** no route migrations. `/`, `/today`, `/calendar/:bsYear/:month`, `/date/:YYYY-MM-DD`, existing tools, guides, `.html` routes and legacy aliases retain their handlers. The full build's URL-preservation gate checks the existing inventory. The new feed is `/calendar/festivals.ics` and is a static asset excluded from HTML-worker interception.

**Proposed separately:** use `/` as homepage canonical; `/today` should canonicalize to `/` if it continues to present the same daily content, rather than introduce a duplicate index target. Keep month pages self-canonical and date pages fixed-date self-canonical. Prefer `/jyotish/birth-chart` over `/jyotish/china` because “china” is ambiguous in English; retain the latter with a permanent redirect only after link inventory and analytics checks. Remove `.html` only through explicit 301 mappings; never break saved personal/report links. Future blog articles can remain under descriptive `/guides/:slug` until editorial scope warrants `/blog/:slug`; avoid two copies of the same article. Query preferences do not create additional canonical pages until server-rendered localized counterparts exist.

## 4. Homepage section specifications

| Section / component | Purpose and content | Loading, empty, offline and error | Festival / after-festival behavior | Mobile / prohibited content |
|---|---|---|---|---|
| AppChrome / introduction | Brand, six nav entries, language/theme, account, task search | Stable navigation without data requests; search has a clear no-results state | No special navigation changes | Drawer + bottom navigation; no duplicate injected nav |
| TodayHero / HomePanchang | BS/AD/NS, tithi/paksha, solar times and transition; extra facts/source links in details | Local BS date and server facts first; unavailable detail uses dash/error+retry; calculation deferred | Existing sourced events only; current date refreshes on focus/interval | Stacked, wrapping NS; no stale hardcoded holiday or implied local-weather Panchang |
| Task strip | Four frequently needed actions | Always linked, no API dependency; destination owns its states | Stable | Two columns; no autoplay or promotional cards |
| Calendar + selected day | Date selection, layers, navigation and full-day route | Local converter immediately; parallel archive/events; partial/error status+retry; true empty distinguished; offline notice | Mark available source events; no fabricated holiday spans | Seven columns, full selected detail below; no ellipsized cultural meaning |
| Upcoming festivals | Date-sorted, deduplicated by event name | Loading/empty/error copy; cached data may remain; no error disguised as empty | Past entries disappear; multi-day holidays list once; follows loaded event-year data | Below calendar; no unsolicited historical news |
| My Time | Entry to existing personal time engine | Link available without fetching the personal engine | Existing engine owns temporal semantics | Clear destination, no altered calculation rules |
| Weather | Actual automatically determined location, current summary and seven days | Lazy near viewport; reserved space; existing error/cache/retry and permission fallback retained | Independent of calendar events | Wrapping place names, stacked forecast; no forced selector or false Kathmandu label |
| Sky | Existing next-full-moon facts and explanatory distinction | Deferred existing component and fallback | Astronomical date remains distinct from festival/tithi date | Below main task; no claim of new ephemeris verification |
| Tool directory | Six native disclosures and specialist links | No server dependency; links retain destination states | Stable | Single-column disclosures, full keyboard access; no massive flat cloud |
| Reading | Three published guide summaries and index | Static curated list; English labels flag Nepali guide bodies | No invented seasonal article or stale promotion | Vertical editorial rows, no carousel or fabricated reading time |
| Notes | Optional private task capture | Lazy on first opening; local draft preserved on collapse; existing sync/voice errors localized | User-selected date remains explicit | Full-width editor; no browser-engine jargon |
| Footer / install / assistant | Grouped secondary navigation and deliberate opt-in controls | Install native accepted/dismissed/unavailable/installed states; manual guide; assistant lazy only after opening | Stable | Single install entry; dialogs trap focus; no stacked bottom-corner popups |

## 5. Calendar specification

BS day is the strongest cell element. AD day follows, then tithi; optional NS uses month/paksha/numeric day. Holiday red affects the BS number, festival gold provides a marker; today is underlined and selected day has a green outline/background. Desktop can show wrapped festival names. At narrow widths, the dot and full selected panel replace cramped event labels. Meaning is also present in accessible text, not color alone.

Five native checkboxes: **ई.सं. / AD**, **तिथि / Tithi**, **नेपाल संवत् / Nepal Sambat**, **बिदा / Holidays**, **चाडपर्व / Festivals**. Default: all on except NS to reduce density. Layers change presentation, not the underlying selected-day record. Full NS remains available in the selected panel and accessible name. The help disclosure links `/nepal-sambat/mandala`; new thwa/ga explanations await native expert review.

The grid uses `role=grid`, row and columnheader/gridcell roles, `aria-selected`, `aria-current=date` and a single roving `tabIndex=0`. Arrows move one day or week, Home/End move to week boundaries, Ctrl+Home/End to month boundaries, PageUp/Down change month and focus its first day. Edge arrows clamp to the month; they do not unexpectedly navigate. Enter/Space selects the button. Changing selection updates a polite selected-day region; the calendar title announces month changes. Accessible date names include BS, AD, available tithi, NS and event information in the selected language. Screen-reader behavior still needs NVDA and TalkBack testing.

Year/month selects use the existing converter range (1883–2093); previous/next bounds are disabled. Today resets route and selection. Month URLs and browser back/forward remain supported. The selected panel includes BS, AD/weekday, full NS, tithi, all listed events and `/date/:date` for complete details.

The ICS feed contains **only existing source-backed festival/holiday entries**, with all-day start and exclusive next-day end, escaped text, UTF-8 folding, stable occurrence identifiers and a build timestamp. Current build includes 126 entries across the available 2025–2028 source window; this is not a promise of complete coverage for those years. Calendar apps may download once or subscribe by URL. Imported events remain in their app offline; updates require connectivity and the subscribing app controls refresh frequency. Corrections that change a source identity/date may replace an occurrence rather than preserve its old UID; validate calendar-client deletion/update behavior before promotion. The UI does not claim the feed is a complete official holiday authority.

## 6. Visual system

| Role | Light | Dark |
|---|---|---|
| Brand/action green | `#176f3b` | `#82d49a` |
| Paper | `#fffdf7` | `#121b16` |
| Surface | `#ffffff` | `#1b2921` |
| Soft selected surface | `#edf3ec` | `#24382b` |
| Ink | `#202d25` | `#f3f4ed` |
| Muted text | `#506055` | `#bdcbbf` |
| Holiday | `#a52232` | `#ff9ba6` |
| Festival | `#7a5400` | `#edc977` |
| Moon/tithi | `#51457c` | `#c2b4ef` |
| Border | `#bbc8bd` | `#6c8172` |

Automated tests verify the six foreground colors against all three surface colors in both themes (36 pairs), each at least **4.5:1**. Border color is not a text color. These token tests do not prove that every inherited selector or focus indicator has correct computed contrast; that remains a rendered-page gate.

Typography uses the existing Noto Sans Devanagari/Mukta stack with system fallback. Both Devanagari-aware choices support matras better than substituting a Latin-only display font. Body 16px/1.7; headings 20–24px/1.5, desktop date 32–58px, mobile date 32px; calendar BS day 21–27px, metadata at least 13px/1.6, labels 14–16px. Latin and Nepali use the same structural hierarchy without all-caps tracking. Native-editor review must check conjuncts at 200% zoom.

Spacing follows 4/8/12/16/24/32/40px. Content max 1240px; 24px desktop and 12px mobile page padding. Containers 10px radius, controls 6px, 1px borders; no decorative shadows or gradients in the new homepage system. The calendar, editorial rows and disclosure lists have different forms because they serve different tasks. New task icons use Lucide at 1.8 stroke; existing tool icons remain in their established registry. No new page-load animation; reduced-motion disables transitions/animation in new surfaces. Global legacy iconography and all downstream pages are not redesigned by this PR.

## 7. Copy and microcopy

Nepali-first means readable task verbs, not literal word-for-word translation. Keep BS/AD, EMI, OCR and established technical abbreviations where they aid recognition; spell out the task nearby. In English, use Tithi, Nakshatra, Panchang and Nepal Sambat as named calendar concepts. Do not transliterate all product text into English or invent meanings for Nepal Bhasa words. Devanagari digits are used in Nepali date/time and group counts, while machine-readable ISO dates and subscription URLs remain unchanged.

| Context | Nepali | English |
|---|---|---|
| Product purpose | पात्रो, उपकरण र उपयोगी लेख | Calendar, tools and useful reading |
| Search entry | आज के गर्न चाहनुहुन्छ? | What would you like to do today? |
| Time reference | आज, काठमाडौं समय | Today, Kathmandu time |
| Extra daily facts | थप पञ्चाङ्ग विवरण | More Panchang details |
| Complete day | पूरा दिन विवरण | Full day details |
| Month layers | पात्रोमा देखाउनुहोस् | Show on calendar |
| Calendar help | पात्रो पढ्ने तरिका | How to read this calendar |
| Selected record | छानिएको दिन | Selected day |
| Genuine empty day | कुनै सूचीबद्ध कार्यक्रम छैन | No listed event |
| Data unavailable | कार्यक्रम विवरण उपलब्ध छैन | Event details are unavailable |
| Partial month failure | मिति उपलब्ध छ। तिथि वा चाडपर्वका केही विवरण आएनन्। | Dates are available. Some tithi or event details could not load. |
| Retry action | फेरि प्रयास | Retry |
| Offline | तपाईं अफलाइन हुनुहुन्छ। सुरक्षित विवरण हेर्न सकिन्छ; नयाँ विवरणका लागि इन्टरनेट जोड्नुहोस्। | You’re offline. Saved details remain available; reconnect for updates. |
| Tool discovery | आफ्नो कामका उपकरण | Find a tool for your task |
| Install | एप इन्स्टल गर्नुहोस् | Install app |
| Manual installation | आफ्नै पात्रो होमस्क्रिनमा राख्नुहोस् | Add Aafnai Patro to your home screen |
| Installed | एप इन्स्टल भइसकेको छ | App installed |
| Manual guide dismissal | बुझें | Done |

The complete implemented label inventory is source-controlled, rather than copied into a second divergent catalogue: header/mobile/footer in `AppChrome.tsx`, `MobileMenu.tsx`, `SiteFooter.tsx`; calendar/empty/error labels in `HomePageCurrent.tsx`; hero/Panchang/install/notes labels in their components; every tool title and description in `tool-directory.ts`; article copy in `HomeReading.tsx`. The reading section explicitly states when guide text remains Nepali in English mode. This PR cleans touched homepage strings; it does not claim that all legacy routes or all assistant responses are newly translated.

**Native review required:** all new Nepali action/state copy, preferred कात्तिक spelling, NS numeric short form, pronunciation labels, source-preserved festival names and the “name check” tool description. Review Nepal Bhasa terminology with a qualified speaker before adding explanatory cultural copy. Do not silently normalize authoritative source names.

## 8. Accessibility

Target WCAG 2.2 AA. Implemented: native buttons/links/selects/disclosures; labels for icon controls; skip link; semantic grid and one tab stop; polite availability announcements; selected and current-day distinctions; 44px control targets; focus outlines; focus trapping/restoration in search, mobile menu and install guide; wrapping calendar details; reduced-motion handling; theme-token contrast checks.

Release checklist: keyboard-only journey from header through every directory/footer control; NVDA/Firefox and TalkBack/Chrome date announcements in both languages; VoiceOver installation guide; 200% zoom and 320px width with no horizontal page overflow; 44px controls and calendar-cell widths (seven columns constrain horizontal width at 320px, so verify target-size spacing/exception and provide selected-day controls); dark/light computed styles; visible focus while sticky bottom navigation is present; 400% reflow where applicable; no repeated live-region announcements during async refresh. Test long NS/festival strings and denied voice/geolocation permission. Do not report WCAG conformance until these have been run on the actual build.

References: [WAI-ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## 9. Performance and SEO

### Budgets and implementation

Budgets are release targets, **not measured Lighthouse claims**: initial homepage JS <=180KiB gzip including its route/static dependency graph, CSS <=60KiB gzip, first-view fonts <=80KiB WOFF2 subset, no tool engines in the initial route, LCP <=2.5s/CLS <=0.1/INP <=200ms at field p75. Lab goal: mobile Lighthouse >=90, test low-end Android CPU and slow 3G separately; a simulated score does not substitute for field data.

Existing static BS-by-year JSON (211 BS shards, plus 212 AD shards in this build) and the bounded offline window remain. Local converter renders before network. Month and event requests run concurrently; failed BS-year promises are evicted to permit retry. Do not download all years. Weather waits until near viewport with reserved space; notes and assistant wait for a user opening them; supplemental astronomy waits until idle. No new third-party widget, image library or font download was added. Existing font files should be audited for subset coverage and preload usefulness in the next performance phase. Reserved weather space reduces, but does not prove zero, layout shift for unusually long locations/forecasts.

Build asset measurements and final test outcomes are recorded in the verification appendix. The existing shared CSS and application graph may exceed the targets: use route splitting and CSS ownership cleanup before claiming budget compliance. Prerender and edge HTML remain supported; their layout is still the pre-existing calendar shell, so a no-JS visitor does not yet get every new React directory/reading feature. Align static shell with the new hierarchy in the next phase and explicitly measure hydration shift.

### SEO policy and follow-up

Preserve existing source-backed sitemap/date/guide generation, structured data and URL inventory. This change adds no speculative date pages. The full build runs SEO, static-file budget and URL-preservation checks. English metadata already in main is not silently replaced across thousands of routes.

Proposed editorial title templates: homepage “आफ्नै पात्रो — नेपाली पात्रो, उपकरण र लेख” / “Aafnai Patro — Nepali calendar, tools and guides”; month “{BS month} {BS year} पात्रो” / “{BS month} {BS year} Nepali calendar”; date “{BS date} — तिथि, पञ्चाङ्ग र चाडपर्व” / “{date} — Tithi, Panchang and festivals”; tool “{task title} — आफ्नै पात्रो”. Each description must describe that route's actual task/data, not repeat a keyword list. `/today` follows the duplicate-content policy above. Use Event structured data only for verifiable dated events with the required facts, not automatically for every tithi or personal auspicious-time estimate.

**Not implemented here:** a locale-route migration or hreflang. Add `ne`, `en` and `x-default` only after equivalent server-rendered localized pages exist with reciprocal URLs; do not emit hreflang pointing to identical English-only bodies. Keep parameter-only UI language preferences from exploding sitemap entries. Blogs need editorial schema and author/source ownership before becoming an independent publishing channel.

## 10. Roadmap, measurement and usability

| Phase | Effort estimate | Deliverables | Gate |
|---|---|---|---|
| 1: clarity and restraint | About 1 week | Nepali default, duplicate nav/cloud removal, deliberate install/assistant, account labels, native copy review | Verify all old destinations and account flows; no unexpected permissions/prompts |
| 2: homepage and calendar | About 2–3 weeks | Current PR layout/layers/grid/feed; responsive and assistive-tech verification; static-shell parity; official holiday/NS review | Browser journey pass, actual Lighthouse report, cultural sign-off, correct feed import/update |
| 3: catalogue and publishing | About 3–4 weeks | Tool metadata reconciliation, editorial blog/guide model, localized SSR/hreflang, measured route/CSS splitting, optional slug migrations | Redirect inventory, unique metadata, content ownership, improved task outcomes |

These are planning estimates for design, engineering and review, not claims that weeks of user research have already occurred. This PR implements substantial phase 1/2 functionality; the gates remain explicit.

Measure only coarse interaction events without note text, birth data or precise coordinates. Proposed events: `home_calendar_day_select` (input method, language), `home_tool_open` (canonical tool ID, source surface), `home_reading_open` (guide slug), `calendar_layer_change` (layer), `home_data_retry` (resource), `install_open`/`install_outcome`. They are a measurement plan, not new tracking added in this PR. Compare four-week baseline and post-release cohorts, separating festival traffic, returning visitors and device classes.

Success criteria: >=90% completion finding today's tithi within 20s, >=90% conversion completion within 60s, >=85% festival-date finding within 45s; improve tool discovery clicks/session by 15% without lowering calendar task completion; reduce mobile bounce by 10% relative to baseline; increase festival-season seven-day return by 10% relative to matched baseline. Track day selections as successful intentional interactions, not a raw volume goal. Track Lighthouse and field Web Vitals independently. Targets are proposed and require baseline instrumentation validation.

Recruit at least **eight Nepali-speaking participants**: two aged 16–24, two 25–44, two 45–64, two 65+; include Nepal and diaspora, four low/mid-range Android users, mixed literacy/digital confidence, at least one keyboard or screen-reader user. A bilingual moderator runs three counterbalanced tasks (today's tithi, BS–AD conversion, a named future festival date) without giving menu labels. Follow with identifying NS, switching English, finding a guide, notes, weather location interpretation and deliberate installation. Record completion, first click, time, errors, perceived confidence and misunderstood labels; do not collect personal birth/financial data. Pilot one session, then eight study sessions; review failures before changing metrics or releasing. No participants have been recruited or tested yet.

## 11. Prototype and implementation

The implementation is directly in the Patro repository, not a disconnected visual mockup. The optional standalone HTML prototype is omitted to avoid duplicating the app's calendar data, language logic and engine. Review the branch/PR and its production build. No production deployment or merge is part of this change.

## Verification appendix

Verified locally on this branch:

- Full `npm run build`: passed, including TypeScript, SEO/product checks, all 29 canonical tool routes, seven community experiences, 22,902 baseline URLs retained (zero removed), 7,957 files against the 19,500 budget.
- `test:patro-tools`: 193 tests plus five iconography tests passed; includes My Time and Jyotish preservation.
- `test:cloudflare-contract`: 175 passed after the build completed.
- `test:release-safety`: 21 contract, four promotion-security and five Google account tests passed.
- `test:core`: 17 passed; `test:community`: 64 passed.
- `test:homepage`: ten component/data tests plus two ICS tests passed; homepage recovery: two passed.
- Browser-check scripts pass Node syntax checks. `git diff --check` passes.
- Dist inspection: bootstrap/homepage static import closure **133,775 bytes gzip (130.6 KiB)** across main, React vendor and PlaceTimingMount; directly linked CSS **54,120 bytes gzip (52.9 KiB)**. Measured by gzip-compressing the emitted files and recursively following static imports from HTML script/modulepreload entries. Excludes dynamic imports, API/JSON responses, fonts and network overhead. Both static asset targets are met; this does not establish 3G interactivity or field performance.

An earlier concurrent build/test attempt read intermediate generated manifests and failed the URL/SEO gates. Running the complete build sequentially, then its dependent tests, passed without weakening the URL baseline or altering generated community data.

 Browser preview on this execution environment cannot reach the local server; therefore local visual, interaction, Lighthouse and assistive-tech checks have **not** been claimed as passed. The repository's isolated PR browser job is retained and its assertions updated for explicit layers and footer-only install behavior. Its results must be reviewed before promotion.
