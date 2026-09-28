# Nepali Utility Platform Architecture

## Release strategy

The live Patro application is currently Vite + React 19. This release keeps that runtime in place and adds the utility platform additively. A framework rewrite is not allowed to remove or regress existing calendar, Jyotish, FM, TV, Samachar, Time Machine, media-player, or Supabase-backed routes.

Next.js 16 SSG + Tailwind remains the target shell architecture, but the switch is gated behind full feature-parity tests. The pure `packages/core` domain package and Worker protocol are framework-independent, so they can be imported unchanged by the future Next.js shell.

## Active structure

```text
patro/
├─ packages/
│  └─ core/
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ src/
│        ├─ index.ts
│        ├─ preeti.ts
│        ├─ land.ts
│        ├─ tax.ts
│        └─ core.test.ts
├─ src/
│  ├─ utilities/
│  │  ├─ UtilitySuite.tsx
│  │  └─ worker.ts
│  ├─ utilities.css
│  ├─ PatroRouter.tsx
│  ├─ pwa.ts
│  └─ main.tsx
├─ public/
│  └─ sw.js
├─ .github/workflows/
│  └─ utility-platform-ci.yml
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ vercel.json
```

## Agent 1 — domain layer

### Preeti ⇄ Unicode

- Single forward scan with fixed-size lookup tables and contextual state.
- Handles the explicit `kshe → क्ष` alias.
- `{` is treated as reph state and emitted before the current consonant cluster.
- Visual short-i is relocated from legacy prefix position to Unicode post-consonant matra position.
- Strict Preeti keeps capital `I → क्ष्`; an explicit compatibility option supports keyboards that used capital I as a short-i alias.
- Reverse conversion tokenizes Unicode orthographic units, reorders reph/short-i, then applies longest-match legacy mappings.

### Land engine

All square-foot values use `BigInt` scaled by 1,000,000.

Exact anchors:

- 1 Ropani = 5,476 ft²
- 1 Aana = 342.25 ft²
- 1 Paisa = 85.5625 ft²
- 1 Dam = 21.390625 ft²
- 1 Bigha = 72,900 ft²
- 1 Kattha = 3,645 ft²
- 1 Dhur = 182.25 ft²

The final Dam/Dhur values remain scaled decimals so fractional units do not pass through IEEE-754 arithmetic.

### Tax core

The tax engine is policy-driven rather than hard-coding an FY label. It accepts versioned slabs, contribution caps, salary-fraction limits, and insurance exemptions. A specific Nepal FY policy must only be exposed after its authoritative slab table and deductions are versioned and verified.

## Agent 2 — UI, Worker, offline

- `/tools` is a native React route.
- Font and land calculations execute inside `src/utilities/worker.ts`.
- 60 ms input coalescing prevents unnecessary Worker messages during rapid typing.
- The utility shell uses the existing Patro theme/accessibility system and is responsive down to narrow mobile widths.
- A separately scoped service worker is registered at `/tools/sw.js`; the production build emits a physical `dist/tools` shell from the verified `/astro` artifact so `/tools` does not depend on an HTML rewrite.
- Static documents/scripts/styles/images/workers are cached. API traffic remains network-first except the existing calendar cache strategy.

## Agent 3 — tests and release

`npm run test:core` covers:

- canonical Preeti conversion samples,
- conjunct alias,
- reph shift,
- short-i relocation,
- strict vs compatibility capital-I behavior,
- Unicode → Preeti round trip,
- exact Hill/Terai anchors,
- fractional Dam precision,
- progressive tax + contribution-cap edge behavior.

GitHub Actions runs:

1. dependency installation,
2. core Vitest suite,
3. TypeScript + Vite production build,
4. generated artifact checks.

Vercel Git integration remains the deployment mechanism. This avoids a second deployment path that could race the existing production integration.

## Expansion modules

These remain isolated modules behind data-quality gates:

- BS ⇄ AD: import the authoritative 1975–2099 BS month table into `packages/core`; test anchor and every year boundary before enabling offline conversion.
- FY tax UI: bind the generic tax core to a versioned, cited fiscal policy object only after official FY 2083/84 rules are validated.
- Vehicle renewal and court fees: version rate tables by effective date and province/vehicle class/case type where applicable.
- Devanagari QR: client-only generation; no text needs to leave the device.
- NOC fuel tracker: online data adapter with timestamp, source metadata, stale-data indicator, and cached last-known value.

## Next.js 16 SSG migration gate

The target shell is Next.js 16 Active LTS with static export and Tailwind. Migration is approved only when all of the following pass against the existing Vite release:

- route inventory parity,
- FM/TV persistent playback parity,
- Jyotish and PDF workflow parity,
- calendar/date/tithi parity,
- Supabase rewrite parity,
- service-worker/offline parity,
- CSP/security-header parity,
- production build + E2E smoke tests,
- no route or feature removals.

Until those gates pass, changing the production framework would increase system-level regression risk without improving the deterministic utility engines themselves.
