# Nepal Miti — Master Continuation Prompt

You are continuing development of **Nepal Miti / नेपाली पात्रो**, a privacy-first, evidence-aware Nepali calendar, Panchang, Nepal Sambat, planning, On This Day, and astrology platform. Do not restart the project. Inspect the connected Supabase/Vercel/Drive state and newest project backup before making changes.

## Product direction
Nepal Miti is not meant to be a feature-clone of Hamro Patro. Its identity is: an accurate, fast, private, offline-capable Nepali calendar that behaves like a modern personal calendar and cultural-time platform.

Truth layers must remain separate:
1. Civil Bikram Sambat ↔ Gregorian
2. Panchang/astronomy
3. Nepal Sambat
4. Festival/observance
5. Public-holiday overlay
6. Personal notes/events/reminders
7. Personal astrology
8. On This Day
9. Developer/API layer

Never silently merge these layers.

## Calendar coverage
Current historical navigation:
- BS 1883-01-01 → 2093-12-30
- AD approx. 1826-04-11 → 2037-04-13
- approx. 77,070 daily records
- 211 BS years

Coverage tiers:
- BS 2033–2093: validated user archive, 22,281/22,281 BS↔AD pairs.
- BS 1975–2032: corroborated open historical month-length tables.
- BS 1901–1974: historical tabulated; not legal/official authority.
- BS 1883–1900: exploratory reconstruction; comparison tables disagree and the app must label this visibly.

Original validated mapping SHA-256:
`6d782d2a7b1c71a20d99b7726e26d71c1ca25a642f2e31d6289cc56a99476345`

## Canonical rich calendar source
Original user source: **Nepali Dates(1).zip**

Contents:
- nepali_calendar_master.csv
- RESTORATION_MASTER.xlsx
- README.md
- nepali_calendar.sqlite
- reconciliation_divergences.csv

Validated source facts:
- 22,281 days
- 732 BS months
- 1,573 festival-observance rows
- 87-column master CSV
- AD 1976-04-13 → 2037-04-13
- BS 2033-01-01 → 2093-12-30
- Nepal Standard Time UTC+05:45
- Kathmandu astronomy reference: 27.7172 N, 85.3240 E, elevation 1400 m
- 225 civil-vs-computed month-boundary divergences; 507/732 exact matches
- do not silently replace civil authority with computed astronomy

Known data issue: source `moon_phase_ne` contained `पूर्ण जून`; correct only in UI/presentation while preserving original provenance.

## Panchang
Keep the established formulas:
- Tithi: Moon−Sun longitude / 12°
- Nakshatra: Moon sidereal longitude / 13°20′
- Yoga: Sun+Moon longitude / 13°20′
- Karana: half-tithi logic
- Kathmandu sunrise as the daily reference for supplied archive logic
- display tithi transition/end time when available

Never use a simplistic BS≈AD+57 conversion.

## Festival/holiday evidence
Keep:
Civil Date → Panchang → Festival/Observance → Public Holiday → Personal Event

Public holiday priority:
1. Gazette / official government notice
2. Ministry of Home Affairs
3. official correction/update
4. historical annual schedule

Religious/festival observance priority:
1. Nepal Panchanga Nirnayak Bikash Samiti explicit notice
2. NPNS-approved Panchanga
3. multiple recognized concordant Panchangas
4. calculated rule
5. secondary sites only as cross-check

Do not treat Hamro Patro/Nepali Patro as sole authority.

## Nepal Sambat
Nepal Sambat must remain visible in the daily UI.

Database/reference work already includes:
- 14 month definitions
- 15 tithi-name definitions
- 14 Nepal Sambat facts
- 49 lunar-observance reference rows
- official/cultural reference sources

Keep traditional lunar Nepal Sambat as the primary cultural layer. Modern Solar Nepal Sambat is separate. Preserve Thwa/Gā terminology and sourced official notation examples.

## Current app features
Calendar:
- BS day, AD day, tithi, transition, festival, Saturday style, today marker
- inline note indicator and add/edit note from date cell
- rich/compact mode
- BS year/month/optional-day jump

Daily detail:
- tithi/paksha
- nakshatra/pada
- yoga
- karana
- sunrise/sunset
- solar rashi
- fiscal year
- Sankranti
- festivals
- Nepal Sambat
- personal notes/events
- provenance/trust

Live UI:
- live timezone clock
- Nepal/Kathmandu reference clock
- selectable world timezone
- live Kathmandu Muhurta
- Abhijit Muhurta
- Rahu Kalam
- sunrise/sunset-derived status
- Wednesday Abhijit warning

Planning:
- local-first notes
- events/reminders
- yearly BS recurrence
- yearly AD recurrence
- yearly tithi recurrence
- browser reminders
- local personal/family/work spaces
- internal shared calendars with invite-code backend

External Google/Apple/two-way calendar integration was explicitly skipped by the user and must remain skipped unless reopened.

Accessibility/PWA:
- Nepali/English
- Nepali/Latin digits
- font scaling
- high contrast
- reduced motion
- Nepali TTS/read-today
- installable PWA/service worker
- local-first behavior

## Astrology
Research basis: `Executive Summary (7).pdf`

Privacy:
- birth data local-only by default
- cloud sync only on explicit opt-in
- do not present astrology as scientific certainty or medical/financial advice

Inputs:
- BS or AD birth date
- birthplace/place search
- latitude/longitude
- IANA timezone
- optional birth time
- unknown-time mode

Critical rule:
If birth time is unknown, do not fabricate Lagna/houses. Show only defensible date-based outputs and Moon-sign uncertainty if it can change during the day.

Current outputs:
- Janma Rashi
- Nakshatra/Pada
- birth Panchang
- sidereal planets
- Rahu/Ketu
- Lagna when time known
- whole-sign houses
- D1/Rashi chart
- D9/Navamsa
- initial Vimshottari Mahadasha
- Western tropical quick view
- Chinese zodiac year
- explainable personal daily Rashifal from natal Moon + current transits

Engine:
- Astronomy Engine 2.1.19, MIT
- Lahiri-style sidereal layer
- previous 30-date cross-check matched archive tithi/nakshatra/yoga 30/30
- max differences approx. Sun 0.308 arcmin, Moon 0.353 arcmin

Do not call Lagna/D9/Vimshottari “production-certified” until fixed charts are cross-checked against established reference software.

## On This Day
Supabase currently contains **5,454 On This Day records**.

Canonical files include:
- on_this_day_complete_5454_bundle.zip
- on_this_day_complete_5454.csv
- on_this_day_complete_5454.json
- on_this_day_complete_5454.sqlite
- on_this_day_complete_5454.xlsx
- on_this_day_detailed_report_5454.md
- otd_seed_01.sql … otd_seed_08.sql
- on_this_day_ingest_summary.json

Schema supports:
ad_year, ad_month, ad_day, ad_date, bs_date, title_ne/en, summary_ne/en, category, importance, source_name/url, sources JSON, image_url/captions/credit/license, verification_status, published, metadata.

No invented historical events.

## Supabase backend
Project name: **nepali-calendar**
Project ref: **pxlsmxbpgdfzjzuqtict**
Region: **ap-south-1 / Mumbai**

Never expose service-role secrets. Browser uses only publishable/anon credentials with strict RLS.

Current public-schema tables:
- profiles
- user_calendar_state
- calendar_spaces
- calendar_space_members
- calendar_space_events
- correction_reports
- calendar_reference_sources
- nepal_sambat_months
- nepal_sambat_tithi_names
- calendar_coverage_tiers
- on_this_day_events
- nepal_sambat_facts
- nepal_sambat_observances
- astrology_profiles
- astrology_chart_cache
- api_rate_buckets
- api_rate_limit_buckets
- preview_feedback

Current important row counts:
- on_this_day_events: 5,454
- calendar_reference_sources: 14
- nepal_sambat_months: 14
- nepal_sambat_tithi_names: 15
- calendar_coverage_tiers: 4
- nepal_sambat_facts: 14
- nepal_sambat_observances: 49

Supabase security advisor at handoff: **0 security findings**.

Current active Edge Functions:
- join-calendar
- nepal-miti-api
- nepal-miti-preview
- publish-nepal-miti-preview
- nepal-miti-test
- cleanup-nepal-miti-preview
- nepal-miti-protected
- nepal-miti
- nepal-miti-v09-preview

Inspect the deployed function versions before modifying them. The protected serving path is centered on `nepal-miti-protected`.

## Source protection
This is a firm project requirement.

Do NOT:
- place raw master datasets in a public GitHub repo
- expose service-role/database secrets
- ship the entire proprietary database when a month/date slice is enough
- call minification “security”
- claim browser JavaScript is secret

Prefer:
- private GitHub only if Git is needed
- Supabase/Postgres as protected source of truth
- Edge Functions for server-side logic
- RLS
- API rate limits
- month/date slice endpoints
- caching
- anti-bulk-scraping controls
- local-only personal data by default
- signed/admin-only ingestion operations

## Vercel deployment
Connected team:
- name: surajdev
- slug: surajdev2
- team ID: `team_CRsXSWBw5O8e3d9Un3xGAFqZ`

Project:
- name: patro
- project ID: `prj_MgvAT0zpe4JsrJDTHhpXgcgJLyov`

Git source currently associated with Vercel:
- `aprashnasuraj-dev/patro`

Known aliases:
- https://patro-blush.vercel.app
- https://patro-surajdev2.vercel.app
- https://patro-git-main-surajdev2.vercel.app

At handoff, latest deployment state was READY, but Vercel Deployment Protection/SSO was enabled. Always test accessibility before calling an alias “public.”

Do not push or publish feedback-related changes unless the user explicitly asks. The user explicitly said feedback was not requested yet.

## Important source/backups
Prefer the latest backup/deployed protected backend, not old v0.7/v0.8 code unless doing regression analysis.

Core/current files:
- nepal-miti-v09-server.js
- nepal-miti-v09-QA.md
- nepal-miti-v09-vercel.json
- nepal-miti-v09-source.zip
- nepal-miti-protected-edge-v010.ts
- nepal_miti_protected_api.ts
- nepal-miti-cloudflare-v09-static.zip
- Nepal_Miti_Full_Backup_2026-09-19.zip

Original/calendar:
- Nepali Dates(1).zip
- nepali_calendar_validation_report.md

Research:
- Executive Summary (7).pdf
- other earlier calendar/product research PDFs

## Authentication
Primary direction:
anonymous/local-first → email passwordless OTP → optional permanent Supabase account → private sync.

Do not email permanent passwords.
Do not claim email OTP is ready until template, redirect URLs and email delivery are tested.

## QA/deployment gates
1. source/data validation
2. migration check
3. Supabase security advisor
4. API health
5. preview deployment
6. desktop visual inspection
7. mobile inspection
8. route tests
9. auth test if enabled
10. notes/sync test
11. festival/history QA
12. only then production/domain

Never claim a Vercel URL is public when it redirects to SSO.

## Explicit instructions to preserve
- Skip external Google/Apple/two-way calendar sync unless user later reopens it.
- Do not submit/publish feedback unless explicitly asked.
- Protect source and master datasets.
- Keep historical trust tiers visible.
- Keep Nepal Sambat visible.
- Keep birth data local by default.
- Continue using the 5,454-record On This Day database and future user datasets.
- Reserve architecture for future modules instead of forcing placeholder features.

## Fresh-chat continuation procedure
When this prompt is used in a new conversation:

1. Check Supabase project `pxlsmxbpgdfzjzuqtict`.
2. Check current Edge Functions, migrations, table counts and security advisor.
3. Check Vercel team `team_CRsXSWBw5O8e3d9Un3xGAFqZ` and project `prj_MgvAT0zpe4JsrJDTHhpXgcgJLyov`.
4. Inspect newest deployment/aliases and test public accessibility.
5. Retrieve newest source/backup from Google Drive/ChatGPT Library.
6. Do not rebuild from an old archive if a newer protected backend exists.
7. Before writes, identify whether the change touches frontend, protected backend, DB, source data, or deployment.
8. Preserve provenance and backwards compatibility.
9. Run security/QA after material changes.
10. Give a preview/public URL only after verifying it.

Expected first reply in a future chat:
“Continuing Nepal Miti from the protected-backend handoff. I’ll inspect the connected Supabase/Vercel state and newest backup first, then continue from the newest deployed version. I will not publish feedback or expose source/master data without explicit instruction.”
