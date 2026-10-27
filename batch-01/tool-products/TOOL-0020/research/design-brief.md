# TOOL-0020 — Semantic JSON Diff (Ignore Key and Array Order)

## Job to be done
Compare JSON documents by deep semantics: unordered object keys and optionally unordered arrays with duplicate counts preserved.

## Unique experience
Structure comparison: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: ignoreArrayOrder.

## Input and result contract
Two JSON values separated by a line of ---JSON-DIFF---. Output `semantic-diff.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Unordered arrays implement multiset semantics (duplicates matter); array sorting may erase meaningful sequence semantics. Large nested values are bounded to prevent resource exhaustion.

## Authorities
- https://www.rfc-editor.org/rfc/rfc8259

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
