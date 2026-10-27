# React/Vite/Cloudflare publication adapter (read-only proposal)

Existing Patro currently uses a Vite root SPA and build scripts that generate SEO/prerender output. That means **do not deploy the raw `page.html` files as if they were production routes**. They must be integrated into the existing SPA and Cloudflare output pipeline and independently verified.

## How the route adapter should work

- Build `toolId -> metadata/canonical slug` from the 530 catalog; never use the engineering batch number in a public URL.
- Keep **all ten batch folders** as the only uploaded source roots. A build-time resolver can locate code at `batch-XX/tool-products/TOOL-XXXX/src/ui.ts` by immutable ID.
- On the React route `/calculators/<slug>` (or `/converters`, `/generators`, etc.) resolve metadata, validate its QA acceptance receipt, and dynamic import the specific tool implementation in a separate chunk. Do not eagerly bundle the 530 modules into Patro's homepage.
- Render `<header>`, breadcrumb trail, accessible task-specific input/results, original visual/measurement table, examples, sources, updated jurisdiction limitations, then a Related Tools section from `route-contract.mjs`.
- `createToolPageModel()` filters links to **published, collision-cleared** tools. Never link to an unpublished proposed URL.
- Pre-render each accepted URL with readable unique title, H1, intro, instructions, evidence/limitations and valid schema; hydrate actual widget in browser. **A generic empty SPA shell is not acceptable SEO content.**
- Integrate group hubs `/calculators`, `/converters`, `/generators`, `/validators`, `/editors`, `/planners`, `/utilities`, `/extractors`, `/analyzers`, `/formatters`, `/comparisons`, `/timers`. Gate indexability on real accepted pages and unique editorial value.
- Add only accepted canonical pages to the utilities sitemap and existing sitemap index; keep an existing URL preservation test to ensure old Patro URLs are not removed.
- Avoid redirects from `/tools/<slug>` that never existed: this consumes redirects without transferring value. If the old route genuinely exists, 301 to canonical *only if not occupied by another product*.
- Published `lastmod` values must represent actual content changes, not deployment timestamp alone.

## Visual publication standard

Desktop: context breadcrumb → headline/help → 2-column sticky input and real result visualization → examples and method → authoritative notes → 4–5 real related-tool links. Mobile: single column, controls first, result immediately below; accessible focus and live summaries, no forced sign-in.

Review each tool's visual grammar rather than imposing the same chart on every product. Re-use documented AafnaiPatro tokens where available; prototype styles are just a starting design concept. Do not include a Google font fetch by default in production bundles.

## Collision checklist

1. Current route definitions and exact published URL preservation baseline in `aprashnasuraj-dev/patro`.
2. Existing `/tools` namespace and specific site features.
3. Canonical route uniqueness in the proposed 530 registry.
4. Proposed `/utilities/<topic>` hubs vs actual leaf names and current routes.
5. Trailing-slash, query and locale alternates; deterministic redirects to one path.

Only the site owner may approve a route candidate currently occupied by a different page. This batch pack **does not mutate Git or claim any route live**.
