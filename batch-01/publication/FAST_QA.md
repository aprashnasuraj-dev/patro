# Efficient verification after your manual Git import

**No product QA was executed while packaging.** The scripts below are designed for *after* all ten batch directories exist in the Git workspace.

## 0. Static integrity, no dependencies (< 1 minute typical)
`node batch-01/publication/verify-import.mjs --quick`

This checks 530 unique IDs and proposed hyphenated routes, allocated batches, source folders, semantic links, JSON parseability and intake contract. `--hash` adds SHA-256 verification of the packaged file manifest (more I/O).

## 1. Fast syntax/bundle preflight in Git workspace
`node batch-01/publication/verify-import.mjs --compile`

Requires **locally installed** `esbuild` resolution; this command does not install anything or fetch from the network. Compiles `src/core.ts` and `src/ui.ts` if present with each helper-scoped entry in memory, bounded concurrency. Records **PASS, FAIL, or NOT_RUN**, never converts missing prerequisites to pass.

## 2. Unit fixtures, authoritative calculations

Use the actual repository's installed Vitest and Node version. Tests differ by checkpoint (`core.test.ts`, `core.spec.ts`, `deferred.test.mjs`), so only run suites compatible with the current runner; list unsupported suites as NOT_RUN. Group by category so one bad package does not block observing the rest. Prefer `npm exec --offline -- vitest run <specific test paths>` for Vitest files or `node --test <specific .mjs>` for native Node test suites; **do not install dependencies automatically**. Verify expected results with dated specifications and boundary cases before declaring PASS.

## 3. Browser smoke (representative -> then full)

Use the **integrated Patro preview** and Playwright already installed in that repository. Per test: load the actual public-style canonical route in staging; assert semantic H1, one functioning input, one changing non-empty output, one example result, no console errors or failed chunks; exercise keyboard focus, zero/invalid input, mobile 375px viewport, dark mode, copy/download if offered, and one related tool link. If a page does not compute, mark BLOCKED; no mock output.

## 4. Release blockers that require human review

- Finance/tax/regulatory formulas have as-of dates, jurisdiction and policy sources; review updated laws.
- Security parsers/file tools need malformed input & memory stress tests.
- 0527 NPF formula licensing requires permission review before commercial publication.
- Medical and health pages require honest non-clinical scope and safe bounds.
- Navigation, redirects, sitemaps, analytics and existing AafnaiPatro routes require regression checks in site repository.

## Fast triage model

Never run an unbounded full test suite to discover a single syntax error. Run static manifest first, compile with capped concurrency, then category fixture subsets, browser smoke 10–25 pages, and full regression only for the accepted promotion wave. Maintain a machine-readable status receipt for every tested ID. One red gate prevents publication **only for that tool/critical shared infrastructure**, not unrelated verified modules.
