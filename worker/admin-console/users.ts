// Aafnai Patro admin console — people who signed in to the public site
// (Google login → app_users / auth_sessions, created by worker/auth.ts).
import { all, audit, first, json, type AdminEnv } from "./db";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function userSummary(env: AdminEnv) {
  const n = async (sql: string) => Number((await first<any>(env, sql))?.c || 0);
  const available = await safe(async () => (await n("select count(*) as c from app_users"), true), false);
  if (!available) return { available: false };
  const [total, new7, new30, activeNow, active24h, active7d, push, families] = await Promise.all([
    n("select count(*) as c from app_users"),
    n("select count(*) as c from app_users where created_at>=datetime('now','-7 days')"),
    n("select count(*) as c from app_users where created_at>=datetime('now','-30 days')"),
    n("select count(distinct user_id) as c from auth_sessions where last_seen_at>=datetime('now','-15 minutes')"),
    n("select count(distinct user_id) as c from auth_sessions where last_seen_at>=datetime('now','-1 day')"),
    n("select count(distinct user_id) as c from auth_sessions where last_seen_at>=datetime('now','-7 days')"),
    safe(() => n("select count(*) as c from push_subscriptions"), 0),
    safe(() => n("select count(*) as c from families"), 0),
  ]);
  return { available: true, total, new7, new30, activeNow, active24h, active7d, pushSubscriptions: push, families };
}

export async function listUsers(env: AdminEnv, q: string, page: number) {
  const limit = 50, offset = Math.max(0, page) * limit;
  const like = "%" + q.replace(/[%_]/g, "") + "%";
  const rows = await all<any>(
    env,
    `select u.id,u.email,u.display_name,u.picture_url,u.created_at,
            (select max(last_seen_at) from auth_sessions s where s.user_id=u.id) as last_seen_at,
            (select count(*) from auth_sessions s where s.user_id=u.id and s.expires_at>datetime('now')) as sessions
       from app_users u
      where (?1='' or u.email like ?2 or u.display_name like ?2)
      order by coalesce(last_seen_at,u.created_at) desc
      limit ?3 offset ?4`,
    q, like, limit + 1, offset
  );
  return { users: rows.slice(0, limit), hasMore: rows.length > limit, page };
}

export async function revokeUserSessions(env: AdminEnv, userId: string, by: string) {
  await env.DB.prepare("delete from auth_sessions where user_id=?1").bind(userId).run();
  await audit(env, by, "user_sessions_revoked", "site_user", { userId });
}

export async function deleteUser(env: AdminEnv, userId: string, by: string) {
  const user = await first<any>(env, "select email from app_users where id=?1", userId);
  if (!user) return false;
  const statements = [
    "delete from notification_jobs where device_id in (select device_id from push_subscriptions where user_id=?1)",
    "delete from push_subscriptions where user_id=?1",
    "delete from personal_ics_tokens where user_id=?1",
    "delete from user_community_preferences where user_id=?1",
    "delete from family_members where user_id=?1",
    "delete from user_calendar_state where user_id=?1",
    "delete from auth_sessions where user_id=?1",
    "delete from app_users where id=?1",
  ];
  // Run individually so a missing optional table doesn't abort the deletion.
  for (const sql of statements) await safe(() => env.DB.prepare(sql).bind(userId).run(), null);
  await audit(env, by, "user_deleted", "site_user", { userId, email: user.email });
  return true;
}

export function usersJson(data: unknown) {
  return json({ ok: true, ...(data as object) });
}
