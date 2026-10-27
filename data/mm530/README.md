# MM530 canonical inventory

Generated from verified Phase 2 workflow run 40439401859 at source commit 38897382ed34167cddbc0620b1d7bbb33472f082.

- canonical-tools-v1.json: durable normalized index for TOOL-0001..TOOL-0530.
- inventory-summary.json: Phase 2 hard-gate results.
- inventory-issues.json: explicit review queues; these are not silently treated as PASS.
- phase2-summary.md: concise generated summary.

Canonical index SHA-256: 2e367c3d89d2bed263830037ec881ffa8c8edec8c554389dad564c47cfa42521.

This inventory does not publish routes or change tool behavior.

## Cross-phase user requirements

- Phase 7/8 information architecture must provide category-first discovery for the 530-tool fleet. The dashboard may span multiple hub/category pages, but dashboard/hub pages must not be nested in the individual tool namespace as `/tools/<dashboard>` (or equivalent `/tool/<dashboard>`). Phase 7 must reserve collision-free discovery routes; Phase 8 must integrate the dashboard through the shared React/Vite adapter rather than 530 hand-maintained pages.
- Future integration is English-first. Preserve existing AafnaiPatro language behavior, but do not add blanket Nepali translations, Nepali-digit formatting, or duplicated bilingual copy to MM530 tools. Add localized copy/number formatting only where an existing feature or a tool-specific domain requirement genuinely needs it and the content is actually supported.
