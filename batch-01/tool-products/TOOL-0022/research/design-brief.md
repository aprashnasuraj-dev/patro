# TOOL-0022 — GitHub Actions to GitLab CI Converter

## Job to be done
Produce a GitLab CI draft for a strict subset of GitHub Actions jobs with explicit unsupported-feature findings.

## Unique experience
Pipeline migration map: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: stageName.

## Input and result contract
GitHub Actions workflow YAML. Output `gitlab-ci.yml`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Not semantically equivalent for marketplace actions, permissions, secrets, matrices, expression contexts, caches or triggers. Requires manual credentials and runtime review.

## Authorities
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.gitlab.com/ci/yaml/

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
