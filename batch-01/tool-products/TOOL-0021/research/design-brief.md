# TOOL-0021 — Kubernetes CPU and Memory Units Converter

## Job to be done
Convert Kubernetes CPU and memory quantity syntax into explicit cores, millicores, bytes and IEC/SI units.

## Unique experience
Resource quantity explorer: domain-aware field arrangement, example, bounded input, immediate result evidence and accessible output. Tool-specific controls: precision.

## Input and result contract
One resource per line: cpu= or memory=. Output `k8s-quantities.json`; robust, deterministic processing of documented subset; explicit errors for invalid and unsupported cases. Local-first browser execution; no file upload.

## Critical limitations
Kubernetes resource quantities are decimal fixed-point or binary SI, not ordinary human-language units. Values can be extremely large; precision is preserved with integer/fraction arithmetic where feasible.

## Authorities
- https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/quantity/
- https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Integration concerns
Read-only static HTML must be served alongside lazy-imported `src/ui.ts`; provide `tool-products/_shared/workbench.ts` and shared styles without importing unrelated tools. No runtime proof in this staging stage.
