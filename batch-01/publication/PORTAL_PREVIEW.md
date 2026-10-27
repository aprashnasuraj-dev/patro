# Local design preview

From the repository root, start a static server:

`python3 -m http.server 8765`

Open `http://localhost:8765/batch-01/publication/portal-preview/`.

This is a **noindex** pre-release directory UI and route-preview catalog, not the actual deployed Patro site or functioning tool runtime. Search, type/topic filters, and proposed route-copy controls are live. The integration phase needs to connect cards to actual tool pages and adapt to existing Patro brand assets/style tokens, then run full browser QA.

Styles use an optional externally hosted font as a design-only preview; production should use Patro's already bundled fonts, respect CSP, and avoid unnecessary third-party asset fetches.
