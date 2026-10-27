# TOOL-0023 — GitLab CI to GitHub Actions Converter

## Job to be done
Translate a narrow subset of GitLab CI jobs into a GitHub Actions draft, without executing arbitrary scripts.

## Unique experience
Job portability studio: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: workflowName.

## Input and result contract
GitLab CI YAML with simple script jobs. Output `workflow.yml`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Rules, needs, include, extends, artifacts, service containers, protected variables, environments and GitLab runners are not portable without manual migration.

## Authorities
- https://docs.gitlab.com/ci/yaml/
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
