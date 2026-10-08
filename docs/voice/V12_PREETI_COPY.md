# V12 — Voice transcript to Preeti

An additive copy button lazy-loads packages/core/src/preeti.ts. Unicode transcript,
ordinary Copy, Clear and spell-check handoff stay unchanged. Clipboard failures
are visible; Preeti font selection and visual review are required. Existing
converter mappings and their limitations are preserved. No new storage/network.

## Preserved behaviours
- [x] Existing transcript, controls, conversion engine and URLs/canonicals.
- [x] Existing storage, archive values, CSP and D1 request counts.

## Validation and rollback
TypeScript and executable conversion/Latin-preservation contracts pass.
Revert this item to remove the button; no migration or content rewrite.
