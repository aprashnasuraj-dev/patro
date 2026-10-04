# Admin console — aafnaipatro.com/admin

Run the site without git or the Cloudflare dashboard: traffic, live visitors, site users,
every visible label, colours, sections, banner, redirects, maintenance mode, and an AI agent.

## First sign-in

1. Deploy as usual (push → Cloudflare Workers Builds runs `npm run build` + `wrangler deploy`).
   The console creates its own D1 tables (`aap_*`) on the first request — nothing to migrate.
2. Open `https://aafnaipatro.com/admin` and sign in as `surajdahal` with the starter password.
3. You must choose a private password before anything else opens. You can rename the account here too.
4. Recommended: **Admins & security → Two-step sign-in → Set up**.

The repository holds only a salted PBKDF2 hash of the starter password, never the password itself,
and that hash is used only while no admin exists in D1. After the first sign-in it is irrelevant.
To change the starter password before first sign-in: `node scripts/admin-hash-password.mjs 'new-password'`
and paste the output into `BOOTSTRAP_PASSWORD_HASH` in `worker/admin-console/auth.ts`.

## How changes go live

Edits save automatically to a private **draft**. Use **Preview draft** to see the real site with your
changes (only you see it), then **Publish**. Visitors get the new version within about 20 seconds — no
rebuild. **Edit site → History** restores any earlier published version into the draft.

| You change | What visitors get |
|---|---|
| Rename text | Text replaced on every page, including the app's own menus as they render |
| Colours & style | Site colour variables overridden for light and/or dark mode, radius, font |
| Sections | Hidden from menus, or turned off (visitors redirected; admins still see it) |
| Banner | Announcement at the top of every page; dismissals remembered per message |
| Redirects | 301/302 from any path (admin, API and asset paths are protected) |
| Maintenance | 503 maintenance page for visitors; allowed paths and signed-in admins pass |
| Advanced | Custom CSS, extra `<head>` tags, visitor counting on/off, JSON backup/import |

Renames are applied in the browser, so crawlers that don't run JavaScript still read the original
prerendered text. For SEO-critical wording, change it in the source as well.

## AI agent

**AI agent → Providers & settings**: paste a key for OpenAI (ChatGPT), Anthropic (Claude), Google
Gemini, Groq, OpenRouter, DeepSeek, NVIDIA or any OpenAI-compatible endpoint, pick a model
(**Load list** fetches what your key can use), **Test connection**, then choose the active provider.

The agent reads freely (settings, traffic, live visitors, users, activity). Every change it wants to
make appears as a proposal with **Apply / Reject**; applied proposals go to the draft, and publishing
always needs your click. Keys are AES-GCM encrypted in D1 and never sent back to the browser.

Groq/NVIDIA keys saved here can also power the public Jyotish chat when no key is set as a Worker secret.

## Roles

**Owner** — everything, including admins, API keys, deleting site users, settings.
**Editor** — edit and publish the site, use the AI agent. **Viewer** — read-only.

## Traffic numbers

Counted from a beacon in real browsers. No cookies; the visitor ID is a SHA-256 of a daily-rotating
salt + IP + user agent, so visitors are counted within a day but not tracked across days. IPs are never
stored. Records are pruned nightly (retention set in **Settings**). Optional: add a Cloudflare API token
(Zone · Analytics · Read) and zone ID in **Settings** for edge-level totals including bots.

## Security

- Sessions: HttpOnly, SameSite=Strict cookie; 12 h idle, 7 days max; CSRF header on every write.
- 5 failed sign-ins lock that username and that IP for 15 minutes.
- Admin pages: strict CSP (`script-src 'self'`), `noindex`, no framing. Every action is in the activity log.

Optional Worker secrets (set once, never required):

| Secret | Purpose |
|---|---|
| `ADMIN_SECRET` | 32+ random characters used to encrypt saved API keys (otherwise a key generated inside D1 is used). Keys saved before adding it must be re-entered. |
| `ADMIN_RECOVERY_PASSWORD` | Locked out? Set this (12+ chars), sign in with any owner username + this password, set a new password, then delete the secret. |
| `ADMIN_BOOTSTRAP_PASSWORD` | Overrides the committed starter hash, only while no admin exists yet. |

## Files

```
worker/admin-console/      index.ts (router + site layer), auth.ts, crypto.ts, db.ts, secrets.ts,
                           site-config.ts, analytics.ts, users.ts, ai.ts
public/admin-console/      app.js, app.css           — the admin app (no build step, no dependencies)
public/aap/runtime.js      runs on public pages      — renames, banner, sections, analytics beacon
worker/connected-entry.ts  export default withAdminConsole(connectedWorker)
cloudflare/d1/schema-migrations/0003_admin_console.sql   mirror of the auto-created tables
scripts/admin-hash-password.mjs
```
