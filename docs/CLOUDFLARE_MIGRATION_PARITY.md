# Cloudflare Migration Parity Contract

Migration work must not remove a working product surface because its Cloudflare-native replacement is unfinished.

## Native Worker routes

Current native routes include:

- `GET /api/v1/health`
- `GET /api/v1/sync`
- `GET /api/v1/astronomy/tithi`
- `GET /api/v1/nasa/apod`
- `GET /api/v1/tools/catalog`
- `GET /api/v1/on-this-day`
- `GET /api/v1/time-machine`
- `GET /api/v1/rashifal/universal` (D1-first)
- `GET /api/rashifal/universal` (D1-first)

Explicit bridges preserve:

- `/api/jyotish-chat`
- `/api/rashifal_engine.py`
- `/fm-v2-stream/*`

Every unmatched `/api/v1/*` request is forwarded to the existing Supabase router until a verified native replacement exists.

## Supabase route families retained during transition

The compatibility layer protects:

- today/date conversion/calendar month;
- festivals, holidays, Panchang, tithi derive/next;
- market data;
- Rashifal metadata/personalized plus universal fallback for D1 cache misses;
- tool catalog and typing lexicon;
- tithi feed, official Sait and contact;
- community suites and ICS;
- Hijri/Ramadan;
- Nepal Sambat conversion/festivals/ICS;
- community preferences/admin operations;
- NASA cosmic data;
- fuel prices;
- radio catalog/stream;
- media proxy;
- Jyotish chat.

## Frontend preservation

| Area | Must remain available |
| --- | --- |
| Calendar | AD/BS/NS, navigation, Panchang/tithi |
| Astronomy | Time Travel, lunar phase, NeoWs, APOD, EPIC, space weather |
| History | On This Day, Time Machine |
| Jyotish | Janma Patro/matchmaking/current integrations |
| Rashifal | universal/public D1-first; personalized/private protected compatibility |
| Media | FM directory/player and live TV/HLS |
| Nepali language | typing, Preeti/Unicode, spelling, voice/read-aloud |
| Tools | OCR, Sait, reminders, baby names, birth card, PatroBot, future letters |
| Communities | Nepal Sambat, Hijri, Lhosar, Kirat, Mithila, Tharu |
| Personal | My Diary |
| PWA | manifest, icons, installability, service worker |
| Trust | About, Sources, Privacy, Terms, Contact |

## Public/reference data invariant

```text
table:          astronomy_calendar_map
parts:          78
rows:           77,070
first AD date:  1826-04-11
last AD date:   2037-04-13
source version: patro-archive-v79
```

The one-time bootstrap generator reads the canonical `migration/data/public` snapshots for every deterministic public/reference table and uses the retained universal Rashifal publication seed only for the 22 Rashifal rows. Private/user tables are excluded.

`npm run cloudflare:verify-snapshot` checks sequence, continuity, exact table counts and D1 statement-size constraints without generating the bulk SQL file. The critical D1 counts are Rashifal 22, Time Machine 706, On This Day 5,454, Tools catalog 29 + release plan 4, Nepal Sambat day map 14,972, and the main AD/BS/NS/Panchang map 77,070. Every calendar row is required to contain BS, Nepal Sambat and Panchang/tithi payloads.

`cloudflare/d1/supabase-table-inventory.json` accounts for every table in the Supabase `public` schema. Public/reference feature data is deterministic D1 bootstrap data; private/mutable user state remains behind the protected Supabase compatibility path until auth migration; rate-limit buckets are classified as ephemeral and rebuilt on Cloudflare.

## Definition of native-migrated

A feature is native-migrated only when:

1. its UI route still exists;
2. response shape/behavior remains compatible;
3. required data exists in a declared Cloudflare-native store;
4. authentication/privacy behavior is preserved;
5. errors/fallbacks are defined;
6. CI is green;
7. Pages/Worker smoke tests pass;
8. compatibility fallback no longer receives legitimate traffic for the feature.

Until all eight are true, preserve the compatibility route.
