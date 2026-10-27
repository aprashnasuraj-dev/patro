# Publishing architecture — 530 pages without thin SEO

## URL scheme

- All leaf slugs must contain a **hyphen** and use lowercase ASCII, e.g. `/calculators/tax-calculator`.
- Use correct spelling **`calculator`**, not `calculater`, in keyword-oriented slugs.
- Functional URL families: `/calculators/...`, `/converters/...`, `/generators/...`, `/validators/...`, `/planners/...`, `/timers/...`, `/comparisons/...`, `/editors/...`, `/utilities/...`.
- `/utilities` is the platform discovery hub; `/calculators` etc. are task-type hubs. `/utilities/<topic>` pages are topical hubs **only if they contain significant original navigation and helpful editorial context**. Do not manufacture 530 thin landing pages.
- Immutable `TOOL-XXXX` IDs map to 530 unique proposed URLs. Source `/tools/<slug>` reservations remain as historical aliases; **not all deserve redirects**. Only redirect when the legacy URL genuinely existed. Never redirect an unrelated occupied route.
- Each individual tool page gets one self canonical only **after** QA and route ownership verification. Draft packages remain `noindex` with null canonical/published date. If two route candidates conflict with Patro's live baseline, block both until reviewed.

## Site-level UI/navigation

- Header: logo, Utilities, Calculators, Converters, Generators, topic menu, search, language switch.
- Discovery home: polished hero + searchable command-style directory; 3–6 featured workflow collections, pinned favorites (local only), utility-type category blocks, recently used (opt-in local), trending only from *measured* usage not fabricated claims.
- Group pages: informative hero, editorial summary, task chips, filter/search/sort, 3-column desktop / 1-column mobile tool cards, worked examples, internal links and relevant parent/breadcrumbs.
- Individual pages: title + 1-sentence value; tool widget ABOVE long prose, mobile-first 2-column desktop input/result pane; live explainable visualization; examples; units & limitations; copy/download; method and verified official references; related workflow tools (4–5 links); contextual category navigation.
- Accessibility: visible focus, `<label>`/help text, `aria-live` results, keyboard use, reduced-motion, WCAG color contrast targets, responsive 320px+.
- Icon families distinct (math, code, file, health, tax, farming, education etc.), use original Lucide-like SVG icons; avoid identical chart defaults across 530 pages. Chart only when helpful, with table alternative and text equivalent.
- Related links: from `related-links.json`, reviewed semantic proximity and explicit relation role (next step, sibling, comparison, alternative). Do not insert irrelevant keyword links.

## SEO technical release

1. Inventory existing URL preservation baseline in the site repository; compare every proposed path against live route table, existing tool routes, and static asset paths.
2. Generate SSR/SSG/pre-rendered indexable HTML per accepted tool: actual H1, original explanation, input instructions, two examples, limitations, sources, dynamically lazy-loaded working widget. Do **not** ship one empty SPA shell to crawlers.
3. Include exactly one canonical `<link>`, valid title/description, OG, breadcrumb links and theme-appropriate `SoftwareApplication` schema **only when supported by actual page claims**. No invented reviews or FAQ stuffing.
4. Sitemaps: separate indexable, tested utility group and leaf pages (`/sitemap-utilities.xml`), automatically update only after readiness, include valid `lastmod` from actual changes.
5. Clusters: hub->tool navigation and tool->related tool links; breadcrumbs tool->type hub->utilities; avoid orphan tools. Do not generate extra near-duplicate doorway pages.
6. Each route assets via code-split/lazy import: initial HTML and shell fast; original interactive feature loads when in view/on navigation. Browser-local processing by default, do not send sensitive input in analytics.
7. Preserve Patro release gates and existing sitemap URL baseline; never mutate the 4000-article writing queue or article publication gate.
8. Start 10–25 verified pages; assess functional errors, LCP, 404s, crawl/indexing, user engagement. Add another wave only after problems corrected.

## Mandatory statuses

`SOURCE_PREPARED -> IMPORTED_PRIVATE -> COMPILE_PASS -> UNIT_PASS -> BROWSER_PASS -> REVIEW_PASS -> INTEGRATED_STAGING -> READY_FOR_PUBLICATION -> PUBLISHED`.
A failure holds status at last truthful gate. No status may skip direct evidence.
