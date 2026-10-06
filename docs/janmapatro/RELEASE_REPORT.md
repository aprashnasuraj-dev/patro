# Aafnai Patro — Janma Patro / Guna Milan branch report

Date: 2026-10-06
Branch: `feature/janmapatro-gunamilan`

## Verified branch state

The branch audit found that the repository did **not** yet contain the full Janma Patro/Guna Milan engine/UI described by the previous report. At audit time, `packages/engine/src` contained only `constants.js`. Therefore earlier statements about a completed renderer integration, 20/20 bundle tests, PDF/JPEG controls, R2 save/delete APIs and sample horoscope outputs are not accepted as proof of the current branch state.

## Implemented in the current continuation

- Kept the bilingual Jyotish reference constants already present in `packages/engine/src/constants.js`.
- Added `packages/engine/src/share-state.js`, a deterministic, versioned, browser-only share codec.
- Share links carry normalized state in `#jp=v1...`; the fragment is not sent to the Worker or origin.
- Added strict JSON/value/depth/size validation and an 8 KiB decoded payload ceiling.
- Added `tests/janmapatro-share-state.test.mjs` covering Unicode round-trip, deterministic encoding, fragment-only sharing, malformed input, cycles/non-finite values and oversize rejection.
- Removed the architectural dependency on `/janmapatro/api/*` and `JP_STORE` for normal save/share behavior.
- Set the module rule to **0 D1 reads + 0 R2 reads for calculate/recalculate/share/restore**. Static engine/UI files should be delivered through Cloudflare assets/CDN; reports should be computed in the browser.

## Why this replaces the old R2 save/share design

A cache cannot guarantee zero origin reads: a new Cloudflare colo, an eviction or a new cache key can miss. For a deterministic personal calculation, client-side execution is stronger than another cache layer because there is no origin request to miss. It also avoids placing birth details in shared CDN cache keys or server logs.

The tradeoff is that fragment links are not server-readable, so the server cannot create result-specific Open Graph previews from the private payload. That is intentional for the zero-origin/private path. A future server-readable share-ID service would require explicit storage and should remain opt-in and separate from calculation.

## Remaining work before production merge

1. Add the validated calculation/rendering files (`renderJanmaPatroHTML`, `renderMilanHTML`, `renderChartSVG`, `PATRO_CSS`, ephemeris/calculation modules) to the branch; they are not currently present.
2. Wire the intended mounts: `/janmapatro/`, `/janmapatro/milan.html`, `/jyotish/china`, `/jyotish/matchmaking`.
3. Connect Share/Restore UI to `share-state.js` and ensure no telemetry copies the hash.
4. Add browser/mobile/print regression coverage against the real renderer output.
5. Run the full repository release gates after the actual engine/UI files are present.

## Verification

Codec contract:

```bash
node --test tests/janmapatro-share-state.test.mjs
```

The feature must not be marked fully released until the missing validated engine/UI source is actually committed and tested on this branch.
