# MM530 Phase 3 repair clusters

| Cluster | Root cause | Tools | Proposed shared fix | Risk |
|---|---|---:|---|---|
| compile:escaped-newline-source | Generator emitted literal \\n separators outside strings | 25 | Normalize only code-boundary literal newline tokens; compile whole family | low |
| compile:construction-finite-export | Shared construction helper imports but does not re-export finite | 18 | Re-export the existing finite validator from each copied family helper; no formula change | low |
| compile:malformed-line-split-regex | Generation corrupted CRLF/LF split regex | 7 | Restore /\\r?\\n/ and preserve parsing semantics | medium |
| compile:missing-call-close | Generated UI lost one closing call parenthesis | 5 | Restore missing parenthesis only; no behavior weakening | medium |
| compile:try-brace | Generated UI has a misplaced brace before catch | 1 | Restore intended try/catch structure | medium |
| compile:shared-helper-brace | Copied shared helper has brace imbalance | 4 | Repair shared helper syntax and recompile affected family | medium |
| compile:missing-eff-wordlist-asset | Exact EFF 7,776-word build asset intentionally absent | 1 | Keep documented blocker; do not invent/substitute wordlist | high-data-review |
| compile:missing-xlsx-build-asset | Self-hosted spreadsheet parser bundle absent | 1 | Pin/verify local parser before wiring; otherwise documented blocker | medium-build |
| compile:missing-mathjax-build-asset | Self-hosted MathJax SVG bundle absent | 1 | Pin/verify local MathJax component before wiring; otherwise documented blocker | medium-build |
| compile:computed-property-syntax | Template literal used as invalid object property syntax | 1 | Use a valid computed key only | low |
| compile:reserved-identifier | Reserved identifier used as local variable | 1 | Rename local variable without changing calculation | low |
| unit:known-five | Five current Node test contract failures | 5 | Repair result contract, validation copy and whole-input resource bounds without weakening assertions. | low |
| ui:mobile-overflow | 81 source-stage pages overflow at 375px across shared template families | 81 | One reusable shell containment layer; verify 360/390/768 without per-page mobile hacks. | medium |
| dependency:commonmark | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:fonteditor-core | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:exifr | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:libheif-js | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | license-review |
| dependency:@jsquash/avif | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:blurhash | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:thumbhash | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:gifenc | External import not normalized into exact dependency metadata | 2 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:upng-js | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:pdf-lib | External import not normalized into exact dependency metadata | 7 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:pdfjs-dist | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:fflate | External import not normalized into exact dependency metadata | 3 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:jsbarcode | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:qr | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:@noble/hashes | External import not normalized into exact dependency metadata | 2 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:argon2-browser | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | license-review |
| dependency:bcryptjs | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:@zxing/browser | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |
| dependency:sql.js | External import not normalized into exact dependency metadata | 1 | Declare exact version, purpose, license, lazy/local-runtime metadata; flag licensing concerns. | low |

Phase 1 no-regression and Phase 2 identity/source gates remain in force. Production Vite/Cloudflare integration remains BLOCKED.
