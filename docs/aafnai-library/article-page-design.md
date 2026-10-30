# Aafnai Library — Canonical Article Page Design

Status: release-preparation standard for Phase 1 (2,640 frozen article identities).

## Product intent

Aafnai Library article pages must feel like a premium technical magazine combined with an auditable research note. They must never look like raw Markdown, a repository dump, or an internal QA dashboard.

## Canonical public surfaces

- `/article/{slug}` — canonical reading experience.
- `/blogs/{slug}` — compatibility route; 301/canonicalize to the article URL.
- `/research/{slug}` — evidence, claims, sources, methodology, limitations and provenance.
- `/library` — searchable sector/topic dashboard.

## Article hierarchy

1. Breadcrumb / sector / topic.
2. Kicker.
3. H1 headline.
4. Dek.
5. Byline: `AafnaiPatro Research Desk`.
6. Expertise signal: short line such as “Technical research · source synthesis · original diagrams/calculations” derived from article metadata, never invented credentials.
7. Short Research note explaining evidence basis and material limitations. No research-metric scorecard in the public article.
8. Review date / Article ID / tags where available.
9. Quick-answer or executive-summary callout.
10. Hero figure.
11. Body sections with strong H2/H3 hierarchy.
12. Consistently styled tables and calculations.
13. Supporting figures.
14. Inline numbered citations.
15. Relevant research-note callouts.
16. Practical implications / boundaries / limitations.
17. References.
18. Related reading.
19. Research & evidence link.

## Author and E-E-A-T treatment

Use the real editorial author identity from the article package. Default Phase-1 author is “AafnaiPatro Research Desk” when that is what the source article declares.

Never invent degrees, certifications, employers, years of experience or field testing.

The article may say what was actually performed: source inspection, deterministic calculations, code tests, raster/visual verification, physical testing, or lack of physical testing.

## Figures

Every meaningful figure is rendered with `<figure>`.

Required:
- article-owned MMG asset path;
- descriptive, natural alt text;
- caption directly under the image;
- optional provenance/evidence line;
- no keyword stuffing;
- hero and article topic must pass identity alignment before release.

Example alt style:
“ATA SMART vs NVMe health-log reporting path diagram showing firmware measurements passing through storage protocols and diagnostic utilities before reaching a health dashboard.”

## Citations

Main article:
- render source markers as numbered citations: [1], [2], etc.;
- markers are accessible links/buttons;
- clicking/tapping opens a concise source card;
- source card shows title, publisher/author, evidence role and link;
- do not expose repository-only fields such as verification_status strings in normal reading flow.

Research page:
- show claim → source mapping;
- evidence classification;
- qualification / limitations;
- source provenance;
- calculation/test artifacts.

## Tables

Tables must not render as browser-default Markdown.

Desktop:
- subtle border;
- tinted header;
- consistent cell padding;
- strong first-column labels;
- tabular-number alignment;
- no excessive zebra striping.

Mobile:
- horizontal scroll for comparison matrices where preserving columns matters;
- stacked key/value cards for simple two/three-column factual tables;
- minimum touch-safe spacing.

## SEO

For each article:
- one canonical H1;
- unique canonical slug;
- SEO title semantically aligned with article identity;
- descriptive meta description;
- Article/TechArticle + BreadcrumbList JSON-LD where appropriate;
- author/publisher;
- image metadata;
- canonical `/article/{slug}`;
- /blogs alias must not produce a competing indexed copy;
- descriptive internal links to related Library articles;
- research page should be indexable only when it adds substantial evidence content; canonical article remains the primary reading URL.

## Release rule

The design is data-driven from one MMG article identity. Headline, SEO, hero, supporting visuals, citations, claims and research cannot independently resolve to another MMG package.

Any failed identity/integrity gate blocks that article from Phase 1 until repaired.
