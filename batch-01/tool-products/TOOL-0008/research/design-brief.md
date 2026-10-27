# TOOL-0008 — Postman Collection to Markdown Docs

## Job
Document Postman requests without disclosing auth content

## Design
Turn a Postman collection into a structured API handbook. Recursive folder-aware Markdown export focusing on request metadata and endpoint structure, excluding secrets and scripts.

UI differentiation: Request catalog · folder hierarchy · default redaction. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
Postman collection JSON v2.0/v2.1; Markdown.

## Assumptions and limitations
Postman v3 folder-based exports are not supported. Auth tokens, response examples, scripts and request bodies are intentionally omitted.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://schema.postman.com/
- https://learning.postman.com/docs/use/use-collections/collections-schemas/
