# V13 — Voice-filled applications

The lazy opt-in panel contains leave, recommendation and office request templates.
Each editable field can receive voice input. No dates, facts or approval are
invented. Review checkbox resets after edits. PDF uses the existing html2pdf.js
exporter and an HTML text preview (React escaping); no HTML input injection.
No persistence or network requests beyond explicitly requested transcription.

## Preserved behaviours
- [x] Existing voice editor and controls, routes, storage and account behaviour.
- [x] Calendar/archive/CSP unchanged; no new D1 reads.

## Validation and rollback
TypeScript and executable template contracts pass. Revert this item; no migration.
