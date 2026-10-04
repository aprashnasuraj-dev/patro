// Aafnai Patro admin console — authentication.
//
// Bootstrap: when aap_admins is empty, the owner account `surajdahal` is created
// from BOOTSTRAP_PASSWORD_HASH below (a salted PBKDF2 hash — the plaintext is
// never committed). If the Worker has an ADMIN_BOOTSTRAP_PASSWORD secret it is
// used instead. The bootstrap account MUST change its password on first login.
//
// Recovery: if you are ever locked out, add an ADMIN_RECOVERY_PASSWORD secret in
// Cloudflare; any owner username + that password logs in and forces a reset.
// Remove the secret afterwards.
import {
  decryptSecret, encryptSecret, hashPassword, newTotpSecret, randomToken, sha256Hex,
  timingSafeEqual, verifyPassword, verifyTotp,
} from "./crypto";
import { all, audit, clientIp, first, getSetting, json, readJson, run, setSetting, type AdminEnv } from "./db";
import { keyMaterial } from "./secrets";

export const BOOTSTRAP_USERNAME = "surajdahal";
export const BOOTSTRAP_PASSWORD_HASH =
  "pbkdf2-sha256$100000$2nt3hendCjicSX0gKbUgIQ==$xh0wzvRb8WcFThd1J/0kEpsKA5o0fTicd7xs+s0zzi8=";

export const COOKIE = "aap_admin";
const SESSION_TTL = 12 * 3600_000;
const SESSION_MAX = 7 * 86400_000;
const LOCK_WINDOW = 15 * 60_000;
// Failures allowed per 15 minutes before a key locks. The ip+username pair locks fast so a
// mistyped password only affects that person; the username-wide limit is high so a stranger
// can't lock the owner out by guessing.
const LIMITS = { pair: 5, ip: 20, user: 50 } as const;

export type Role = "owner" | "editor" | "viewer";
export type AdminSession = {
  session_id: string;
  admin_id: string;
  username: string;
  role: Role;
  display_name: string | null;
  csrf: string;
  must_change_password: number;
  totp_enabled: number;
  created_at: number;
};

const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };
export function hasRole(s: AdminSession, need: Role) {
  return ROLE_RANK[s.role] >= ROLE_RANK[need];
}

function cookieValue(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}
export function readCookie(request: Request, name: string) {
  return cookieValue(request, name);
}
function isHttps(request: Request) {
  return new URL(request.url).protocol === "https:";
}
function sessionCookie(request: Request, value: string, maxAgeSec: number) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${isHttps(request) ? "; Secure" : ""}`;
}

export async function ensureBootstrapAdmin(env: AdminEnv) {
  const row = await first<{ c: number }>(env, "select count(*) as c from aap_admins");
  if (Number(row?.c || 0) > 0) return;
  const hash =
    typeof env.ADMIN_BOOTSTRAP_PASSWORD === "string" && env.ADMIN_BOOTSTRAP_PASSWORD.length >= 8
      ? await hashPassword(env.ADMIN_BOOTSTRAP_PASSWORD)
      : BOOTSTRAP_PASSWORD_HASH;
  const now = Date.now();
  await run(
    env,
    "insert or ignore into aap_admins(id,username,password_hash,role,display_name,must_change_password,created_at,updated_at) values(?1,?2,?3,'owner',?4,1,?5,?5)",
    crypto.randomUUID(),
    BOOTSTRAP_USERNAME,
    hash,
    "Suraj Dahal",
    now
  );
  await audit(env, "system", "bootstrap", "admin", { username: BOOTSTRAP_USERNAME });
}

export async function currentAdmin(request: Request, env: AdminEnv): Promise<AdminSession | null> {
  const raw = cookieValue(request, COOKIE);
  if (!raw || raw.length > 200) return null;
  const hash = await sha256Hex(raw);
  const row = await first<any>(
    env,
    `select s.id as session_id,s.admin_id,s.csrf,s.expires_at,s.last_seen_at,s.created_at,
            a.username,a.role,a.display_name,a.must_change_password,a.totp_enabled
       from aap_sessions s join aap_admins a on a.id=s.admin_id
      where s.token_hash=?1 limit 1`,
    hash
  );
  if (!row) return null;
  const now = Date.now();
  if (row.expires_at <= now || now - row.created_at > SESSION_MAX) {
    await run(env, "delete from aap_sessions where id=?1", row.session_id);
    return null;
  }
  if (now - row.last_seen_at > 60_000) {
    run(env, "update aap_sessions set last_seen_at=?1,expires_at=?2 where id=?3", now, now + SESSION_TTL, row.session_id).catch(() => {});
  }
  return row as AdminSession;
}

async function lockState(env: AdminEnv, key: string) {
  const row = await first<any>(env, "select failures,first_at,locked_until from aap_login_attempts where key=?1", key);
  return row || { failures: 0, first_at: 0, locked_until: 0 };
}
async function recordFailure(env: AdminEnv, key: string, limit: number) {
  const now = Date.now();
  const s = await lockState(env, key);
  const fresh = now - s.first_at > LOCK_WINDOW;
  const failures = fresh ? 1 : s.failures + 1;
  const lockedUntil = failures >= limit ? now + LOCK_WINDOW : 0;
  await run(
    env,
    "insert into aap_login_attempts(key,failures,first_at,locked_until) values(?1,?2,?3,?4) on conflict(key) do update set failures=excluded.failures,first_at=excluded.first_at,locked_until=excluded.locked_until",
    key,
    failures,
    fresh ? now : s.first_at,
    lockedUntil
  );
}

function validPassword(pw: string) {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "Use at most 200 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[^a-zA-Z]/.test(pw)) return "Mix letters with numbers or symbols.";
  return null;
}
function validUsername(u: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(u);
}

async function createSession(request: Request, env: AdminEnv, adminId: string) {
  const raw = randomToken(32);
  const csrf = randomToken(24);
  const now = Date.now();
  await run(
    env,
    "insert into aap_sessions(id,admin_id,token_hash,csrf,created_at,expires_at,last_seen_at,ip,user_agent) values(?1,?2,?3,?4,?5,?6,?5,?7,?8)",
    crypto.randomUUID(),
    adminId,
    await sha256Hex(raw),
    csrf,
    now,
    now + SESSION_TTL,
    clientIp(request),
    (request.headers.get("user-agent") || "").slice(0, 200)
  );
  return { raw, csrf };
}

export function publicAdmin(s: AdminSession) {
  return {
    id: s.admin_id,
    username: s.username,
    role: s.role,
    displayName: s.display_name,
    mustChangePassword: !!s.must_change_password,
    totpEnabled: !!s.totp_enabled,
  };
}

async function login(request: Request, env: AdminEnv) {
  let body: any;
  try {
    body = await readJson(request, 8 * 1024);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const username = String(body?.username || "").trim().toLowerCase().slice(0, 64);
  const password = String(body?.password || "").slice(0, 200);
  const code = String(body?.totp || "");
  const ip = clientIp(request);
  const pairKey = "pair:" + ip + "|" + username, ipKey = "ip:" + ip, userKey = "user:" + username;
  const now = Date.now();
  const fail = () => Promise.all([recordFailure(env, pairKey, LIMITS.pair), recordFailure(env, ipKey, LIMITS.ip), recordFailure(env, userKey, LIMITS.user)]);
  const locks = await Promise.all([lockState(env, pairKey), lockState(env, ipKey), lockState(env, userKey)]);
  const lockedUntil = Math.max(...locks.map((l: any) => l.locked_until));

  const admin = await first<any>(env, "select * from aap_admins where username=?1", username);
  const recovery = typeof env.ADMIN_RECOVERY_PASSWORD === "string" ? env.ADMIN_RECOVERY_PASSWORD : "";
  const recoveryMatch = !!admin && recovery.length >= 12 && admin.role === "owner" && timingSafeEqual(password, recovery);
  if (lockedUntil > now && !recoveryMatch) {
    // The owner's recovery password (a Cloudflare secret) always gets through a lock.
    return json({ ok: false, error: "locked", retryInSeconds: Math.ceil((lockedUntil - now) / 1000) }, 429);
  }

  let ok = false, viaRecovery = false;
  if (admin) {
    ok = await verifyPassword(password, admin.password_hash);
    if (!ok && recoveryMatch) {
      ok = true;
      viaRecovery = true;
    }
  } else {
    await hashPassword(password); // equalise timing for unknown usernames
  }
  if (!ok) {
    await fail();
    await audit(env, username || null, "login_failed", "auth", { ip });
    return json({ ok: false, error: "invalid_credentials" }, 401);
  }

  if (admin.totp_enabled && !viaRecovery) {
    if (!code) return json({ ok: false, error: "totp_required", totpRequired: true }, 401);
    let secret = "";
    try {
      secret = await decryptTotp(env, admin.totp_secret_enc);
    } catch {
      /* fallthrough to invalid */
    }
    if (!secret || !(await verifyTotp(secret, code))) {
      await fail();
      return json({ ok: false, error: "totp_invalid", totpRequired: true }, 401);
    }
  }

  await run(env, "delete from aap_login_attempts where key in (?1,?2,?3)", pairKey, ipKey, userKey);
  if (viaRecovery) await run(env, "update aap_admins set must_change_password=1 where id=?1", admin.id);
  await run(env, "update aap_admins set last_login_at=?1,last_login_ip=?2 where id=?3", now, ip, admin.id);
  const { raw, csrf } = await createSession(request, env, admin.id);
  await audit(env, admin.username, viaRecovery ? "login_recovery" : "login", "auth", { ip });
  return json(
    {
      ok: true,
      csrf,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        displayName: admin.display_name,
        mustChangePassword: viaRecovery || !!admin.must_change_password,
        totpEnabled: !!admin.totp_enabled,
      },
    },
    200,
    { "set-cookie": sessionCookie(request, raw, SESSION_MAX / 1000) }
  );
}

// TOTP secrets are encrypted with the same machinery as API keys.
const totpMaterial = keyMaterial;
async function decryptTotp(env: AdminEnv, enc: string) {
  return decryptSecret(await totpMaterial(env), enc);
}

async function changePassword(request: Request, env: AdminEnv, s: AdminSession) {
  const body = await readJson(request, 8 * 1024).catch(() => null);
  if (!body) return json({ ok: false, error: "invalid_json" }, 400);
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");
  const newUsername = body.newUsername ? String(body.newUsername).trim().toLowerCase() : "";
  const admin = await first<any>(env, "select * from aap_admins where id=?1", s.admin_id);
  const recovery = typeof env.ADMIN_RECOVERY_PASSWORD === "string" ? env.ADMIN_RECOVERY_PASSWORD : "";
  const currentOk =
    (await verifyPassword(current, admin.password_hash)) ||
    (recovery.length >= 12 && admin.role === "owner" && timingSafeEqual(current, recovery));
  if (!currentOk) return json({ ok: false, error: "current_password_wrong", message: "Current password is incorrect." }, 400);
  const problem = validPassword(next);
  if (problem) return json({ ok: false, error: "weak_password", message: problem }, 400);
  if (await verifyPassword(next, admin.password_hash)) {
    return json({ ok: false, error: "same_password", message: "Choose a password you haven't used here." }, 400);
  }
  if (newUsername && newUsername !== admin.username) {
    if (!validUsername(newUsername)) {
      return json({ ok: false, error: "invalid_username", message: "Usernames are 3–32 letters, numbers, dots, dashes or underscores." }, 400);
    }
    const taken = await first(env, "select id from aap_admins where username=?1 and id<>?2", newUsername, admin.id);
    if (taken) return json({ ok: false, error: "username_taken", message: "That username is taken." }, 400);
  }
  await run(
    env,
    "update aap_admins set password_hash=?1,must_change_password=0,username=?2,updated_at=?3 where id=?4",
    await hashPassword(next),
    newUsername || admin.username,
    Date.now(),
    admin.id
  );
  // Sign out every other session for this admin.
  await run(env, "delete from aap_sessions where admin_id=?1 and id<>?2", admin.id, s.session_id);
  await audit(env, newUsername || admin.username, "password_changed", "auth", newUsername ? { renamedFrom: admin.username } : undefined);
  return json({ ok: true, username: newUsername || admin.username });
}

async function totpSetup(request: Request, env: AdminEnv, s: AdminSession) {
  const secret = newTotpSecret();
  await setSetting(env, "totp.pending." + s.admin_id, await encryptSecret(await totpMaterial(env), secret));
  const issuer = "Aafnai Patro";
  const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(s.username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
  return json({ ok: true, secret, uri });
}
async function totpEnable(request: Request, env: AdminEnv, s: AdminSession) {
  const body = await readJson(request, 4096).catch(() => ({}));
  const pending = await getSetting<string | null>(env, "totp.pending." + s.admin_id, null);
  if (!pending) return json({ ok: false, error: "no_pending_setup" }, 400);
  const secret = await decryptTotp(env, pending);
  if (!(await verifyTotp(secret, String(body?.code || "")))) {
    return json({ ok: false, error: "totp_invalid", message: "That code didn't match. Check the time on your phone and try the next code." }, 400);
  }
  await run(env, "update aap_admins set totp_secret_enc=?1,totp_enabled=1,updated_at=?2 where id=?3", pending, Date.now(), s.admin_id);
  await run(env, "delete from aap_settings where key=?1", "totp.pending." + s.admin_id);
  await audit(env, s.username, "totp_enabled", "auth");
  return json({ ok: true });
}
async function totpDisable(request: Request, env: AdminEnv, s: AdminSession) {
  const body = await readJson(request, 4096).catch(() => ({}));
  const admin = await first<any>(env, "select password_hash from aap_admins where id=?1", s.admin_id);
  if (!(await verifyPassword(String(body?.password || ""), admin.password_hash))) {
    return json({ ok: false, error: "current_password_wrong", message: "Password is incorrect." }, 400);
  }
  await run(env, "update aap_admins set totp_secret_enc=null,totp_enabled=0,updated_at=?1 where id=?2", Date.now(), s.admin_id);
  await audit(env, s.username, "totp_disabled", "auth");
  return json({ ok: true });
}

async function sessions(request: Request, env: AdminEnv, s: AdminSession) {
  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id") || "";
    await run(env, "delete from aap_sessions where id=?1 and admin_id=?2", id, s.admin_id);
    await audit(env, s.username, "session_revoked", "auth", { id });
    return json({ ok: true });
  }
  const rows = await all(
    env,
    "select id,created_at,last_seen_at,ip,user_agent from aap_sessions where admin_id=?1 and expires_at>?2 order by last_seen_at desc",
    s.admin_id,
    Date.now()
  );
  return json({ ok: true, current: s.session_id, sessions: rows });
}

async function admins(request: Request, env: AdminEnv, s: AdminSession) {
  if (request.method === "GET") {
    const rows = await all(
      env,
      "select id,username,role,display_name,totp_enabled,must_change_password,created_at,last_login_at from aap_admins order by created_at"
    );
    return json({ ok: true, admins: rows });
  }
  if (!hasRole(s, "owner")) return json({ ok: false, error: "owner_only" }, 403);
  const body = await readJson(request, 8 * 1024).catch(() => ({}));
  const roles: Role[] = ["owner", "editor", "viewer"];
  if (request.method === "POST") {
    const username = String(body?.username || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const role = roles.includes(body?.role) ? (body.role as Role) : "editor";
    if (!validUsername(username)) return json({ ok: false, error: "invalid_username", message: "Usernames are 3–32 letters, numbers, dots, dashes or underscores." }, 400);
    const problem = validPassword(password);
    if (problem) return json({ ok: false, error: "weak_password", message: problem }, 400);
    if (await first(env, "select id from aap_admins where username=?1", username)) {
      return json({ ok: false, error: "username_taken", message: "That username is taken." }, 400);
    }
    const now = Date.now();
    await run(
      env,
      "insert into aap_admins(id,username,password_hash,role,display_name,must_change_password,created_at,updated_at) values(?1,?2,?3,?4,?5,1,?6,?6)",
      crypto.randomUUID(), username, await hashPassword(password), role, body?.displayName ? String(body.displayName).slice(0, 80) : null, now
    );
    await audit(env, s.username, "admin_created", "admins", { username, role });
    return json({ ok: true });
  }
  const id = String(body?.id || new URL(request.url).searchParams.get("id") || "");
  const target = await first<any>(env, "select * from aap_admins where id=?1", id);
  if (!target) return json({ ok: false, error: "not_found" }, 404);
  const owners = Number((await first<any>(env, "select count(*) as c from aap_admins where role='owner'"))?.c || 0);
  if (request.method === "PATCH") {
    const role = roles.includes(body?.role) ? (body.role as Role) : target.role;
    if (target.role === "owner" && role !== "owner" && owners <= 1) {
      return json({ ok: false, error: "last_owner", message: "Keep at least one owner." }, 400);
    }
    let hash = target.password_hash, mustChange = target.must_change_password;
    if (body?.resetPassword) {
      const problem = validPassword(String(body.resetPassword));
      if (problem) return json({ ok: false, error: "weak_password", message: problem }, 400);
      hash = await hashPassword(String(body.resetPassword));
      mustChange = 1;
      await run(env, "delete from aap_sessions where admin_id=?1", id);
    }
    await run(env, "update aap_admins set role=?1,password_hash=?2,must_change_password=?3,updated_at=?4 where id=?5", role, hash, mustChange, Date.now(), id);
    await audit(env, s.username, "admin_updated", "admins", { username: target.username, role, passwordReset: !!body?.resetPassword });
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    if (id === s.admin_id) return json({ ok: false, error: "self_delete", message: "You can't remove your own account." }, 400);
    if (target.role === "owner" && owners <= 1) return json({ ok: false, error: "last_owner", message: "Keep at least one owner." }, 400);
    await run(env, "delete from aap_sessions where admin_id=?1", id);
    await run(env, "delete from aap_admins where id=?1", id);
    await audit(env, s.username, "admin_deleted", "admins", { username: target.username });
    return json({ ok: true });
  }
  return json({ ok: false, error: "method_not_allowed" }, 405);
}

/** Handles /api/aap/auth/* and /api/aap/admins. Returns null for other paths. */
export async function authRoutes(request: Request, env: AdminEnv, path: string): Promise<Response | null> {
  if (path === "/api/aap/auth/login" && request.method === "POST") return login(request, env);
  if (path === "/api/aap/auth/logout" && request.method === "POST") {
    const raw = cookieValue(request, COOKIE);
    if (raw) await run(env, "delete from aap_sessions where token_hash=?1", await sha256Hex(raw)).catch(() => {});
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(request, "", 0) });
  }
  const authPaths = ["/api/aap/auth/me", "/api/aap/auth/password", "/api/aap/auth/totp/setup", "/api/aap/auth/totp/enable", "/api/aap/auth/totp/disable", "/api/aap/auth/sessions", "/api/aap/admins"];
  if (!authPaths.includes(path)) return null;
  const s = await currentAdmin(request, env);
  if (!s) return json({ ok: false, error: "auth_required" }, 401);
  if (path === "/api/aap/auth/me") return json({ ok: true, csrf: s.csrf, admin: publicAdmin(s) });
  if (request.method !== "GET" && !checkCsrf(request, s)) return json({ ok: false, error: "csrf_failed" }, 403);
  if (path === "/api/aap/auth/password" && request.method === "POST") return changePassword(request, env, s);
  if (s.must_change_password) return json({ ok: false, error: "password_change_required" }, 403);
  if (path === "/api/aap/auth/totp/setup" && request.method === "POST") return totpSetup(request, env, s);
  if (path === "/api/aap/auth/totp/enable" && request.method === "POST") return totpEnable(request, env, s);
  if (path === "/api/aap/auth/totp/disable" && request.method === "POST") return totpDisable(request, env, s);
  if (path === "/api/aap/auth/sessions") return sessions(request, env, s);
  if (path === "/api/aap/admins") return admins(request, env, s);
  return json({ ok: false, error: "method_not_allowed" }, 405);
}

export function checkCsrf(request: Request, s: AdminSession) {
  const header = request.headers.get("x-aap-csrf") || "";
  return !!header && timingSafeEqual(header, s.csrf);
}
