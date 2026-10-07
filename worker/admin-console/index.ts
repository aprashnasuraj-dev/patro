// Aafnai Patro admin console — entry point.
//
//   export default withAdminConsole(connectedWorker)
//
// Before the site worker: /admin, /api/aap/*, maintenance, redirects,
// disabled features, Jyotish key bridge. After it: theme/label/banner
// injection + analytics beacon on HTML pages.
import { authRoutes, checkCsrf, currentAdmin, ensureBootstrapAdmin, hasRole, readCookie, COOKIE, type AdminSession, type Role } from "./auth";
import { all, audit, ensureSchema, first, getSetting, json, readJson, setSetting, type AdminEnv } from "./db";
import {
  configIsEmpty, discardDraft, FEATURE_CATALOG, FONT_CHOICES, injectIntoHtml, listVersions, loadConfig, loadPublishedConfig, normalizeConfig,
  preRoute, publishDraft, restoreVersion, runtimePayload, saveDraft, type SiteConfig,
} from "./site-config";
import { cloudflareEdge, live, prune, recordHit, stats, today } from "./analytics";
import { deleteUser, listUsers, revokeUserSessions, userSummary } from "./users";
import {
  aiEnvOverlay, aiRoutesJsonError, applyProposal, chat, cleanAiSettings, displayMessages, getAiSettings, listModels,
  PROVIDERS, resetAiOverlay, testProvider, type ProviderId,
} from "./ai";
import { deleteSecret, listSecretHints, putSecret, usingGeneratedKek } from "./secrets";

type Ctx = { waitUntil(p: Promise<unknown>): void; passThroughOnException?(): void };
type WorkerLike = { fetch: (req: Request, env: any, ctx: any) => Promise<Response> | Response; scheduled?: (c: any, env: any, ctx: any) => unknown; [k: string]: unknown };

const PREVIEW_COOKIE = "aap_preview";

// ---------- admin shell ----------

const SHELL_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";

function adminHeaders(extra: Record<string, string> = {}) {
  return {
    "content-security-policy": SHELL_CSP,
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-robots-tag": "noindex, nofollow, noarchive",
    "cache-control": "no-store",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    ...extra,
  };
}

function shell() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#123524">
<title>Admin · Aafnai Patro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Mukta:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/admin-console/app.css">
<link rel="icon" href="/favicon.ico">
</head>
<body>
<div id="app" aria-live="polite"><p class="boot">Loading admin…</p></div>
<noscript><p class="boot">The admin console needs JavaScript.</p></noscript>
<script src="/admin-console/app.js" defer></script>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", ...adminHeaders() } });
}

async function staticAsset(request: Request, env: AdminEnv, path: string) {
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  const res = await env.ASSETS.fetch(new Request(new URL(path, request.url).toString(), { method: "GET" }));
  if (!res.ok) return new Response("Not found", { status: 404 });
  const headers = new Headers(res.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("cache-control", path === "/aap/runtime.js" ? "public, max-age=300" : "no-cache");
  if (path.endsWith(".js")) headers.set("content-type", "text/javascript; charset=utf-8");
  if (path.endsWith(".css")) headers.set("content-type", "text/css; charset=utf-8");
  return new Response(request.method === "HEAD" ? null : res.body, { status: 200, headers });
}

// ---------- admin API ----------

function need(s: AdminSession, role: Role) {
  return hasRole(s, role) ? null : json({ ok: false, error: "forbidden", message: `This needs the ${role} role.` }, 403);
}

async function configPayload(env: AdminEnv) {
  const [d, p] = await Promise.all([loadConfig(env, "draft", true), loadConfig(env, "published", true)]);
  return {
    draft: d.config,
    published: p.config,
    publishedVersion: p.version,
    publishedAt: (p as any).updatedAt,
    publishedBy: (p as any).updatedBy,
    draftDirty: JSON.stringify(d.config) !== JSON.stringify(p.config),
    catalog: FEATURE_CATALOG,
    fonts: FONT_CHOICES,
  };
}

const ENV_FLAGS = [
  "ADMIN_SECRET", "ADMIN_RECOVERY_PASSWORD", "GOOGLE_CLIENT_ID", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "TV_RELAY_SECRET",
  "RADIO_RELAY_SECRET", "Groq_API", "GROQ_API_KEY", "nvidia_api", "NVIDIA_API_KEY", "NASA_API_KEY", "CRON_SECRET",
];

async function health(env: AdminEnv) {
  const started = Date.now();
  let d1 = false, contentRecords: number | null = null;
  try {
    await first(env, "select 1 as ok");
    d1 = true;
    contentRecords = Number((await first<any>(env, "select count(*) as c from content_records"))?.c ?? 0);
  } catch {
    /* table may be missing */
  }
  const tables = await all<any>(env, "select name from sqlite_master where type='table' order by name").catch(() => []);
  const names = new Set(tables.map((t: any) => t.name));
  return {
    d1, d1LatencyMs: Date.now() - started, contentRecords,
    tables: { identity: names.has("app_users"), push: names.has("push_subscriptions"), holidays: names.has("holiday_overrides"), console: names.has("aap_admins") },
    env: Object.fromEntries(ENV_FLAGS.map((k) => [k, typeof env[k] === "string" && (env[k] as string).length > 0])),
    usingGeneratedKey: usingGeneratedKek(env),
    siteUrl: env.PUBLIC_SITE_URL || null,
    calendarSource: (env as any).CALENDAR_SOURCE_VERSION || null,
  };
}

async function api(request: Request, env: AdminEnv, ctx: Ctx, path: string): Promise<Response> {
  if (path === "/api/aap/hit") {
    if (request.method !== "POST") return json({ ok: false }, 405);
    const cfg = (await loadPublishedConfig(env, ctx)).config;
    if (!cfg.analytics.enabled) return new Response(null, { status: 204 });
    return recordHit(request, env);
  }
  if (path === "/api/aap/site-config" && request.method === "GET") {
    let preview = false;
    if (readCookie(request, PREVIEW_COOKIE) === "1" && (await currentAdmin(request, env))) preview = true;
    const entry = preview ? await loadConfig(env, "draft", true) : await loadPublishedConfig(env, ctx);
    return json(runtimePayload(entry.config, entry.version, preview), 200, { "cache-control": preview ? "no-store" : "public, max-age=15" });
  }

  await ensureBootstrapAdmin(env);
  const authRes = await authRoutes(request, env, path);
  if (authRes) return authRes;

  const s = await currentAdmin(request, env);
  if (!s) return json({ ok: false, error: "auth_required" }, 401);
  if (request.method !== "GET" && !checkCsrf(request, s)) return json({ ok: false, error: "csrf_failed" }, 403);
  if (s.must_change_password) return json({ ok: false, error: "password_change_required" }, 403);
  const url = new URL(request.url);
  const q = url.searchParams;
  const body = request.method === "GET" || request.method === "DELETE" ? {} : await readJson(request).catch(() => null);
  if (body === null) return json({ ok: false, error: "invalid_json" }, 400);
  const M = request.method;

  // Dashboard
  if (path === "/api/aap/dashboard" && M === "GET") {
    const [t, l, week, users, cfg, recent, pending] = await Promise.all([
      today(env), live(env), stats(env, "7d"), userSummary(env), configPayload(env),
      all(env, "select ts,admin,action,target from aap_audit order by id desc limit 8"),
      first<any>(env, "select count(*) as c from aap_ai_proposals where status='pending'"),
    ]);
    return json({
      ok: true, today: t, live: { activeNow: l.activeNow, signedInNow: l.signedInNow, paths: l.paths.slice(0, 5) },
      week: { totals: week.totals, previous: week.previous, series: week.series, paths: week.paths.slice(0, 6), countries: week.countries.slice(0, 6) },
      users, site: { publishedVersion: cfg.publishedVersion, publishedAt: cfg.publishedAt, draftDirty: cfg.draftDirty, maintenance: cfg.published.maintenance.enabled },
      recent, pendingProposals: Number(pending?.c || 0),
    });
  }

  // Analytics
  if (path === "/api/aap/analytics" && M === "GET") return json({ ok: true, ...(await stats(env, q.get("range") || "7d")) });
  if (path === "/api/aap/analytics/live" && M === "GET") return json({ ok: true, ...(await live(env)) });
  if (path === "/api/aap/analytics/cloudflare" && M === "GET") {
    try {
      return json({ ok: true, ...(await cloudflareEdge(env, Number(q.get("days") || 7))) });
    } catch (e) {
      return json({ ok: false, configured: true, error: String((e as Error).message || e) });
    }
  }

  // Users
  if (path === "/api/aap/users/summary" && M === "GET") return json({ ok: true, ...(await userSummary(env)) });
  if (path === "/api/aap/users" && M === "GET") {
    try {
      return json({ ok: true, ...(await listUsers(env, (q.get("q") || "").slice(0, 80), Number(q.get("page") || 0))) });
    } catch {
      return json({ ok: true, users: [], hasMore: false, unavailable: true });
    }
  }
  if (path === "/api/aap/users/revoke" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    await revokeUserSessions(env, String(body.id || ""), s.username);
    return json({ ok: true });
  }
  if (path === "/api/aap/users" && M === "DELETE") {
    const f = need(s, "owner"); if (f) return f;
    return json({ ok: await deleteUser(env, String(q.get("id") || ""), s.username) });
  }

  // Site config
  if (path === "/api/aap/config" && M === "GET") return json({ ok: true, ...(await configPayload(env)) });
  if (path === "/api/aap/config" && M === "PUT") {
    const f = need(s, "editor"); if (f) return f;
    const saved = await saveDraft(env, normalizeConfig(body.config), s.username);
    await audit(env, s.username, "save_draft", "site_config", { section: String(body.section || "").slice(0, 40) || undefined });
    void saved;
    return json({ ok: true, ...(await configPayload(env)) });
  }
  if (path === "/api/aap/config/publish" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    const version = await publishDraft(env, s.username, String(body.note || ""));
    return json({ ok: true, version, ...(await configPayload(env)) });
  }
  if (path === "/api/aap/config/discard" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    await discardDraft(env, s.username);
    return json({ ok: true, ...(await configPayload(env)) });
  }
  if (path === "/api/aap/config/versions" && M === "GET") return json({ ok: true, versions: await listVersions(env) });
  if (path === "/api/aap/config/restore" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    const cfg = await restoreVersion(env, Number(body.id), s.username);
    return cfg ? json({ ok: true, ...(await configPayload(env)) }) : json({ ok: false, error: "not_found" }, 404);
  }
  if (path === "/api/aap/config/import" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    await saveDraft(env, normalizeConfig(body.config), s.username);
    await audit(env, s.username, "import", "site_config");
    return json({ ok: true, ...(await configPayload(env)) });
  }
  if (path === "/api/aap/preview" && M === "POST") {
    const secure = url.protocol === "https:" ? "; Secure" : "";
    const cookie = body.on ? `${PREVIEW_COOKIE}=1; Path=/; SameSite=Strict${secure}` : `${PREVIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
    return json({ ok: true, preview: !!body.on }, 200, { "set-cookie": cookie });
  }

  // AI agent
  if (path === "/api/aap/ai/settings" && M === "GET") {
    const [settings, hints] = await Promise.all([getAiSettings(env), listSecretHints(env)]);
    const providers = (Object.keys(PROVIDERS) as ProviderId[]).map((id) => {
      const hint = hints.find((h) => h.name === "ai." + id);
      return { id, ...PROVIDERS[id], hasKey: !!hint, hint: hint?.hint || null, keyUpdatedAt: hint?.updated_at || null };
    });
    return json({ ok: true, settings, providers });
  }
  if (path === "/api/aap/ai/settings" && M === "PUT") {
    const f = need(s, "editor"); if (f) return f;
    const next = cleanAiSettings(body.settings, await getAiSettings(env));
    await setSetting(env, "ai", next);
    resetAiOverlay();
    await audit(env, s.username, "ai_settings", "ai", { provider: next.provider, autoApply: next.autoApply });
    return json({ ok: true, settings: next });
  }
  if (path === "/api/aap/ai/key" && (M === "PUT" || M === "DELETE")) {
    const f = need(s, "owner"); if (f) return f;
    const provider = String(M === "PUT" ? body.provider : q.get("provider")) as ProviderId;
    if (!(provider in PROVIDERS)) return json({ ok: false, error: "unknown_provider" }, 400);
    if (M === "PUT") {
      const key = String(body.key || "").trim();
      if (key.length < 8 || key.length > 400 || /\s/.test(key)) return json({ ok: false, error: "invalid_key", message: "That doesn't look like an API key." }, 400);
      await putSecret(env, "ai." + provider, key, s.username);
    } else await deleteSecret(env, "ai." + provider);
    resetAiOverlay();
    await audit(env, s.username, M === "PUT" ? "ai_key_saved" : "ai_key_removed", "ai", { provider });
    return json({ ok: true });
  }
  if (path === "/api/aap/ai/test" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    try {
      return json(await testProvider(env, String(body.provider) as ProviderId));
    } catch (e) {
      return aiRoutesJsonError(e);
    }
  }
  if (path === "/api/aap/ai/models" && M === "GET") {
    const f = need(s, "editor"); if (f) return f;
    try {
      return json({ ok: true, models: await listModels(env, String(q.get("provider")) as ProviderId) });
    } catch (e) {
      return aiRoutesJsonError(e);
    }
  }
  if (path === "/api/aap/ai/chat" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    const message = String(body.message || "").trim();
    if (!message) return json({ ok: false, error: "empty_message" }, 400);
    try {
      return json({ ok: true, ...(await chat(env, { id: s.admin_id, username: s.username }, body.threadId ? String(body.threadId) : null, message)) });
    } catch (e) {
      return aiRoutesJsonError(e);
    }
  }
  if (path === "/api/aap/ai/threads" && M === "GET") {
    return json({ ok: true, threads: await all(env, "select id,title,created_at,updated_at from aap_ai_threads order by updated_at desc limit 50") });
  }
  if (path === "/api/aap/ai/thread" && M === "GET") {
    const t = await first<any>(env, "select * from aap_ai_threads where id=?1", q.get("id") || "");
    if (!t) return json({ ok: false, error: "not_found" }, 404);
    const proposals = await all(env, "select id,tool,args,summary,status,created_at,decided_at,decided_by from aap_ai_proposals where thread_id=?1 order by created_at", t.id);
    return json({ ok: true, thread: { id: t.id, title: t.title, messages: displayMessages(t.messages) }, proposals });
  }
  if (path === "/api/aap/ai/thread" && M === "DELETE") {
    const f = need(s, "editor"); if (f) return f;
    const id = q.get("id") || "";
    await env.DB.batch([
      env.DB.prepare("delete from aap_ai_threads where id=?1").bind(id),
      env.DB.prepare("delete from aap_ai_proposals where thread_id=?1 and status<>'applied'").bind(id),
    ]);
    return json({ ok: true });
  }
  if (path === "/api/aap/ai/proposals" && M === "GET") {
    return json({ ok: true, proposals: await all(env, "select id,thread_id,tool,summary,status,created_at from aap_ai_proposals where status='pending' order by created_at desc limit 50") });
  }
  if (path === "/api/aap/ai/proposal" && M === "POST") {
    const f = need(s, "editor"); if (f) return f;
    const p = await first<any>(env, "select * from aap_ai_proposals where id=?1", String(body.id || ""));
    if (!p) return json({ ok: false, error: "not_found" }, 404);
    if (p.status !== "pending") return json({ ok: false, error: "already_decided", message: "This proposal was already " + p.status + "." }, 409);
    if (body.action === "reject") {
      await env.DB.prepare("update aap_ai_proposals set status='rejected',decided_at=?1,decided_by=?2 where id=?3").bind(Date.now(), s.username, p.id).run();
      return json({ ok: true, status: "rejected" });
    }
    try {
      const note = await applyProposal(env, p.tool, JSON.parse(p.args), s.username);
      await env.DB.prepare("update aap_ai_proposals set status='applied',decided_at=?1,decided_by=?2 where id=?3").bind(Date.now(), s.username, p.id).run();
      await audit(env, s.username, "ai_proposal_applied", "site_config", { tool: p.tool, summary: p.summary });
      return json({ ok: true, status: "applied", note });
    } catch (e) {
      return json({ ok: false, error: "apply_failed", message: String((e as Error).message || e) }, 400);
    }
  }

  // Activity, settings, health
  if (path === "/api/aap/audit" && M === "GET") {
    const before = Number(q.get("before") || 0) || Number.MAX_SAFE_INTEGER;
    const rows = await all(env, "select id,ts,admin,action,target,detail from aap_audit where id<?1 order by id desc limit 100", before);
    return json({ ok: true, items: rows });
  }
  if (path === "/api/aap/settings" && M === "GET") {
    const hints = await listSecretHints(env);
    return json({
      ok: true,
      retentionDays: await getSetting(env, "analytics.retention_days", 90),
      cloudflareZoneId: await getSetting(env, "cloudflare.zone_id", ""),
      cloudflareToken: hints.find((h) => h.name === "cloudflare.api_token")?.hint || null,
      usingGeneratedKey: usingGeneratedKek(env),
    });
  }
  if (path === "/api/aap/settings" && M === "PUT") {
    const f = need(s, "owner"); if (f) return f;
    if (body.retentionDays !== undefined) await setSetting(env, "analytics.retention_days", Math.max(7, Math.min(400, Number(body.retentionDays) || 90)));
    if (body.cloudflareZoneId !== undefined) await setSetting(env, "cloudflare.zone_id", String(body.cloudflareZoneId).replace(/[^a-f0-9]/gi, "").slice(0, 64));
    if (typeof body.cloudflareToken === "string") {
      if (body.cloudflareToken.trim()) await putSecret(env, "cloudflare.api_token", body.cloudflareToken.trim(), s.username);
      else await deleteSecret(env, "cloudflare.api_token");
    }
    await audit(env, s.username, "settings_updated", "settings", { retentionDays: body.retentionDays, cloudflareZoneId: body.cloudflareZoneId ? "set" : undefined });
    return json({ ok: true });
  }
  if (path === "/api/aap/health" && M === "GET") return json({ ok: true, ...(await health(env)) });

  return json({ ok: false, error: "not_found" }, 404);
}

// ---------- public site layer ----------

function isPageRequest(path: string) {
  return !path.startsWith("/api/") && !path.startsWith("/assets/") && !path.startsWith("/compat-api/") && !/\.[a-z0-9]{2,8}$/i.test(path);
}

async function decorate(request: Request, response: Response, config: SiteConfig, version: number, preview: boolean) {
  if (request.method !== "GET" || response.status !== 200) return response;
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("text/html")) return response;
  if (configIsEmpty(config) && !config.analytics.enabled && !preview) return response;
  let out = injectIntoHtml(response, config, version, preview);
  if (preview) {
    out = new Response(out.body, out);
    const csp = out.headers.get("content-security-policy");
    if (csp) out.headers.set("content-security-policy", csp.replace(/frame-ancestors[^;]*/i, "frame-ancestors 'self'"));
    out.headers.delete("x-frame-options");
    out.headers.set("cache-control", "private, no-store");
  }
  return out;
}

export function withAdminConsole<W extends WorkerLike>(worker: W): W {
  return {
    ...worker,
    async fetch(request: Request, env: AdminEnv, ctx: Ctx) {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/admin" || path === "/admin/" || (path.startsWith("/admin/") && !path.startsWith("/admin/community-suites"))) {
        if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
        return shell();
      }
      if (path.startsWith("/admin-console/") || ["/aap/runtime.js", "/aap/analytics.js", "/aap/settings.js"].includes(path)) return staticAsset(request, env, path);
      if (path.startsWith("/api/aap/")) {
        if (!env.DB) return json({ ok: false, error: "d1_unavailable", message: "The D1 database binding DB is missing." }, 503);
        try {
          if (path !== "/api/aap/site-config") await ensureSchema(env);
          const res = await api(request, env, ctx, path);
          if (path.startsWith("/api/aap/hit") || path === "/api/aap/site-config") return res;
          const headers = new Headers(res.headers);
          for (const [k, v] of Object.entries(adminHeaders())) if (!headers.has(k) || k === "cache-control") headers.set(k, v);
          return new Response(res.body, { status: res.status, headers });
        } catch (e) {
          console.error("aap_api_error", path, e);
          return json({ ok: false, error: "server_error", message: String((e as Error)?.message || e) }, 500);
        }
      }

      // Public site — never let the admin layer take the site down.
      if (!env.DB) return worker.fetch(request, env, ctx);
      const page = isPageRequest(path);
      const jyotish = path === "/api/jyotish-chat" || path === "/api/v1/jyotish-chat";
      if (!page && !jyotish) return worker.fetch(request, env, ctx);

      let config: SiteConfig | null = null, version = 0, preview = false, isAdmin = false;
      try {
        const pub = await loadPublishedConfig(env, ctx);
        config = pub.config;
        version = pub.version;
        const wantsPreview = readCookie(request, PREVIEW_COOKIE) === "1";
        const hasAdminCookie = !!readCookie(request, COOKIE);
        const mightNeedAdmin = wantsPreview || config.maintenance.enabled || config.features.some((f) => !f.enabled);
        if (page && hasAdminCookie && mightNeedAdmin) isAdmin = !!(await currentAdmin(request, env));
        if (wantsPreview && isAdmin) {
          const draft = await loadConfig(env, "draft", true);
          config = draft.config;
          preview = true;
        }
      } catch (e) {
        console.error("aap_layer_error", e);
        return worker.fetch(request, env, ctx);
      }

      if (page) {
        const pre = preRoute(request, config, isAdmin);
        if (pre) return pre;
      }
      let innerEnv: AdminEnv = env;
      if (jyotish) {
        const overlay = await aiEnvOverlay(env);
        if (Object.keys(overlay).length) innerEnv = { ...env, ...overlay };
      }
      const response = await worker.fetch(request, innerEnv, ctx);
      if (!page) return response;
      try {
        return await decorate(request, response, config, version, preview);
      } catch (e) {
        console.error("aap_decorate_error", e);
        return response;
      }
    },
    async scheduled(controller: any, env: AdminEnv, ctx: Ctx) {
      // Scheduled independently first so a failure in the site's own jobs can't skip it.
      if (String(controller?.cron || "") === "43 2 * * *" && env.DB) {
        ctx.waitUntil(ensureSchema(env).then(() => prune(env)).catch((e) => console.error("aap_prune_error", e)));
      }
      if (worker.scheduled) await worker.scheduled(controller, env, ctx);
    },
  } as W;
}
