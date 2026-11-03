# AafnaiPatro production ownership & preservation snapshot (2026-11-03)

This directory is a **read-only recovery reference** of the live Cloudflare account. It is **not deployable source** and is not a replacement for any originating repository. Do not copy these files into `src/`, `public/`, `dist/`, or a Wrangler assets directory. Do not deploy a snapshot Worker over an independently maintained service.

## Verified production inventory
- 39 Workers; 31 zone Worker route rules; 29 Worker custom-domain attachments (including the root).
- `production-inventory.json` contains active version IDs, upload mechanisms, route ownership, Worker domains, and the R2 custom domain `library-assets.aafnaipatro.com`.
- `runtime-bindings.json` contains **binding names/types and non-secret resource references only**, plus the deployed root/date asset routing modes. It intentionally omits secrets and plaintext variable values.
- `worker-archive-index.json` and `worker-sources/*.js.gz` preserve code returned by Cloudflare for 38 non-root Workers, including `patro-date-pages`, `patro-day-atlas`, and `aafnai-library-phase1`. The index records the original SHA-256 and byte count.
- The root `patro` Worker is maintained in `aprashnasuraj-dev/patro`. The deployed compiled version SHA-256 is recorded for comparison, but its 2.45 MB compiled bundle was not copied into this source archive.
- The initial snapshot excludes **static asset bodies/manifests, R2 object bodies, KV entries, D1 rows, DNS records, and deployment secrets**. Do not call this a complete disaster-recovery backup.

## Production ownership (do not cross-deploy)
| Scope | Owner / mechanism | Read-only reference |
| --- | --- | --- |
| Main site, Panchang, My Time, most shared assets | `aprashnasuraj-dev/patro` / Wrangler | `wrangler.jsonc` and main live version |
| `/date/*` | Separate `patro-date-pages` Worker with asset-first serving and origin fallback | archived Worker + live asset metadata |
| `/atlas*` and atlas sitemap | Separate `patro-day-atlas` Worker | archived Worker |
| `/library*`, `/article/*`, `/blogs/*`, `/research/*` and library sitemap | `aprashnasuraj2-dev/includedagain` → R2 `aafnai-library` → `aafnai-library-phase1` | publishing workflow + archived Worker |
| Specialist engines / branded domains | Independently uploaded Cloudflare Workers, route/domain map in inventory | archived Workers |
| `aprashnasuraj2-dev/include` | No active source found; repository was empty at capture | do not infer production ownership |

`patro/.github/workflows/aafnai-library-release.yml` intentionally delegates publishing to `includedagain`. Keep this delegation. The GitHub `patro/wrangler.library.jsonc` is not the live library Worker owner: do **not** run it as a production replacement.

## Mandatory release checks
1. Check that the proposed change owns only its specified Workers/routes. Run `node scripts/tool-growth/verify-external-routing.mjs` (offline). The guard now validates all 31 route records and all 29 Worker domain records from the baseline rather than the former 8/7 subset.
2. Verify archived bytes with `node scripts/cloudflare/verify-live-source-archive.mjs`. This test never deploys.
3. Before a release, run `node scripts/tool-growth/verify-external-routing.mjs --live` with a **read-only** Cloudflare API token, account ID and zone ID. If new production routes/domains appeared, recapture the inventory and review ownership; do not delete them.
4. **Do not run a root asset replacement until the exact Cloudflare-only asset inventory has been independently compared with the proposed build.** A successful source build does not establish deployed asset parity. Preserve the existing root, date-page, atlas, library, R2 and branded Worker assets.
5. Verify homepage, Panchang, Nepal Sambat, My Time, date pages, atlas, 550+ tool pages, library/blog/research samples, sitemap/robots endpoints, analytics tag and the separate custom domains. Public SEO crawlers must stay eligible to access public pages.
6. Deploy only the reviewed owner-scoped change. Keep any unrelated Worker's versions, routes, assets, KV/R2/D1 and DNS untouched. Never purge an unrelated bucket or whole-site cache.

## What “sync” means here
This is a **preservation and reconciliation commit to `patro`**, not a forced consolidation of 39 Workers into one script. All archived files are recovery references, not runtime imports. Cloudflare and the delegated `includedagain` library publisher remain authoritative for their own live deployment surfaces. Re-snapshot after any independently deployed change.

Restore an archived script only after validating its exact version, account bindings, routing, asset references, security headers and required upstream services. Recovering code alone does **not** recover an application's static asset bundle or data.

### Restore a source locally for inspection
```bash
gzip -dc cloudflare/live-sync/2026-11-03/worker-sources/patro-day-atlas.js.gz > /tmp/patro-day-atlas.inspect.js
sha256sum /tmp/patro-day-atlas.inspect.js
```
Compare the checksum with `worker-archive-index.json`. Do not deploy this file directly.
