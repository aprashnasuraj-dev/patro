// Aafnai Patro admin console — live site configuration.
//
// Everything editable from /admin lives in one JSON document with two slots:
//   draft      — what the admin is editing (visible only in Preview)
//   published  — what visitors get
// Publishing snapshots the document into aap_config_versions so any earlier
// state can be restored. The Worker applies the published document to every
// HTML response at the edge, so no rebuild or git push is needed.
import { all, audit, first, run, type AdminEnv } from "./db";

export type LabelRule = { from: string; to: string; match: "exact" | "contains" };
export type FeatureRule = { path: string; enabled: boolean; hideInNav: boolean; redirectTo: string };
export type RedirectRule = { from: string; to: string; status: 301 | 302 };
export type ThemeVars = {
  accent?: string; accentStrong?: string; accentSoft?: string;
  background?: string; surface?: string; text?: string; muted?: string; line?: string;
  holiday?: string; festival?: string;
};
export type SiteConfig = {
  theme: { light: ThemeVars; dark: ThemeVars; radius: number | null; font: string };
  labels: LabelRule[];
  features: FeatureRule[];
  banner: { enabled: boolean; id: string; text: string; linkText: string; linkUrl: string; tone: "info" | "festive" | "alert"; dismissible: boolean };
  redirects: RedirectRule[];
  maintenance: { enabled: boolean; title: string; message: string; allowPaths: string[] };
  customCss: string;
  customHead: string;
  analytics: { enabled: boolean };
};

export const DEFAULT_CONFIG: SiteConfig = {
  theme: { light: {}, dark: {}, radius: null, font: "" },
  labels: [],
  features: [],
  banner: { enabled: false, id: "b1", text: "", linkText: "", linkUrl: "", tone: "info", dismissible: true },
  redirects: [],
  maintenance: {
    enabled: false,
    title: "आफ्नै पात्रो केही बेरमा फर्किन्छ",
    message: "We're making improvements. Please check back in a few minutes.",
    allowPaths: [],
  },
  customCss: "",
  customHead: "",
  analytics: { enabled: true },
};

/** Known site sections, so the admin can toggle/rename without memorising paths. */
export const FEATURE_CATALOG: { path: string; name: string; ne: string }[] = [
  { path: "/rashifal", name: "Rashifal", ne: "राशिफल" },
  { path: "/convert", name: "Date converter", ne: "मिति रूपान्तरण" },
  { path: "/tools", name: "All tools", ne: "उपकरणहरू" },
  { path: "/tools/astro", name: "Astronomy", ne: "खगोल" },
  { path: "/fm", name: "FM radio", ne: "एफएम" },
  { path: "/tv", name: "Live TV", ne: "टिभी" },
  { path: "/samachar", name: "News", ne: "समाचार" },
  { path: "/time-machine", name: "Time machine", ne: "टाइम मेसिन" },
  { path: "/on-this-day", name: "On this day", ne: "आजकै दिन" },
  { path: "/janmapatro", name: "Janma patro (birth chart)", ne: "चिना" },
  { path: "/janmapatro/milan.html", name: "Matchmaking", ne: "गुण मिलान" },
  { path: "/samudaya", name: "Community calendars", ne: "समुदाय" },
  { path: "/nepal-sambat/mandala", name: "Nepal Sambat", ne: "नेपाल सम्वत्" },
  { path: "/tools/sait", name: "Sait finder", ne: "साइत" },
  { path: "/tools/baby-names", name: "Baby names", ne: "बच्चाको नाम" },
  { path: "/tools/janmadin-akhbar", name: "Birthday newspaper", ne: "जन्मदिन अखबार" },
  { path: "/tools/future-letter", name: "Letter to the future", ne: "भविष्यको चिठी" },
  { path: "/tools/spell-check", name: "Nepali spell check", ne: "हिज्जे जाँच" },
  { path: "/tools/voice-typing", name: "Voice typing", ne: "बोली टाइपिङ" },
  { path: "/tools/ocr", name: "Nepali OCR", ne: "नेपाली OCR" },
  { path: "/tools/name-check", name: "Name check", ne: "नाम जाँच" },
  { path: "/tools/read-aloud", name: "Read aloud", ne: "पढेर सुनाउने" },
  { path: "/tools/patro-bot", name: "Patro bot", ne: "पात्रो बोट" },
  { path: "/nepali-typing", name: "Nepali typing", ne: "नेपाली टाइपिङ" },
  { path: "/me", name: "My space (diary, notes, family)", ne: "मेरो ठाउँ" },
];

export const FONT_CHOICES: Record<string, string> = {
  "": "Site default (Mukta)",
  "Noto Sans Devanagari": "Noto Sans Devanagari",
  "Hind": "Hind",
  "Poppins": "Poppins",
  "Baloo 2": "Baloo 2",
  "Tiro Devanagari Hindi": "Tiro Devanagari (serif)",
  "Inter": "Inter",
};

const PROTECTED_PREFIXES = ["/admin", "/api", "/assets", "/admin-console", "/aap", "/sw.js", "/manifest.webmanifest"];

// ---------- validation ----------

const str = (v: unknown, max: number) => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, max);
const bool = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const hex = (v: unknown) => {
  const s = str(v, 9).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s.toLowerCase() : undefined;
};
export function cleanPath(v: unknown) {
  let s = str(v, 300).trim();
  if (!s) return "";
  try {
    if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
  } catch {
    return "";
  }
  if (!s.startsWith("/")) s = "/" + s;
  s = s.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  return /^[\/\w\-.~%\u0900-\u097F]+$/.test(s) ? s : "";
}
function cleanTarget(v: unknown) {
  const s = str(v, 500).trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return cleanPath(s);
}
export function isProtectedPath(path: string) {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || (p.includes(".") && path === p));
}

function cleanTheme(v: any): ThemeVars {
  const out: ThemeVars = {};
  for (const k of ["accent", "accentStrong", "accentSoft", "background", "surface", "text", "muted", "line", "holiday", "festival"] as const) {
    const h = hex(v?.[k]);
    if (h) out[k] = h;
  }
  return out;
}

export function normalizeConfig(input: any): SiteConfig {
  const c = input && typeof input === "object" ? input : {};
  const labels: LabelRule[] = [];
  const seenLabel = new Set<string>();
  for (const r of Array.isArray(c.labels) ? c.labels.slice(0, 400) : []) {
    const from = str(r?.from, 200).trim(), to = str(r?.to, 200);
    if (!from || seenLabel.has(from)) continue;
    seenLabel.add(from);
    labels.push({ from, to, match: r?.match === "contains" ? "contains" : "exact" });
  }
  const features: FeatureRule[] = [];
  const seenFeature = new Set<string>();
  for (const f of Array.isArray(c.features) ? c.features.slice(0, 200) : []) {
    const path = cleanPath(f?.path);
    if (!path || path === "/" || isProtectedPath(path) || seenFeature.has(path)) continue;
    seenFeature.add(path);
    const enabled = bool(f?.enabled, true), hideInNav = bool(f?.hideInNav, false);
    if (enabled && !hideInNav) continue; // nothing to do — keep the document small
    features.push({ path, enabled, hideInNav: hideInNav || !enabled, redirectTo: cleanPath(f?.redirectTo) || "/" });
  }
  const redirects: RedirectRule[] = [];
  const seenRedirect = new Set<string>();
  for (const r of Array.isArray(c.redirects) ? c.redirects.slice(0, 300) : []) {
    const from = cleanPath(r?.from), to = cleanTarget(r?.to);
    if (!from || !to || from === to || isProtectedPath(from) || seenRedirect.has(from)) continue;
    seenRedirect.add(from);
    redirects.push({ from, to, status: Number(r?.status) === 302 ? 302 : 301 });
  }
  const tone = ["info", "festive", "alert"].includes(c.banner?.tone) ? c.banner.tone : "info";
  const linkUrl = cleanTarget(c.banner?.linkUrl);
  const radius = c.theme?.radius == null || c.theme?.radius === "" ? null : Math.max(0, Math.min(28, Math.round(Number(c.theme.radius) || 0)));
  const font = Object.prototype.hasOwnProperty.call(FONT_CHOICES, c.theme?.font) ? c.theme.font : "";
  return {
    theme: { light: cleanTheme(c.theme?.light), dark: cleanTheme(c.theme?.dark), radius, font },
    labels,
    features,
    banner: {
      enabled: bool(c.banner?.enabled),
      id: str(c.banner?.id, 40).replace(/[^\w-]/g, "") || "b1",
      text: str(c.banner?.text, 400),
      linkText: str(c.banner?.linkText, 60),
      linkUrl,
      tone,
      dismissible: bool(c.banner?.dismissible, true),
    },
    redirects,
    maintenance: {
      enabled: bool(c.maintenance?.enabled),
      title: str(c.maintenance?.title, 160) || DEFAULT_CONFIG.maintenance.title,
      message: str(c.maintenance?.message, 1000) || DEFAULT_CONFIG.maintenance.message,
      allowPaths: (Array.isArray(c.maintenance?.allowPaths) ? c.maintenance.allowPaths : []).map(cleanPath).filter(Boolean).slice(0, 50),
    },
    customCss: str(c.customCss, 60_000),
    customHead: str(c.customHead, 20_000),
    analytics: { enabled: bool(c.analytics?.enabled, true) },
  };
}

// ---------- storage + cache ----------

type Slot = "draft" | "published";
const memo: Record<Slot, { at: number; version: number; config: SiteConfig } | undefined> = { draft: undefined, published: undefined };
const CACHE_MS = 20_000;

export async function loadConfig(env: AdminEnv, slot: Slot, fresh = false) {
  const cached = memo[slot];
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached;
  const row = await first<any>(env, "select json,version,updated_at,updated_by from aap_config where slot=?1", slot);
  let config = DEFAULT_CONFIG;
  if (row) {
    try {
      config = normalizeConfig(JSON.parse(row.json));
    } catch {
      config = DEFAULT_CONFIG;
    }
  } else if (slot === "draft") {
    return loadConfig(env, "published", fresh); // draft starts as a copy of published
  }
  const entry = { at: Date.now(), version: Number(row?.version || 0), config, updatedAt: row?.updated_at || null, updatedBy: row?.updated_by || null };
  memo[slot] = entry;
  return entry;
}

export function invalidateConfigCache() {
  memo.draft = undefined;
  memo.published = undefined;
}

export async function saveDraft(env: AdminEnv, config: SiteConfig, by: string) {
  const cfg = normalizeConfig(config);
  await run(
    env,
    "insert into aap_config(slot,json,version,updated_at,updated_by) values('draft',?1,0,?2,?3) on conflict(slot) do update set json=excluded.json,updated_at=excluded.updated_at,updated_by=excluded.updated_by",
    JSON.stringify(cfg), Date.now(), by
  );
  memo.draft = undefined;
  return cfg;
}

export async function publishDraft(env: AdminEnv, by: string, note: string) {
  const draft = (await loadConfig(env, "draft", true)).config;
  const current = await loadConfig(env, "published", true);
  const version = current.version + 1;
  const body = JSON.stringify(draft);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      "insert into aap_config(slot,json,version,updated_at,updated_by) values('published',?1,?2,?3,?4) on conflict(slot) do update set json=excluded.json,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by"
    ).bind(body, version, now, by),
    env.DB.prepare("insert into aap_config_versions(version,json,note,created_at,created_by) values(?1,?2,?3,?4,?5)").bind(version, body, note.slice(0, 300) || null, now, by),
  ]);
  invalidateConfigCache();
  await audit(env, by, "publish", "site_config", { version, note });
  return version;
}

export async function discardDraft(env: AdminEnv, by: string) {
  await run(env, "delete from aap_config where slot='draft'");
  invalidateConfigCache();
  await audit(env, by, "discard_draft", "site_config");
}

export async function listVersions(env: AdminEnv) {
  return all(env, "select id,version,note,created_at,created_by,length(json) as size from aap_config_versions order by id desc limit 100");
}

export async function restoreVersion(env: AdminEnv, id: number, by: string) {
  const row = await first<any>(env, "select version,json from aap_config_versions where id=?1", id);
  if (!row) return null;
  const cfg = await saveDraft(env, normalizeConfig(JSON.parse(row.json)), by);
  await audit(env, by, "restore_to_draft", "site_config", { fromVersion: row.version });
  return cfg;
}

export function configIsEmpty(c: SiteConfig) {
  return (
    !Object.keys(c.theme.light).length && !Object.keys(c.theme.dark).length && c.theme.radius == null && !c.theme.font &&
    !c.labels.length && !c.features.length && !c.banner.enabled && !c.customCss.trim() && !c.customHead.trim()
  );
}

// ---------- rendering ----------

const VAR_MAP: Record<keyof ThemeVars, string[]> = {
  accent: ["--brand-600", "--brand-500", "--patro-accent"],
  accentStrong: ["--brand-700"],
  accentSoft: ["--brand-50", "--panel-soft"],
  background: ["--surface-2", "--bg"],
  surface: ["--surface", "--panel", "--panel-strong"],
  text: ["--ink-900", "--ink"],
  muted: ["--ink-600", "--muted"],
  line: ["--line"],
  holiday: ["--holiday", "--danger"],
  festival: ["--festival", "--warning"],
};

function varsBlock(t: ThemeVars) {
  const decls: string[] = [];
  for (const [k, names] of Object.entries(VAR_MAP) as [keyof ThemeVars, string[]][]) {
    const v = t[k];
    if (v) for (const n of names) decls.push(`${n}:${v}`);
  }
  return decls.join(";");
}

export function themeCss(c: SiteConfig) {
  const parts: string[] = [];
  const light = varsBlock(c.theme.light), dark = varsBlock(c.theme.dark);
  if (light) {
    parts.push(`@media not all and (prefers-color-scheme:dark){:root:not([data-theme="dark"]){${light}}}`);
    parts.push(`@media (prefers-color-scheme:dark){:root[data-theme="light"]{${light}}}`);
  }
  if (dark) {
    parts.push(`:root[data-theme="dark"]{${dark}}`);
    parts.push(`@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}`);
  }
  if (c.theme.radius != null) {
    const r = c.theme.radius;
    parts.push(`:root{--radius:${r}px;--radius-sm:${Math.round(r * 0.66)}px;--radius-lg:${Math.round(r * 1.33)}px}`);
  }
  if (c.theme.font) parts.push(`body,:lang(en){font-family:"${c.theme.font}","Mukta",system-ui,sans-serif}`);
  for (const f of c.features) {
    if (!f.hideInNav) continue;
    const p = f.path.replace(/"/g, "");
    parts.push(`a[href="${p}"],a[href^="${p}/"],a[href="${p}/"],[data-href="${p}"]{display:none!important}`);
  }
  if (c.banner.enabled && c.banner.text) {
    parts.push(
      `#aap-banner{position:relative;z-index:60;display:flex;gap:.75rem;align-items:center;justify-content:center;flex-wrap:wrap;padding:.55rem 2.75rem .55rem 1rem;font-size:.95rem;line-height:1.4;text-align:center}` +
      `#aap-banner[data-tone=info]{background:var(--brand-700,#0f5a2e);color:#fff}` +
      `#aap-banner[data-tone=festive]{background:linear-gradient(90deg,#b7791f,#c0392b);color:#fff}` +
      `#aap-banner[data-tone=alert]{background:#7f1d1d;color:#fff}` +
      `#aap-banner a{color:inherit;font-weight:600;text-decoration:underline;text-underline-offset:3px}` +
      `#aap-banner button{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);border:0;background:transparent;color:inherit;font-size:1.25rem;line-height:1;padding:.25rem .5rem;cursor:pointer;border-radius:6px}` +
      `#aap-banner button:focus-visible{outline:2px solid #fff;outline-offset:1px}`
    );
  }
  return parts.join("\n");
}

function escapeStyle(css: string) {
  return css.replace(/<\/style/gi, "<\\/style");
}
function escapeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string));
}

/** Subset the browser runtime needs (renames, nav rules, banner). */
export function runtimePayload(c: SiteConfig, version: number, preview: boolean) {
  return {
    v: version,
    preview,
    labels: c.labels,
    disabled: c.features.filter((f) => !f.enabled).map((f) => ({ path: f.path, to: f.redirectTo })),
    banner: c.banner.enabled && c.banner.text ? c.banner : null,
    analytics: c.analytics.enabled && !preview,
  };
}

/** Injects theme + runtime into an HTML response via HTMLRewriter. */
export function injectIntoHtml(response: Response, c: SiteConfig, version: number, preview: boolean): Response {
  const css = themeCss(c);
  const custom = c.customCss.trim();
  const fontLink = c.theme.font
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(c.theme.font).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap">`
    : "";
  const head =
    fontLink +
    (css ? `<style id="aap-theme">${escapeStyle(css)}</style>` : "") +
    (custom ? `<style id="aap-custom">${escapeStyle(custom)}</style>` : "") +
    `<script type="application/json" id="aap-config">${escapeJson(runtimePayload(c, version, preview))}</script>` +
    `<script src="/aap/runtime.js" defer></script>` +
    (c.customHead.trim() ? c.customHead : "");
  // @ts-ignore HTMLRewriter is a Workers runtime global
  const rewriter = new HTMLRewriter().on("head", {
    element(el: any) {
      el.append(head, { html: true });
    },
  });
  if (preview) {
    rewriter.on("body", {
      element(el: any) {
        el.append(
          `<div style="position:fixed;left:12px;bottom:12px;z-index:2147483647;background:#1d2a22;color:#fff;font:600 12px/1.2 system-ui;padding:6px 10px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.25)">Draft preview</div>`,
          { html: true }
        );
      },
    });
  }
  return rewriter.transform(response);
}

export function maintenancePage(c: SiteConfig) {
  const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(c.maintenance.title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:"Mukta",system-ui,sans-serif;background:#eef6f1;color:#0f2a1d;padding:24px}main{max-width:34rem;text-align:center}h1{font-size:clamp(1.6rem,4vw,2.4rem);margin:0 0 .5rem;line-height:1.25}p{font-size:1.1rem;line-height:1.6;color:#3f5247}</style></head>
<body><main><h1>${escapeHtml(c.maintenance.title)}</h1><p>${escapeHtml(c.maintenance.message)}</p></main></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": "600", "x-robots-tag": "noindex" },
  });
}

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + "/");
}

/** Maintenance → redirects → disabled features. Only for page navigations. */
export function preRoute(request: Request, c: SiteConfig, isAdmin: boolean): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (isProtectedPath(path) || /\.[a-z0-9]{2,5}$/i.test(path)) return null;

  if (c.maintenance.enabled && !isAdmin && !c.maintenance.allowPaths.some((p) => matchesPrefix(path, p))) {
    return maintenancePage(c);
  }
  const redirect = c.redirects.find((r) => r.from === path);
  if (redirect) {
    const target = /^https:/i.test(redirect.to) ? redirect.to : new URL(redirect.to + url.search, url.origin).toString();
    return Response.redirect(target, redirect.status);
  }
  const disabled = c.features.find((f) => !f.enabled && matchesPrefix(path, f.path));
  if (disabled && !isAdmin) {
    return Response.redirect(new URL(disabled.redirectTo || "/", url.origin).toString(), 302);
  }
  return null;
}
