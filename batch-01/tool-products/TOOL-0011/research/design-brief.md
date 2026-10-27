# TOOL-0011 — Cron to GitHub Actions Schedule Generator

## Job to be done
Validate POSIX cron expressions and draft a GitHub Actions workflow without external services.

## Unique experience
Schedule laboratory: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: workflowName, timezone.

## Input and result contract
Cron schedule: minute hour day month weekday. Output `schedule.yml`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Only five-field cron, numeric ranges/lists/steps; no Quartz seconds. GitHub schedules may be delayed or skipped under load. Timezone uses supported IANA names.

## Authorities
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://en.wikipedia.org/wiki/Cron

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
