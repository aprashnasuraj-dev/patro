# TOOL-0024 — Dockerfile Linter and Layer Cache Advisor

## Job to be done
Review Dockerfile directives for common cache inefficiencies and safety concerns with line-specific citations.

## Unique experience
Layer risk review: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: strict.

## Input and result contract
Dockerfile text. Output `dockerfile-advice.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Heuristics are advisory and not a Dockerfile parser, security scanner or vulnerability database. Results depend on build context and multi-stage design.

## Authorities
- https://docs.docker.com/build/cache/optimize/
- https://docs.docker.com/reference/dockerfile/
- https://docs.docker.com/build/building/best-practices/

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
