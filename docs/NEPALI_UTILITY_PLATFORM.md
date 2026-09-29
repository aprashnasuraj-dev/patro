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
│        ├─ bsDate.ts
│        ├─ land.ts
│        ├─ preeti.ts
│        ├─ tax.ts
│        ├─ utf8.ts
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

### BS ⇄ AD date engine

- Verified base anchor: BS 1970-01-01 = AD 1913-04-13 UTC.
- 1970–1974 month lengths come from the existing Patro synchronized calendar archive.
- 1975–2093 was cross-checked against all 1,428 corresponding months in the project archive with zero month-length mismatches.
- 2094–2099 stays available for deterministic offline conversion but is explicitly tagged provisional because independent future BS tables can disagree.

### FY 2083/84 salary-tax engine

The reusable progressive engine remains policy-driven. The concrete FY 2083/84 resident salary policy is versioned separately and uses the current 1% / 10% / 20% / 27% / 29% bands, ordinary vs qualifying-SSF contribution caps, and explicit insurance caps. SSF first-band eligibility is never inferred from a contribution amount; the caller must declare it.



### UTF-8 / QR utility

Devanagari QR encoding routes text through an explicit TextEncoder-based UTF-8 byte function before the QR library. A regression test locks the byte sequence for नेपाली so a library default cannot silently truncate Unicode.

## Agent 2 — UI, Worker, offline

- `/tools` is a native React route.
- Font, date, tax, land and QR calculations execute inside `src/utilities/worker.ts`.
- 60–100 ms input coalescing prevents unnecessary Worker messages during rapid typing.
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
- generic progressive-tax edge behavior,
- FY 2083/84 salary bands, SSF waiver, contribution and insurance caps,
- verified BS/AD anchors and archive fixtures,
- provisional future-BS provenance,
- Devanagari UTF-8 bytes,
- Devanagari QR generation and byte safety.

GitHub Actions runs:

1. dependency installation,
2. core Vitest suite,
3. TypeScript + Vite production build,
4. generated artifact checks.

Vercel Git integration remains the deployment mechanism. This avoids a second deployment path that could race the existing production integration.

## Expansion module status

Implemented and exposed in `/tools`:

- BS ⇄ AD offline conversion with provenance.
- FY 2083/84 personal salary-tax calculator.
- Devanagari UTF-8 QR generator.
- NOC fuel tracker with regional price groups, fetch timestamp and browser last-known cache.

The NOC adapter lives in the existing Supabase Hono `router`. It attempts the official NOC retail-price page first. When NOC serves a maintenance page or cannot be parsed, the API returns the latest source-verified official snapshot with `stale: true` and an effective-date/note; it never presents a snapshot as live.


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
