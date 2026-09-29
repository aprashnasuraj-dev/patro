# Nepali typing + enhanced Preeti release plan

Prepared: 2026-09-29  
Target release gate: 2027-09-29 00:00 Asia/Kathmandu (2027-09-28T18:15:00Z)  
Release branch: `release/nepali-typing-2027`

## Scope

This branch prepares two related upgrades without replacing any existing Patro feature:

1. **Enhanced Preeti ⇄ Unicode**
   - cluster-aware short-i handling
   - postfix reph handling
   - canonical Preeti `If` for `क्ष`
   - warnings for malformed/unsupported characters instead of silent deletion
   - explicit mixed-font run conversion API
   - UTF-8 import, copy/download, optional licensed local font preview

2. **New Nepali typing**
   - Roman → Nepali candidates
   - exact curated aliases
   - native Devanagari prefix completion
   - phonetic fallback
   - bounded one-edit suggestions
   - long-vowel distinctions before relaxed matching
   - IME composition protection
   - cursor-safe insertion, undo/redo, local draft opt-in and deletion

The uploaded source bundle passed all 72 tests locally before integration. Its rebuilt lexicon reported 34,571 unique suggestions from 34,548 usable upstream entries, one normalized duplicate, and 24 editorial additions.

## Supabase control plane

Two public Edge Functions are prepared:

- `tools-catalog` — returns the currently eligible tool catalog from Postgres.
- `typing-lexicon` — reconstructs and validates the full Nepali word list from the pinned upstream dictionary source and serves the compact word list.

Database tables:

- `public.tool_catalog`
- `public.tool_release_plan`

Direct `anon` and `authenticated` table access is revoked. The public Edge Function reads with the server-side service role and only returns intentionally public catalog metadata.

The release plan records these staged features for 2027-09-29:

- `nepali-typing-v1`
- `enhanced-preeti-v2`
- `enhanced-unicode-preeti-v2`

The new Nepali typing catalog row also has a future `release_after`, so the remote catalog does not expose it before the gate.

## Vercel build-rate workaround

**What Supabase can do without another frontend build**

After one frontend deployment contains the remote-catalog client:
- reorder tools
- rename/descriptively relabel tools
- enable/disable catalog entries
- move items between Typing Tools / Utilities / Tools
- set future release dates
- expose future catalog entries automatically
- serve/update the validated typing dictionary endpoint

These changes can be controlled from Supabase without rebuilding Vercel.

**What Supabase cannot change on the currently deployed Vercel artifact**

The live Vercel deployment currently owns the `/tools` and `/tools/:path*` rewrites and serves an already-built static React bundle. Supabase cannot replace that compiled bundle or those Vercel rewrite rules from behind the route. Therefore at least **one successful Vercel deployment is required** to install the remote-catalog client and new typing assets.

Moving the whole `/tools` UI to server-rendered Supabase HTML would technically reduce Vercel dependency, but it would violate the project's preferred static-SPA architecture and duplicate frontend code. The selected design keeps the UI static/client-side and uses Supabase only as the control/data plane.

## Release checklist

Before publishing in 2027:

1. Rebase this branch on the then-current `main`.
2. Re-run `npm run test:core`, `npm run test:typing` and `npm run build`.
3. Re-run the original 72-test source bundle and lexicon reconstruction.
4. Confirm the upstream dictionary checksum still matches the expected SHA-256.
5. Browser-test desktop/mobile typing, cursor edits, IME composition, suggestion navigation, import/download, local drafts and offline install.
6. Verify direct refresh/back-forward behavior for:
   - `/tools/nepali-typing`
   - `/tools/preeti-to-unicode`
   - `/tools/unicode-to-preeti`
   - compatibility aliases `/tools/preetitounicode` and `/tools/unicodetopreeti`
7. Smoke-test calendar, astronomy, Rashifal/Jyotish, Samachar, FM, TV, Tithi, Diaspora, Card, Family, API and My Data.
8. Verify Supabase security/performance advisors and Edge Function logs.
9. Only then merge/release to production.

## Source provenance

Dictionary: Madan Puraskar Pustakalaya Nepali spellchecking dictionary, release 2.1 (2008-04-25), through `wooorm/dictionaries`, LGPL 2.1.

Expected source blob: `c6f72034f0c96f2cdfc54c3d61eb07ccc97c18ac`  
Expected source SHA-256: `dfc130b2ccbaeee54a859bdc512c27107eb6efa6ae5167615a65df83377ba427`

Typed user text is not sent to the dictionary endpoint. The endpoint serves public lexicon data only.
