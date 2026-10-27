# TOOL-0005 — JSON to Protobuf (.proto) Generator

## Job
Infer protobuf messages from a JSON sample

## Design
Build an editable proto3 message draft from JSON. Generate nested messages and sample-based scalar fields, with warnings about long-term field tag stability.

UI differentiation: Wire-format ID awareness · proto3 syntax · schema evolution caution. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
JSON input; Protocol Buffers proto3 message and field grammar.

## Assumptions and limitations
Sample inference cannot establish absent fields, int64 precision, enums, map intent or safe future field numbers; do not reorder tags after deployment.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://protobuf.dev/reference/protobuf/proto3-spec/
- https://protobuf.dev/programming-guides/editions/
