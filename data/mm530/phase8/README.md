# Phase 8 — React/Vite integration

One React adapter resolves frozen canonical routes to lightweight metadata and a route-specific static tool asset. A build-preparation script bundles each existing tool `src/ui.ts` with esbuild and stages only route-specific assets under `/_mm530/<TOOL-ID>/`. The dashboard imports metadata only. Full build/browser verification is intentionally deferred until the integration sweep requested by the operator.
