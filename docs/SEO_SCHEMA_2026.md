# Aafnai Patro Structured Data Policy — 2026

This is the release policy for structured data. Markup is used to describe visible content accurately, not to chase unsupported rich-result decorations.

| Type | Aafnai Patro policy | 2026 search reality |
|---|---|---|
| `Organization` | Keep on the canonical site identity/home surfaces. | Useful entity/site identity semantics. |
| `WebSite` | Keep on the canonical home/site identity. Do not add a sitelinks `SearchAction` merely for a visual search box. | Google removed the sitelinks search box visual globally starting 2024-11-21; `WebSite` itself remains useful/supported for site identity. |
| `WebPage` | Use on factual public pages. | General semantic page description; every factual property must match visible HTML. |
| `BreadcrumbList` | Keep on hierarchical month/day/festival pages. | Google stopped displaying breadcrumbs on mobile results on 2025-01-23, but continues supporting them for desktop results and site understanding. |
| `WebApplication` | Use on genuinely interactive public tools, not ordinary editorial pages. | Semantic application description; not a promise of a special rich result. |
| `Event` | Use only when an actual sourced festival/event record has the required factual date/place semantics. | Never synthesize event times/locations for markup. |
| `Dataset` / `DataCatalog` / `DataDownload` | Use only on an explicit dataset-description page if one is added; never expect a normal Google Search rich result. | Google clarified in late 2025 that Dataset structured data is used by Dataset Search, not regular Google Search. |
| `FAQPage` | Do not add for SEO decoration. | Google deprecated the FAQ rich-result feature effective 2026-05-07. It can still be ordinary schema.org semantics, but Aafnai Patro has no reason to add it by default. |
| `HowTo` | Do not add for SEO decoration. | Google Search stopped showing How-to rich results in 2023 and removed related Search support. |
| `SearchAction` | Do not add solely for a sitelinks search-box visual. | The sitelinks search box was removed from Google Search starting 2024-11-21. |

## Hard rules

1. Every factual value in JSON-LD must be present in visible HTML on the same canonical URL.
2. Missing tithi, holiday, festival, sait, tika time, sunrise/sunset or provenance stays missing/unavailable; schema never fills the gap.
3. No schema is added simply because a validator accepts it.
4. The current Google Rich Results Test is a validation aid, not proof that Google will display a rich result.
5. Schema changes must preserve the existing UI and canonical calendar adapter contract.

## Primary references

- Google Search Central — structured data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Breadcrumb mobile change: https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs
- Sitelinks search box removal: https://developers.google.com/search/blog/2024/10/sitelinks-search-box
- HowTo / FAQ history: https://developers.google.com/search/blog/2023/08/howto-faq-changes
- Google Search documentation changelog: https://developers.google.com/search/updates
- Dataset structured data: https://developers.google.com/search/docs/appearance/structured-data/dataset
