# TOOL-0003 — OpenAPI YAML to TypeScript Interfaces

## Job
Trace component schemas into reviewable TypeScript

## Design
Move from OpenAPI contracts to safe TypeScript types. Paste an OpenAPI 3.x YAML document to generate typed component declarations. Unsupported external references stop conversion.

UI differentiation: Contract-first · local reference resolution · strict limits. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
OpenAPI 3.0/3.1; YAML 1.2; local #/components/schemas references.

## Assumptions and limitations
This is a type generator, not a complete OpenAPI SDK; constraints such as minimum, pattern and format are not enforced at runtime.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://spec.openapis.org/oas/v3.1
- https://learn.openapis.org/upgrading/v3.0-to-v3.1.html
- https://yaml.org/spec/1.2/
