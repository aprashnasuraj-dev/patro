# October 2026 fix package

Audited against `manifests/patro-product-contract.json` and `docs/ui-audit/`, verified with a full
production build, every release-gate test suite, the Wrangler dry-run, and the browser checks.

## Calendar
- **Tithi and Nepal Sambat now load.** Calendar archive rows are stored wrapped
  (`{ad_date, payload:{bs, ns, panchang}}`) but BS queries read `$.bs.*`, so every month returned
  "outside archive". Queries now read `$.payload.bs.*` (falling back to `$.bs.*`) and `parse()` unwraps rows.
  (`worker/public-api.ts`, `worker/patro-source.ts`)
- **Day cells:** festival (red for public holidays) · AD date ("4 Oct") / BS day / tithi / Nepal Sambat
  ("बछला थ्वः ७"). Phones keep AD, BS, tithi and a compact NS date at the 13px minimum; festivals become a dot.
  (`src/HomePageCurrent.tsx`, `src/patro-cell.css`)
- Holidays marked `effect: "closed"` (Ghatasthapana, Indra Jatra…) now show in red.
- Festival "facts" get Nepali names; no raw keys (`indra_jatra`) and no duplicates.
- Months outside the built-in converter no longer render blank.

## Site-wide
- **Each route serves its own content.** The asset store answers `/x/index.html` with 307 → `/x/`; the Worker
  treated that as missing and served the homepage body on every page. (`worker/connected-entry.ts`)
- **Nepali dates in Chrome.** Chrome has no Nepali ICU data (`ne-NP` → `en-US`, "2026 M10 4, Sun").
  New `src/nepaliDate.ts` formats dates without relying on the browser.
- **Menus close properly.** The header "थप" menu, search, account menu, media player and AI assistant now
  close on navigation, Back/Forward and Escape (the "थप" menu also on outside click). (`src/useDismiss.ts`)
- Nepali Typing / Preeti Converter load (folder index served, embeddable by our own pages).
- News falls back to the D1 archive when the legacy backend is unreachable, with Nepali source names and dates.
- `/jyotish/matchmaking` opens the 36-guna tab with its own heading.
- Install notice: appears after 4 s on phones, only when installable on desktop, hidden 14 days after closing.
- Share image is a 1200×630 PNG (`public/og-default.png`); social apps don't render SVG.
- Old `/festivals/...` links redirect to the homepage instead of 404.

## Time Machine (`/time-machine`)
Immersive timeline (`src/time-machine/`): live year dial that follows scrolling, era rail (Licchavi → Federal
Republic) with event counts, era chapters on a coloured spine, major-event cards, Nepali category filters,
search, and "विवादित मिति" badges. All 706 moments load in one cached request (API cap raised to 800; internal
build fields stripped).

## Community suites
The suites already ship immersive per-community designs and their own switcher (`community-frontends/kit.js`).
The injected top bar no longer duplicates that list: it now offers "← आफ्नै पात्रो" and "सबै समुदाय पात्रो",
with 44px touch targets.

## Admin console
- Hidden fields (authenticator box, empty publish bar) no longer show.
- Lockout: ip+username pair locks after 5 failures, IP after 20, username after 50 (a stranger can't lock the
  owner out). `ADMIN_RECOVERY_PASSWORD` works even during a lock.

## Release gate updates
Homepage tests and browser checks pointed at `src/ReferenceHomePage.tsx`, which is now a one-line re-export of
`HomePageCurrent.tsx`, and at the pre-October cell classes. They now check the current files and cell layout
with the same strictness. Assertions for the homepage FAQ/SEO prose were inverted to match commit `bc009cf`
("remove rejected homepage faq and seo prose"). The share-image assertion now expects the PNG.
