# Google account login

Client ID: `1057768734502-0on6v9gor3in7k09i0b1js1jp2iauk29.apps.googleusercontent.com`.

The header and homepage notes language toolbar have compact Google account icons;
My Notes also has a sign-in control next to its input modes. Signed-in controls
show the account avatar and offer sign-out. Guests can keep using local notes.

Google Identity Services loads only when a user opens sign-in. It returns an ID
token, so no OAuth client secret or Gmail/Drive scope is needed. The existing
Cloudflare `Googleauth` secret is neither read nor exposed. Public client config is
`GOOGLE_CLIENT_ID` in Wrangler; `keep_vars` preserves other dashboard variables.

## Deployment

The release workflow applies D1 schema migrations before deployment. Migration
`0005_google_account_login.sql` ensures the existing identity/state tables and adds
a revision counter for conflict-safe account saves. It does not alter calendar or
public datasets. Existing sessions remain compatible.

In this client's Google Cloud Console, **Authorized JavaScript origins** must
contain `https://aafnaipatro.com`. Add `https://www.aafnaipatro.com` only if that
origin serves the app directly. For local tests, authorize the exact localhost
origin. Google consent/audience settings must allow the intended users; a Testing
client may restrict sign-in to its listed test accounts. The JavaScript callback
flow does not require an OAuth redirect URI. These Google settings cannot be
inferred from the client ID or configured through this repository.

## Private storage and synchronization

A verified Google `sub` maps to one D1 user. RS256 JWT verification uses Google's
public JWKS through `jose`, with issuer, audience, expiration, verified email, and
browser-bound nonce checks. A 15-minute HttpOnly nonce cookie and same-origin
write checks prevent login CSRF. Only hashed 30-day session tokens are stored in
D1; session cookies are HttpOnly, Secure on HTTPS, and SameSite=Lax. Auth/state
responses use `no-store` and are not public CDN snapshots.

Notes and existing Life Tools records (family dates, due dates, document reminders,
festival plans, tithi events, name checks and sealed future letters) are stored per
account locally and merged into `preferences.life_tools` in that user's D1 state.
Guest data is adopted only by the first account signing in on a device. Switching
accounts uses separate local namespaces; sign-out returns to the guest namespace.
Edits keep working offline. Signed-in edits synchronize with an 800ms debounce;
reconnection retries pending local data. Revision conflicts retry at most three
times, merging again before writing. Only the Life Tools field is patched, keeping
other account fields intact. Deletion markers prevent removed records returning
from another device's old snapshot. The existing community preferences API keeps
its independent account storage and behavior.

The maximum state request is 512KiB. If that limit or connectivity prevents a save,
the local copy remains; do not claim cloud persistence until the save returns OK.
Notes are private per account, not end-to-end encrypted. Future letters keep their
existing passphrase encryption. Calendar day-sheet scratch notes and arbitrary
localStorage keys are not silently uploaded by this change.

## Verification

Run `node --test tests/google-account.test.mjs`, `npx tsc --noEmit`, the production
build and Worker validation. Tests use real signed RSA tokens with mock Google
keys and SQLite-backed D1: valid login/session/logout, forged credentials, origin
and nonce rejection, account isolation, revision conflicts, guest adoption and
note deletion. Browser checks should exercise both icons, save/reload, second
account/device, logout, offline editing/reconnect and mobile header width. Google
account selection must finally be tested with an authorized real account.
