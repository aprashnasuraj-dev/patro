# TOOL-0017 — Terraform tfvars to JSON Converter

## Job to be done
Convert a deliberately bounded literal HCL tfvars subset into terraform.tfvars.json.

## Unique experience
Infrastructure variable editor: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: pretty.

## Input and result contract
Literal native .tfvars assignments. Output `terraform.tfvars.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
HCL expressions, interpolation, function calls and complex block syntax are rejected. Comments supported; source credentials remain only in your browser.

## Authorities
- https://developer.hashicorp.com/terraform/language/values/variables
- https://developer.hashicorp.com/terraform/language/syntax/json

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
