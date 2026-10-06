# Aafnai Patro Janma Patro integration

## Zero-origin rule

Janma Patro and Guna Milan are deterministic, user-input calculations. **Normal calculate, recalculate, restore and share flows must not read or write D1 or R2.** Birth details are also inappropriate for a shared CDN response cache because cache keys or server logs could retain personal input.

Use this data plane instead:

1. Static application/engine assets are shipped with the normal Aafnai Patro build and served by Cloudflare's asset/CDN layer.
2. Calculations execute in the browser from the bundled engine and reference constants.
3. An explicit Share action serializes the normalized input with `packages/engine/src/share-state.js` into the URL fragment (`#jp=v1...`). URL fragments are not transmitted in HTTP requests, so the Worker, CDN request logs, D1 and R2 do not receive the birth payload.
4. Opening a share URL restores the fragment in the browser and recomputes the report locally.
5. PDF/JPEG/print exports are produced from the already-rendered report in the browser.

This is both cheaper and more private than `request -> Worker -> cache -> D1/R2`. There is no origin miss to pay for: the calculation path has no origin dependency at all.

## Intended mounts

- `/janmapatro/` — Janma Patro
- `/janmapatro/milan.html` — Guna Milan
- `/jyotish/china` — compatibility mount to the same Janma Patro UI
- `/jyotish/matchmaking` — compatibility mount to the same Guna Milan UI

There must be **no `/janmapatro/api/*` save/share dependency** and no `JP_STORE` requirement for this module.

## Engine boundary

`packages/engine/src` is the browser calculation boundary. Renderers such as `renderJanmaPatroHTML`, `renderMilanHTML`, `renderChartSVG` and `PATRO_CSS` may be wired once their validated source is present on the branch. Do not replace validated Jyotish calculation output with a server-side approximation merely to fit the hosting model.

The current repository branch contains the bilingual reference constants and the zero-storage share codec. The previously documented claim that the full validated renderer/calculation bundle had already been integrated was not supported by the branch contents and must not be treated as release evidence.

## Cache/CDN policy

| Surface | Runtime source | D1 reads | R2 reads | Shared CDN cache |
| --- | --- | ---: | ---: | --- |
| JS/CSS/fonts/reference assets | Cloudflare static assets/CDN | 0 | 0 | Yes, immutable/versioned |
| Janma calculation | Browser engine | 0 | 0 | Not needed |
| Guna Milan calculation | Browser engine | 0 | 0 | Not needed |
| Share/restore | URL fragment + browser engine | 0 | 0 | No personal result cache |
| PDF/JPEG/print | Browser | 0 | 0 | Not needed |

Counterexample: if a future feature requires a server-generated, revocable share ID or cross-device private account history, some durable storage is inherently required. That should be a separate opt-in feature with explicit retention/privacy semantics; it must not be placed on the normal calculation path.

## Guardrails

- Keep share payloads below 8 KiB decoded and reject malformed/unsupported versions.
- Never copy `location.hash` into analytics, logs, error telemetry, request headers or query parameters.
- Never put birth details into CDN cache keys or public GET query strings.
- Treat the fragment as user-visible data: a recipient of the link can read it even though the server cannot.
- Keep calculation output deterministic for a given engine/reference-data version so a shared input can be recomputed without stored results.

Verification command for the codec:

```bash
node --test tests/janmapatro-share-state.test.mjs
```
