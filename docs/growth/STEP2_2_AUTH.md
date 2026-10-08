# Step 2.2: account request hint

The HttpOnly mp_session remains the sole authentication credential. aap_signed_in is a host-only Path=/ SameSite=Lax hint with identical Secure and expiry attributes. Login sets it; successful legacy auth/me installs it with remaining session lifetime; logout, account deletion and expired auth/me clear it. Browser 401 clears it too. No account/data/storage key is removed.

Until 2026-11-07 UTC, browsers without a marker probe once and set aap_auth_probe_v1 only after a completed response. Blocked storage/network failures do not permanently mark a browser signed out. The first anonymous visit during migration still costs one probe. Afterwards anonymous loads skip it. Rollback: build with VITE_AUTH_PROBE=1. Tests cover anonymous, migration, marker/session, logout, expiry and cookie lifetime.
