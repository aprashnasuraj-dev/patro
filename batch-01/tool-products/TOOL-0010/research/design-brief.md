# TOOL-0010 — Docker Compose to docker run Converter

## Job
Map safe Compose service fields into inspectable docker run commands

## Design
Extract standalone docker run commands from Compose. Only plain image-based services with compatible fields are converted; unsupported orchestration semantics stop generation.

UI differentiation: Strict compatibility · service-aware warnings · no execution. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
Compose YAML services (supported subset); Docker CLI run syntax.

## Assumptions and limitations
Multiple-container networking, resource orchestration, depends_on, health checks and advanced volumes are not equivalent to plain docker run.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://docs.docker.com/reference/compose-file/services/
- https://compose-spec.io/
- https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
