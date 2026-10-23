# Task 01 — Baseline inventory (in progress)

Date: 2026-10-23. Base `main` HEAD observed in GitHub code search: `ccd6b744e547366ba7b05ae5ab694a2ee9d22bb7`. Initial checklist branch commit `bd06f58aaf72bf249b19ccbd16e0d1753840d036`.

## Verified route ownership (important correction)
- `src/PatroRouter.tsx` imports `ReferenceHomePage` from `src/ReferenceHomePage.tsx`, which re-exports `src/HomePageCurrent.tsx`. Thus `/`, `/today` and `/calendar/YYYY/MM` render **HomePageCurrent**, NOT the alternate `HomePage` exported by `src/AafnaiPages.tsx`. Preserve the latter until consumers are audited.
- `/date/YYYY-MM-DD` uses `AafnaiDetailPages`; `/tools` uses `AafnaiPages.ToolsPage`; `/panchang`, `/muhurat`, `/jyotish`, `/planets`, `/nepal-calendar` use `FeatureGroupHub`.
- Specific tool routes include `/mytime`, `/convert`, `/rashifal`, `/jyotish/china`, `/tools/nepali-typing`, `/tool/nepalidictionary`. `PATRO_TOOL_SLUGS` handles 11 explicitly registered tool slugs; other `/tools/*` paths fall back to `UtilitySuite`. Exact/legacy redirects in `PatroRouter` are a preservation gate, not deletion candidates.
- Existing distinct `/time-machine` and `/mytime` must not be conflated. Existing JanmaPatro integration remains unchanged.

## Existing homepage component hierarchy, source: src/HomePageCurrent.tsx
1. `TodayHero`, My Time banner and `HomeWeather`.
2. Quick actions: Rashifal, date converter, reminders, My space.
3. `rh-layout`: left monthly calendar, selected-day panel, `DeferredHomeQuickNote`; right upcoming festivals, Daily tools, Calendars and tools, `HomeHistoryCard`, `DeferredHomeSkyFact`.
4. Below: `rh-pj-discovery` five groups (Panchang, Muhurat, Jyotish, planets, Nepal calendars) and link to full tools.
5. Tool duplication verified: converter in actions and sidebar; many tools also in broader tool hub. This is display duplication, not license to delete routes.
6. Current weekday array switches Nepali/English per UI language; requirement to display Nepali weekday headers in both modes needs explicit bilingual usability test.
7. Cells display up to 2 festival names in a potentially truncated label and keep selected detail separately. Today and selected classes exist but need CSS/a11y verification.
8. Unicode quick-action / category glyphs are present; replace presentation only.
9. Actual display uses `homeToday`, `homeMonth`, `homeEvents` in `home-calendar-client`; local fallback calls `adToBs`, `bsToAd`, `daysInBsMonth` from `packages/core/src`. Do not alter.
10. `TodayHero`, `HomePanchang`, `HomeHistoryCard`, `DeferredHomeSkyFact`, `DeferredHomeQuickNote` and CSS `reference-home.css`, `home-extras.css`, `patro-cell.css`, `panchang-jyotish/home-discovery.css` are redesign touchpoints.
11. Existing `package.json` build runs public-copy/brand, sitemap & SEO, TypeScript, URL preservation, Vite, prerenders, product verification and static file budget. Use it as validation, not merely `vite build`.

## Cloudflare read-only facts relevant to baseline (#02 in progress; not signed off)
Account hosts Workers `patro`, `patro-day-atlas`, `patro-growth-gate`; zone `aafnaipatro.com` active; Pages list returned empty. `wrangler.jsonc` defines `patro` with `worker/optimized-entry.ts` and Assets `./dist`, custom domain `aafnaipatro.com`. The zone's listed 33 route patterns target `patro-day-atlas` (including `/date/*`, `/moon`, `/nepal/*`, `/advancetools/*`); **not** safe to assume all paths share one Worker. Custom domain `patro` is configured separately in wrangler. No Cloudflare writes made.

## API presentation contract to preserve
`homeToday(date)`, `homeMonth(year,month)`, `homeEvents(year)` and their fallback behavior; `readServerToday` hydration from `#patro-today-data`; festival date/name/holiday classification; route query `/panchang?date=...`; Kathmandu `Asia/Kathmandu` date boundary; calendar month fallback and URL history events.

## Still required before checking #01
- Full route+legacy redirect inventory including Worker-served and static pages; source-of-truth tool catalog crosswalk.
- Header/footer component and current sitemap inventory; external font/icon/image/licensing audit.
- Baseline screenshots for widths 360, 390, 768, 1280/1440 in both languages, and link/accessibility review. No browser screenshots captured in this connector session; do not imply they exist.
- Verify precise baseline `main` commit against branch ancestry and save page weight/performance in #03.

This note documents findings, not completed implementation. No calculations, UI code, routes or production changed.

## Shell inventory addendum (verified)
- `src/components/AppChrome.tsx` owns desktop header, More menu, utility controls, footer and a **five-item** mobile tabbar. Current desktop direct entries are Calendar, Astronomy, Horoscope, Nepali tools + More; mobile entries Calendar, Horoscope, Convert, My space, More. New IA must replace rather than create a second competing shell.
- `AppChrome` already persists language under `patro.ui.language` and theme under `patro.ui.mode`; keep those keys and `patro:set-language` event behavior. Existing auth component is `GoogleAuthButton`, existing search trigger is `patro:open-search`; no duplicate auth/search.
- Header More includes the feature registry `src/components/FeatureLauncher` and direct media/community/history routes. Footer currently has compact functional links to Tools, Advanced tools, Guides, Time Machine, Community, About, Sources, Privacy, Terms and Contact, not the entire legacy keyword wall (which needs separate SEO/static inventory).
- `src/components/MobilePrimaryNav.tsx` implements **another** mobile nav with community bottom sheet. Audit where mounted before removing or hiding it; a CSS-only second tabbar would be a regression.
- `src/components/HomeExperience.tsx` contains a separate `InstallCard` with `beforeinstallprompt` and offline warmup; cross-reference all existing install prompts before consolidation. Do not promise offline completion based only on a timer.
- Source assets: `/aafnai-logo.png`, current Lucide import in AppChrome, plus Unicode glyphs. Keep bundled/installed icon dependency, prevent adding external script.
