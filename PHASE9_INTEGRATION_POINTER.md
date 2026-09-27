# Nepal Miti Phase 9 integration pointer

This branch intentionally does **not** contain the private Nepal Miti source bundle, proprietary calendar master data, Panchang archives, or protected Supabase Edge Function source.

## Protected live baseline

- Vercel production rollback point: `dpl_AYMDMDmRjr569KEkrsoQLfj65GTY`
- Production Git commit: `38d6900036eab74158d56c698198bf98c89dc2e4`
- Supabase project: `pxlsmxbpgdfzjzuqtict`
- Protected Edge Function: `nepal-miti-protected` v73
- Protected function SHA-256: `4ece4fd31e81fffd5390d009d8d996176672bab18d7b371c5fa23187ef05b1ea`
- Latest Drive full source backup found before this integration: 2026-09-26, protected source v52 (regression reference only)

## Phase 9 source handling

The implementation source is maintained as a private integration bundle. The public repository remains a thin Vercel proxy so the protected backend and master datasets are not exposed.

The private Phase 9 integration uses Path A from the supplied integration instructions because this repository is not a Next.js source application. It adds a Next.js fallback bridge so unported routes continue to resolve to the current v73 protected backend while Phase 9 routes take precedence.

## Production safety

No production database migration and no production deployment is authorized by the supplied bundle defaults (`PROD_DB_MIGRATIONS_ALLOWED=false`, `PROD_DEPLOY_ALLOWED=false`). This branch therefore does not alter production routing or aliases.
