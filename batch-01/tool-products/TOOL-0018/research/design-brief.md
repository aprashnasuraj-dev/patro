# TOOL-0018 — Helm values.yaml to --set Flags

## Job to be done
Flatten Helm values with safe --set-json flags, keeping booleans, arrays and strings distinct.

## Unique experience
Release override planner: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: releaseName.

## Input and result contract
Helm values.yaml (limited YAML subset). Output `helm-flags.sh`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Uses a YAML parser at integration time; --set-json requires compatible Helm. Shell fragments contain safely quoted literal values; secrets passed in CLI arguments can appear in process lists.

## Authorities
- https://helm.sh/docs/helm/helm_install/
- https://helm.sh/docs/helm/helm_upgrade/

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
