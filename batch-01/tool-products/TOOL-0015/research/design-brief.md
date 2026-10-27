# TOOL-0015 — JSONL / NDJSON to JSON Array Converter

## Job to be done
Convert line-delimited JSON records into one JSON array without skipping malformed lines.

## Unique experience
Record stream organizer: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: ignoreBlank.

## Input and result contract
One JSON value per nonblank line. Output `records.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Parsing uses a bounded in-browser string; very large NDJSON files require a streaming integration. Empty lines optionally ignored.

## Authorities
- https://jsonlines.org/
- https://www.rfc-editor.org/rfc/rfc8259

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
