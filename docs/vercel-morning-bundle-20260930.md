# Vercel morning production bundle — 2026-09-30

Prepared from current production source branch `main` at `a93e48a618d5b7df0083ae5b4ef762915231c019`.

## Purpose

Consolidate work that is implemented in Git/Supabase but not yet represented by the public Vercel production alias, while avoiding stale branch regressions and repeated build-trigger commits.

## Included pending work

1. Patro Tools phases A-D already merged into main: PRs #15, #29, #30 and #33.
2. Selected release-audit work from `bundle/final-prod-20260929`:
   - root canonical/SEO and exact MeroPatro branding
   - dedicated Jyotish and On This Day SSR helpers
   - canonical Rashifal SSR helper
   - shared server-side header/footer/mobile navigation
   - no-loading SSR release cleanup
   - root-scoped PWA/offline worker and audited 192/512/maskable icons
   - month-view tithi transition labels
3. PR #32 final SEO gate:
   - non-duplicated root title
   - Rashifal HTML content type
   - launch/trust page helper
4. Still-relevant security items from stale PR #8:
   - Dependabot config and security CI
   - env/key ignore rules
   - CSP `object-src 'none'`
   - Vite 6.4.3 security patch
   - Vitest 3.2.7 patch for the @vitest/mocker critical audit advisory
   - repository copy of migration 20260928150257 (already applied in Supabase; do not rerun)

## Explicitly excluded

- PR #2 `astronomy-static-spa-router`: obsolete early cutover; would delete later routes/features.
- PR #18 Vercel rewrites that route all `/tools/*` to the older server-rendered tools hub. Current interactive Patro Tools routes are preserved.
- Stale wholesale copies of PR #8 router/Jyotish functions. Production versions already contain evolved rate limiting/security behavior.
- Intermediate Vercel ERROR commits with `module_not_found`, `missing_export`, or lint/type errors that were superseded by later merged/green commits.
- Any second BS conversion table or second primary Panchang engine.

## Vercel scan summary

Recent failed/canceled builds were dominated by intermediate commits:
- Patro Tools setup/phase B/D: module_not_found or missing_export before dependent files landed.
- MeroPatro release intermediate: lint/type error before subsequent release fixes.
- Utility platform intermediate: missing_export before the merged utility PR stabilized.
- Swarm overhaul/media/janma branches: lint/type or module errors; their useful work was subsequently integrated/superseded.

No current BUILDING or QUEUED deployment remained at scan time.

## Supabase state

- Project: `pxlsmxbpgdfzjzuqtict`
- Tool backend routes already live in `router`.
- Security migration `20260928150257_security_hardening_client_privileges` is already in the production migration ledger.
- Do not reapply that migration during Vercel deployment.

## Morning release gate

Before merging this bundle to main:
1. Require Build, Utility Platform CI, Patro Tools CI, and Security/build checks to be green.
2. Confirm Vercel daily build quota accepts a deployment.
3. Merge this bundle to `main` once.
4. Verify the new production deployment reaches READY and `patro-blush.vercel.app` points to that commit.
5. Smoke-test /, /tools, all Patro Tools pages, /fm, /tv, /jyotish, /rashifal/aries/aaja, /on-this-day and /astro.
6. If Vercel quota is still blocked, do not make no-op commits; keep this bundle unchanged and report the blocker.


## On This Day live hotfix — 2026-09-29

Production incident reproduced on the public URL:
- page renderer emitted invalid inline JavaScript quoting
- renderer called `/api/on-this-day?date=MM-DD`, while the live API requires `month` and `day`
- underlying API/data remained healthy (15 records for 09-29)

Immediate workaround deployed directly to Supabase `nepal-miti-protected` version 130, without a Vercel build:
- valid DOM-based client renderer (no unsafe HTML concatenation)
- Nepal-time date selection
- correct `?month=&day=` API contract
- `cache-control: no-store` during recovery

This fixed source must be preserved in the Vercel morning bundle.
