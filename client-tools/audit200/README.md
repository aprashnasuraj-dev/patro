# Audit200 browser-tool extension

This extension implements the 200 accepted browser-local opportunities from `aafnaipatro_200_net_new_browser_tools.csv` on the existing direct client-tool runtime.

## Contract

- Canonical leaf routes are the exact `/tool/<slug>` values from the audit CSV.
- Working values and files stay in the browser. No operation posts user data to an AafnaiPatro API or third-party service.
- Each tool uses the audit H1, SEO title, description, FAQ prompts, limitations, privacy text, expected input/output text and related-tool graph.
- Calculation/transformation logic lives in `client-tools/runtime/cores/audit200-core.mjs`; UI metadata lives in `audit200-specs.mjs`.
- The one shared `audit200` engine renders all 200 tools using the same existing client-tool shell and styles.
- Operations marked “Yes for large inputs” in the audit are dispatched to `audit200-worker.mjs` when Web Workers are available.
- A single input is capped at 64 MiB in the browser runtime to prevent accidental memory exhaustion.

## Deliberate bounded-format behavior

The audit includes several formats that can grow into full desktop applications. The initial browser-local implementations are intentionally bounded rather than pretending to support every variant:

- Shapefile conversion supports Point records in the zero-dependency path; polygon/polyline and DBF attribute joins are rejected/flagged rather than guessed.
- GeoPackage and Parquet tools inspect container/header/schema evidence locally; they do not ship a heavyweight database engine or claim arbitrary SQL execution.
- PDF page-label tooling builds/validates numbering maps and reports page evidence; it does not silently rewrite arbitrary compressed/object-stream PDFs.
- MP4 tools inspect top-level boxes and fast-start placement; deep GOP/keyframe tables are reported as outside the zero-dependency path.
- JPEG inspection is marker-level; detailed quantization coefficient and chroma-component decoding is explicitly limited.
- FIT inspection validates the container/header fields and returns metadata evidence; unknown record definitions are not rewritten.
- GZIP/Brotli/Zstd text tooling uses a deterministic local compressibility/entropy baseline rather than bundling three large codecs.
- Certificate/CSR comparison accepts pasted decoded subject/key markers in the lightweight path; it does not claim full ASN.1 verification.

These limits are visible in tool output/page limitations and are covered by tests so unsupported cases fail clearly rather than silently producing fabricated results.

## Verification

`npm run client-tools:test200` executes every operation with deterministic fixtures/defaults, includes edge-case assertions, and smoke-renders each of the 200 pages through the shared engine. Existing client-tool build, sitemap, dead-tool and Advanced Tools discovery gates are expanded from 350 to 550 direct pages while retaining the original 50-tool extension tests.
