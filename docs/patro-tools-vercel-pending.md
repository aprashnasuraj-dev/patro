# Patro Tools — Vercel production pending bundle

Prepared: 2026-09-29

## Deployable Git state

- Repository: `aprashnasuraj-dev/patro`
- Production source branch: `main`
- Main merge commit: `a93e48a618d5b7df0083ae5b4ef762915231c019`
- Stable bundle branch: `bundle/patro-tools-vercel-prod-20260929`

## Four toolkit phases

- Phase A: PR #15 — setup, imported kit source/tests, adapters, alias, dependencies, hub cards
- Phase B: PR #29 — tithi reminder, spell check, name check, read aloud
- Phase C: PR #30 — Janmadin Akhbar, Sait, baby names
- Phase D: PR #33 — future letter, Patro Bot, voice typing, OCR

Superseded stacked PRs #22, #24, #25 and #31 were closed after the clean phase PRs were merged.

## Required /tools pages in main

- /tools/tithi-reminder
- /tools/sait
- /tools/baby-names
- /tools/janmadin-akhbar
- /tools/future-letter
- /tools/spell-check
- /tools/voice-typing
- /tools/ocr
- /tools/name-check
- /tools/read-aloud
- /tools/patro-bot

## Validation

Release head before production promotion passed:
- Core tests
- Nepali typing tests
- Unchanged Patro-tools kit tests
- Type-check
- Lint
- Production build
- Utility Platform CI

## Supabase production

Project: `pxlsmxbpgdfzjzuqtict`

- Edge Function `router`: ACTIVE, version 47, JWT verification disabled as required by the existing public proxy design
- Tool routes deployed with rate limiting:
  - POST /functions/v1/router/tools/tithi-feed-token
  - GET /functions/v1/router/tools/tithi-feed.ics
  - GET /functions/v1/router/tools/official-sait
- Schemas present with RLS enabled:
  - user_calendar_state
  - personal_ics_tokens
  - official_panchang_facts
- Existing BS converter remains the sole BS source.
- Existing Patro panchang remains primary; kit astronomy is fallback/cross-check only.
- Differences are recorded in docs/panchang-diff.md; neither engine is auto-corrected.

## Vercel blocker

Project: `prj_MgvAT0zpe4JsrJDTHhpXgcgJLyov`
Team: `team_CRsXSWBw5O8e3d9Un3xGAFqZ`

Public alias `patro-blush.vercel.app` is still serving production commit:
`f5f2386fa0b4fb38ae79fb0d4af840684e22fcd1`

GitHub/Vercel status for the new main production merge is:
`api-deployments-free-per-day / build-rate-limit`

This is an external Vercel quota block, not a build/test failure. When quota is available, redeploy `main` commit `a93e48a618d5b7df0083ae5b4ef762915231c019` (or this bundle branch). No additional toolkit code change is required.
