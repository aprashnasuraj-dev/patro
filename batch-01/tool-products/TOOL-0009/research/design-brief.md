# TOOL-0009 — .env to Kubernetes Secret YAML

## Job
Encode literal .env assignments as a Kubernetes Opaque Secret manifest

## Design
Convert a local .env file into Kubernetes Secret YAML. Generate clear base64-encoded data and visibly warn that base64 does not encrypt anything.

UI differentiation: No uploads · base64 is not encryption · namespace-aware. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
Literal .env; Kubernetes v1 Secret Opaque YAML.

## Assumptions and limitations
This converter does not evaluate shell variables. Kubernetes Secrets are not encrypted simply because values are base64 encoded. Avoid committing manifests containing real credentials.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- https://kubernetes.io/docs/concepts/configuration/secret/
