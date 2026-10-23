# 02 — Cloudflare baseline (read-only, 2026-10-23)
- Account verified via connected Cloudflare MCP. Active zone aafnaipatro.com; scripts: patro, patro-day-atlas, patro-growth-gate; Pages projects list empty.
- Config: wrangler.jsonc name patro, entry worker/optimized-entry.ts, dist Assets binding ASSETS, not_found_handling none, run_worker_first with exclusions. Production custom domain aafnaipatro.com. Preserve D1 and other bindings as-is.
- Listed zone Worker route patterns point to patro-day-atlas, notably /date/*, /moon, /eclipse, /nepal/*, /nepalmap/*, /advancetools/*. These paths must be tested as distinct handlers, not silently consolidated into SPA.
- Preview safety: use branch-local build + wrangler dev on a local URL first; do not deploy newlook-fastgate to production, overwrite production route, migrate D1, or attach custom domain. If remote preview is subsequently authorized, verify noindex/no-follow and isolated hostname.
- Verify: npm run cloudflare:verify-inventory; npm run cloudflare:verify-snapshot; npm run cloudflare:validate; existing routing smoke. No production write performed. Pages deployment cannot be presumed to exist.
- Unverified: remote Worker deployment revision, actual caches/traffic, secrets (should not be exposed). Recheck as release gate #51. This is a configuration inventory, not operational uptime certification.
