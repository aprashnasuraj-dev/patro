# Nepal Miti Protected Preview Proxy

This public repository intentionally contains **no proprietary calendar dataset, Panchang archive, Nepal Sambat source bundle, On This Day database, or protected Nepal Miti server runtime source**.

The one deliberate exception is the additive Rashifal calculation wrapper in `api/rashifal_engine.py`. Its source is published together with `RASHIFAL_LICENSE_NOTICE.md` because the deployed runtime uses AGPL-licensed `pyswisseph` and includes rule material cross-checked against AGPL-licensed PyJHora sources. Publishing that wrapper does **not** expose Nepal Miti's protected calendar/master datasets.

Vercel reverse-proxies the main Nepal Miti UI/API to the server-side runtime hosted in Supabase Edge Functions and separately hosts the protected-by-bearer Rashifal calculation function.

Build: v1.0-protected-otd
On This Day: 5,454 records / 366 date keys, exact-date API only
Raw proprietary bundle endpoints: disabled
Purpose: public UI/UX, licensed Rashifal wrapper, and security QA
