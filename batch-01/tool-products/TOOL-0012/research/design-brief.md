# TOOL-0012 — CSV to SQL CREATE TABLE (Type-Inferred)

## Job to be done
Profile CSV columns and generate PostgreSQL 18 DDL with conservative SQL types.

## Unique experience
Data profiling studio: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: tableName.

## Input and result contract
CSV with a header row. Output `create_table.sql`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Sample-based inference does not prove constraints or future values; defaults to nullable types and no automatically inferred primary keys. PostgreSQL DDL review required.

## Authorities
- https://www.rfc-editor.org/rfc/rfc4180
- https://www.postgresql.org/docs/current/datatype.html
- https://www.postgresql.org/docs/current/sql-createtable.html

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
