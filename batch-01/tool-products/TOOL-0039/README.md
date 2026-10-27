# TOOL-0039 · PEM Certificate Chain Order Checker

Private, static HTTPS browser utility. **No backend, no Git/Cloudflare Worker dependency, no certificate uploads.**

## Static integration

Copy the full `TOOL-0039/` directory into the web app assets and serve `page.html` under the reserved route `/tools/certificate-chain-order-checker` through the existing static router. The page loads `dist/ui.js` and `src/styles.css`. The TypeScript ESM outputs in `dist/` are included; a build is not required for a static deploy. Build at integration only if modifying `src/*.ts`. Do not publish before browser QA.

To reproduce on a development machine with Node >=22 and TypeScript 5.8.3:

```sh
npm install
npm run typecheck
npm test
```

`npm test` builds then executes 19 dependency-free Node test cases (`node --test`).

## Correctness boundaries

- Supply leaf certificate first, followed by intermediate(s) and optionally root. Most web servers should omit the root, which is fine: the topmost issuer is then unavailable for local verification.
- Parses X.509 DER in strict PEM armor and verifies each adjacent child signature with the next issuer's SPKI via native `crypto.subtle`.
- Supports RSA PKCS#1 v1.5 SHA-1/256/384/512, RSA-PSS when MGF1 digest equals message digest, ECDSA named curves P-256/384/521, and Ed25519 where available.
- Verifies CA basic constraints and keyCertSign when the issuer's keyUsage exists; checks simple subordinate non-self-issued CA path length and AKI/SKI when both IDs exist.
- Uses strict DER equality for subject/issuer names, not all RFC 5280 distinguished-name normalization rules. Unrecognized critical extensions and algorithms explicitly block verified status.
- Does not establish chain trust, hostname/SAN, extended key usage, revocation, certificate policies, name constraints, trusted root, or browser/TLS acceptance. Signature success is not proof of security.

## Local validation status

- TypeScript typecheck and ESM build: pass.
- Node tests: 19 pass, 0 fail.
- OpenSSL positive chain verification for RSA/ECDSA/Ed25519/RSA-PSS, negative signature test: pass.
- Chromium/browser UI tests: **blocked by test environment** (`ERR_BLOCKED_BY_ADMINISTRATOR` for localhost and file URLs); not claimed passed.
- Release status: **TEST_PARTIAL_BROWSER_QA_PENDING**, publication gate locked.

The fixtures include public certificates only. No private keys are bundled. Browser normal operation requires HTTPS or a local secure context for WebCrypto.
