# Batch 03 shared browser primitives
These modules are intentionally small and dependency-light. Heavy parsers/codecs are imported only by routes that need them. No shared primitive performs network transmission. Integrators must bundle `pdf-lib`, `pdfjs-dist`, `fflate`, and any tool-specific codecs locally under the application CSP.
