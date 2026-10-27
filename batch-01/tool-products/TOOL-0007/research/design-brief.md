# TOOL-0007 — HAR to cURL Bulk Converter

## Job
Create inspectable curl commands from recorded HAR requests

## Design
Turn captured HTTP traffic into reviewable curl scripts. Generates quoted POSIX commands without executing them. Authentication is removed unless intentionally reintroduced outside this tool.

UI differentiation: No command execution · secret-safe defaults · shell quoting. Dedicated results stats, editable sample, local file read where relevant, distinct accessible grouping, warning disclosure, output copy and download.

## Source boundaries
HAR 1.2 JSON; curl POSIX shell drafts.

## Assumptions and limitations
Security tokens, replay-order dependencies, cookies, multipart/binary bodies and browser session state are not automatically reconstructed.

## Attack surface
Malformed inputs, excessive nesting/size, unknown syntax, generated text control injection, privacy leakage through exports. Codes use bounded inputs, textContent rendering and conservative conversion. Actual effectiveness is NOT TESTED.

## References
- https://curl.se/docs/manpage.html
- https://w3c.github.io/web-performance/specs/HAR/Overview.html
