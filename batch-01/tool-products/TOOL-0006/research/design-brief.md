# TOOL-0006 — HAR File Sensitive Data Redactor

## Job
Strip potentially sensitive HAR fields before support sharing

## Design
Make HAR diagnostics safer to share. Privacy-first reconstruction keeps timing and status metrics while discarding URLs, cookies, headers, request bodies and unknown extension fields.

UI differentiation: Remove unknown fields · preserve latency diagnostics · privacy warning. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
HAR 1.2 JSON, up to 500 entries.

## Assumptions and limitations
Even stripped network timing/status data can reveal traffic patterns. Do not treat automated redaction as a legal data de-identification guarantee.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://w3c.github.io/web-performance/specs/HAR/Overview.html
- https://github.com/ahmadnassri/har-spec/blob/master/versions/1.2.md
