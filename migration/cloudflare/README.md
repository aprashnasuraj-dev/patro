# Cloudflare migration snapshot — 2026-09-30

Source systems:
- Supabase project `pxlsmxbpgdfzjzuqtict` (`nepali-calendar`, PostgreSQL 17, ap-south-1)
- Vercel project `prj_MgvAT0zpe4JsrJDTHhpXgcgJLyov`, team `team_CRsXSWBw5O8e3d9Un3xGAFqZ`
- GitHub `aprashnasuraj-dev/patro`

This directory records the live migration state recovered from Supabase and Vercel.

Included here:
- exact Supabase migration history
- current public-schema table/column/PK/FK inventory
- current public database function definitions
- complete Edge Function deployment/version/hash manifest
- active deployed Edge Function source snapshot
- commit-safe application datasets
- Vercel production deployment metadata

Because this repository is public, proprietary calendar rows, private user rows, authentication/session records, vault contents, rate-limit state, and live credential values are deliberately not committed. The inventory identifies those resources so they can be transferred through a private migration channel.

Important live-state findings:
- live `nepal-miti-protected` is version 130, while the root repo path was empty
- canonical `router` is version 54
- Supabase has 70 Edge Function deployments representing 62 unique source hashes
- legacy `nepal-miti-api` contains an embedded access credential; its public snapshot is redacted and that credential should be rotated before cutover
- Supabase Storage currently has no application bucket/object payload to migrate

Cloudflare mapping:
- static Vercel assets -> Cloudflare Pages / Workers Static Assets
- rewrites and headers -> Cloudflare Worker routing/headers
- Supabase Edge Functions -> Cloudflare Workers
- Vercel cron -> Cloudflare Cron Trigger
- PostgreSQL -> external PostgreSQL + Hyperdrive if PostgreSQL behavior must remain unchanged; D1 requires schema/query adaptation

At cutover, verify table counts, active function versions/hashes, private-data transfer, runtime configuration, and all routes in root `vercel.json`.
