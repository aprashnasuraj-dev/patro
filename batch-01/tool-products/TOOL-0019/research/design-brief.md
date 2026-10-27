# TOOL-0019 — package-lock.json Duplicate Dependency Finder

## Job to be done
Report package versions appearing at multiple package-lock v2/v3 locations and expose path-level evidence.

## Unique experience
Dependency version atlas: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: minLocations.

## Input and result contract
npm package-lock.json v2 or v3. Output `dependency-duplicates.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Multiple versions of the same package are not automatically a vulnerability or redundant install; deduplication can break semver constraints.

## Authorities
- https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
