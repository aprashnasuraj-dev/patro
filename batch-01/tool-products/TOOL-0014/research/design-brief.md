# TOOL-0014 — MongoDB Extended JSON to Plain JSON

## Job to be done
Normalize Extended JSON v2 markers while explicitly preserving non-JSON BSON types in tagged wrappers.

## Unique experience
BSON shape inspector: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: mode.

## Input and result contract
Extended JSON v2 document. Output `plain-json.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Plain JSON cannot preserve all BSON type semantics. Wrapper mode retains BSON markers as strings/tags; unrecognized markers stay unchanged and are warned about.

## Authorities
- https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- https://www.mongodb.com/docs/manual/reference/bson-types/

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
