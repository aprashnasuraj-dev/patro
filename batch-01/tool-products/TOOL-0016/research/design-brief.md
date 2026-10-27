# TOOL-0016 — Nginx / Apache Access Log to CSV

## Job to be done
Parse Common and Combined access log records into structured CSV with malformed line reporting.

## Unique experience
Traffic log analyzer: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: strict.

## Input and result contract
Apache/Nginx common or combined access logs. Output `access-log.csv`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Supports default CLF/Combined log formats, not custom log_format or JSON access logs. CSV values are quoted and spreadsheet-formula cells neutralized.

## Authorities
- https://httpd.apache.org/docs/current/logs.html
- https://nginx.org/en/docs/http/ngx_http_log_module.html

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
