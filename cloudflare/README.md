# Cloudflare production target

This directory contains the reproducible Cloudflare data/runtime support for Aafnai Patro. The supported production deployment is a single Cloudflare Worker with Workers Static Assets and D1.

## Canonical topology

- Worker: `patro`
- Worker source: `worker/connected-entry.ts`
- Wrangler source of truth: `wrangler.jsonc`
- Frontend: React/Vite output in `./dist`, served through the Worker `ASSETS` binding
- Database: Cloudflare D1 binding `DB`
- Production domain: `https://aafnaipatro.com`
- Preview URLs: disabled
- KV binding `CACHE`: optional; never required for first deploy or correctness

There is no supported Cloudflare Pages routing layer, Pages Functions proxy, `PATRO_API` binding, or deployment wrapper in the production path.

## Runtime ownership

Cloudflare owns the application critical path: calendar/conversion APIs, astronomy/panchang, Community calendars, Time Machine, On This Day, Rashifal/Jyotish, personal/private state, tools, PWA/static assets and the production API surface.

Supabase compatibility is deliberately restricted to Worker-side TV, FM and Samachar transition traffic. No other feature may depend on Supabase for a successful production request.

Rashifal is native/bundle-only. It does not require a seeded D1 or Supabase publication table.

## Canonical public snapshot

The deterministic public D1 snapshot is generated and verified from committed sources. Important release invariants include:

- `time_machine_moments`: exactly **706** records
- astronomy snapshot: 77,070 contiguous records covering 1826-04-11 through 2037-04-13
- Rashifal publication rows: not a required snapshot/bootstrap contract
- `market_snapshots`/NEPSE: not a required bootstrap, doctor or release contract
- private/user rows: excluded from the public snapshot

## Repository validation

Before connecting or deploying Cloudflare resources:

```bash
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund
npm run release:verify
```

The release gate covers the production build, type checking, product/tool/community contracts, deterministic data checks, Worker dry-run, direct-route output, mobile checks, SEO/accessibility/performance gates and deployment-boundary contracts.

## Git-linked Worker deployment

Connect the repository as a Worker build with:

- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config wrangler.jsonc`

The normal deploy is intentionally stateless with respect to D1: it does not run migrations, seed content or require optional KV before deploying the Worker.

## D1 bootstrap/recovery

For a genuinely new or empty D1 database, explicit operator tooling remains available:

```bash
npm run deploy:cloudflare:bootstrap
```

Bootstrap/recovery is separate from Cloudflare Builds. Existing populated D1 databases must never be bulk-reseeded. Generated import/config artifacts are local operational files and are not committed.

## Selective compatibility and rollback

`cloudflare/remaining-cutover.json` records the remaining transition boundary. Only TV, FM and Samachar may use `SUPABASE_COMPAT_ORIGIN`; browser code and all other Worker routes must stay Cloudflare-native/local-first.

Do not remove rollback infrastructure until production traffic has been observed and the permitted TV/FM/Samachar compatibility traffic is understood or eliminated. This rollback policy does not place Supabase or Vercel on the normal application critical path.

## SEO and canonical host

SEO is generated from Git as part of `npm run build`.

- Production canonical: `https://aafnaipatro.com`
- `scripts/generate-seo.mjs` writes crawl/discovery assets.
- The Worker serves exact prerendered public route HTML before SPA fallback where applicable.
- SPA navigation updates metadata through the React SEO layer.
- Historical calendar archives use staged indexing rather than fabricated daily facts.

## Source preservation

Historical Supabase source/conversion artifacts may remain under migration/archive directories for audit and rollback history. Their presence is not a runtime dependency. Production compatibility is enforced by the Worker allow-list and release contracts, not by those archived files.
