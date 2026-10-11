# SEO, indexing and monetization

## What is prepared

All 2,029 pages render useful text and tool-specific content in the HTML, rather than requiring a search engine to execute a single blank application shell. Chord pages include generated diagrams and notes. Thread pages include diameter/pitch-specific values. Every page has one heading, a unique title/description, canonical URL, breadcrumb structured data and relevant internal links. Search filters only existing links. Form settings do not generate indexed query combinations.

The sitemap includes the actual canonical pages. Typo aliases redirect and are excluded. The source and module inventory are excluded from indexing by headers. No fake review ratings, fake update timestamps, search volume figures or promises of AdSense eligibility are included.

## Launch sequence for later

1. Install locally and pass the full existing repository checks and the optional Chromium checks.
2. Review tool examples, conversions, mobile layouts, native print/PDF size, actual headers, route exclusions and 404 behavior on a staging domain.
3. Deploy when you choose. Inspect representative page HTML and the root/module sitemap and robots configuration.
4. Add the module sitemap to the domain's Google Search Console and Bing Webmaster Tools if not discovered automatically. Use the domain owner's existing verification. No submission has been performed here.
5. Check indexed pages and search queries after launch. Improve pages with actual impressions; do not multiply thousands of near-identical numeric-setting pages.

Static content needs little operational work, but it still needs occasional checking for browser failures, mapping mistakes, hosting changes, abuse and policy changes. Indexing, ranking, traffic and revenue are uncertain. The earlier claim that spam results prove demand and weak competition is not a validated market study. This package is a functioning product, not proof of keyword volume or profitability.

## Advertising

Ads are disabled in `src/ad-config.mjs`. The page template provides one reserved placement after the useful content. `src/ads.mjs` accepts a consent event with `detail.granted === true`, validates the account/slot identifiers, then mounts a responsive AdSense placement and loads Google's script once. The consent event must come from a correctly integrated CMP. This adapter is not itself a CMP, does not determine consent requirements, and does not grant consent.

After the site/account is approved, set enabled, client and slot in the source, integrate your certified CMP where required, and rebuild. Read `integration/advertising.md` first: the restrictive default CSP deliberately blocks Google's third-party script until an advertising policy is configured and tested. Configure the existing site-level ads.txt with the exact account-provided record; do not create a conflicting module-level ads.txt. Existing account advertisements, privacy policy and CMP should be reconciled at the site level.

Do not put ads inside calculation controls, converter buttons, download buttons or chord diagrams. Do not simulate a download with an ad link. Do not create forced clicks, auto-refresh ads or self-click to test earnings. Keep useful page content visible and functioning when advertising is blocked.

Revenue modelling uses page RPM: revenue = monetized page views / 1,000 × observed page RPM. The RPM depends on actual audience, ad demand, consent and viewability; no fixed earnings forecast is supplied. For example, 100,000 monetized views at an assumed $2 RPM would be $200, but that is arithmetic, not a forecast.

## Primary policy references

Reviewed during preparation, October 2026; recheck before release:

- Google Search spam/scaled-content policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google Publisher Policies: https://support.google.com/publisherpolicies/answer/11112688
- AdSense RPM definition: https://support.google.com/adsense/answer/112030
- AdSense consent-management requirements: https://support.google.com/adsense/answer/13554116?hl=en
- AdSense responsive ad code: https://support.google.com/adsense/answer/9183460?hl=en
- Cloudflare asset-first routing: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- Cloudflare static redirects: https://developers.cloudflare.com/workers/static-assets/redirects/
