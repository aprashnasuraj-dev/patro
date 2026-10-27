# TOOL-0025 — Nginx Location Block Match Tester

## Job to be done
Simulate selection among simple Nginx location directives and explain exact/prefix/regex precedence.

## Unique experience
Route precedence debugger: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: uri.

## Input and result contract
Nginx location snippets. Output `nginx-location-result.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
This models documented initial location selection only, not nested locations, rewrite/internal redirects, named locations or upstream runtime configuration.

## Authorities
- https://nginx.org/en/docs/http/ngx_http_core_module.html#location

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
