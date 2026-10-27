# TOOL-0013 — JSON to PostgreSQL Upsert Generator

## Job to be done
Generate reviewable parameter placeholders plus values manifest for PostgreSQL INSERT ON CONFLICT.

## Unique experience
Conflict plan builder: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: tableName, conflictKey.

## Input and result contract
JSON object or array of records. Output `upsert.sql`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Requires a real matching unique or exclusion constraint for conflict target. Generated placeholders are not interpolated SQL literals; bind parameter values in a trusted client.

## Authorities
- https://www.postgresql.org/docs/current/sql-insert.html
- https://www.postgresql.org/docs/current/sql-syntax-lexical.html

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
