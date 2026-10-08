# Voice, my place, and real birthday implementation

Baseline: `bfb4e0e552d4a95e5f298911dfa68903badd2704` (8 October 2026).
The supplied V1–V14, F1–F7, and J1–J10 specification is the acceptance contract.
Each numbered item gets one small, dependent PR, tests, a preserved-behaviour
checklist, and rollback instructions. Feature work does not go directly to main.

## Before-code evidence

- Read README.md, DEPLOY.md, and docs/AAFNAIPATRO_10_STEP_STATUS.md.
- `npm run release:verify`: passed, including both builds, product suites,
  migration verification, and Worker dry run. URL preservation: 22,902 retained,
  six existing guide additions, zero removed.
- Baseline: 51 full-page screenshots (17 existing routes, each at 375, 768,
  and 1280 px) from the built baseline, with bounded static audit API fixtures.
  Screenshot manifest records the commit, route, viewport, title, and status.
  Festival screenshots use the deployed baseline Worker's HTML, because the
  static SPA audit server does not implement that Worker-owned renderer.
  Local test fonts are installed to make Devanagari comparisons readable.
- Kathmandu astronomy cross-check: 40 sunrise/sunset cases across 1990, 2000,
  2024, 2026, and 2036 all differ from archive HH:mm values by at most one minute.
- Existing routes: `/`, `/today`, `/calendar/2083/06`, `/me/notes`, `/me/diary`,
  `/me/planner`, `/tools/voice-typing`, `/tools/patro-bot`,
  `/tools/preeti-converter`, `/tools/future-letter`, `/tools/janmadin-akhbar`,
  `/janmapatro`, `/date/2026-10-08`, `/festivals/dashain`,
  `/festivals/dashain/2083`, `/tools/astro`, and `/samudaya/hijri`.
- Add further route baselines before editing any additional existing surface.

## Storage reads declared before implementation

| Key | Purpose | Preservation |
|---|---|---|
| `patro.ui.language` | Existing interface language | Existing default and value format |
| `patro.ui.mode` | Existing theme | Existing default and value format |
| `aafnai.shortcuts.v1` | Existing saved tool links | Existing six-shortcut format |
| `patro.account.active` | Existing life-store owner | Existing account isolation |
| `patro.guest.claimed` | Existing one-time guest adoption | Existing adoption rule |
| `nepalmiti.life.v1` | Existing guest notes/reminders/letters | Preserve all fields and version |
| `nepalmiti.life.v1.account:<account-id>` | Existing account life state | Preserve all fields and isolation |
| `patro.weather.city.v1` | Optional location suggestion only | Never overwrite or automatically adopt |
| `patro.language.handoff` (session) | Existing language-tool handoff | Existing text format |
| `aafnai.jyotish.china.context.v1` | Existing chart context | Do not overwrite or automatically import private inputs |
| `patro.voice.engine.v1` (new) | Browser recognition success/failure hint | Versioned; no transcript/audio |
| `patro.place.v1` (new) | Explicit saved location | `{name,lat,lon,tz,source}` |
| `patro.birthday.v1` (new) | Explicitly saved birthday profile and display choices | Local by default; no implicit sync |
| `patro.birthday.family.v1` (new) | Explicit family constellation | Local by default |
| `patro.birthday.reflections.v1` (new) | Reflection progress | Local by default |
| `patro.birthday.media.v1` (new IndexedDB database) | Optional recorded blessing | Explicit recording and local saving |

V1 does not read any browser storage. Its rate limiter stores only hashed-IP
counters in Cache API; it does not store audio, transcripts, or D1 records.
Recheck this inventory before introducing another persistence dependency.

## Defaults and data boundary

- No saved place: existing Kathmandu timing and page layout remain the default.
- Official Nepal dates and sait remain first and unchanged.
- New location rows and birthday sections are opt-in; original tool components
  and all their controls remain available unchanged.
- Client-only astronomy is lazy loaded and uses the existing engines and static
  archive. No new hot-path D1 reads or private data in shared caches.
- CSP and all 22,902 protected URLs remain unchanged.
- Birthday sync, reminders, exports, location permission, microphone permission,
  device orientation, and personal data in share cards require explicit actions.

## Human review gates

Ritual timing, deity/tree tables, sutak, and Janku rules require cited sources
and an actual named reviewer. Until review exists, calculations may be prepared
and tested, but unreviewed ritual advice is not publicly enabled. Do not invent
a reviewer, approval, astronomical reference, manual device test, or source.
Traditional material is reflection/tradition, not prediction or paid upselling.

## Item sequence

1. V1–V9: AI provider, actual recognition probe, Android dedup/restarts,
   chunked recording, cursor/interim editor, browser help, locale restart,
   cleanup, and opt-in local recognition.
2. V10–V14: spoken bot, confirmed voice reminders, Preeti copy, voice letters,
   and large hold-to-talk mode.
3. F1–F7: place, additive timing rows, reviewed festival windows, compass,
   eclipses, reminders/export/sharing, and edge cases.
4. J1–J10: three birthdays, panchang, reviewed star/tree context, community
   calendars, lunar milestones, birth sky, history, reflection, family,
   and accessible private-by-default share designs.

Manual device coverage is recorded as pending until actually exercised on
Chrome Android, Samsung Internet, iOS Safari, Facebook WebView, Firefox, and
Brave. Mocked browser tests are not substitutes for those manual results.
