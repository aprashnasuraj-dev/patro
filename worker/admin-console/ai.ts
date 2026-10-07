// Aafnai Patro admin console — AI site agent.
//
// The agent can READ freely (config, traffic, users, activity) but every
// WRITE becomes a proposal the admin approves in the UI. Approved proposals
// change the draft only; publishing is a separate, explicit step (which the
// agent may also propose). With "auto-apply to draft" on, proposals are applied
// to the draft immediately but still never published without approval.
import { audit, all, first, getSetting, json, readJson, run, setSetting, type AdminEnv } from "./db";
import { getSecret } from "./secrets";
import { FEATURE_CATALOG, FONT_CHOICES, loadConfig, normalizeConfig, publishDraft, saveDraft, type SiteConfig } from "./site-config";
import { live, stats } from "./analytics";
import { userSummary } from "./users";

export type ProviderId = "openai" | "anthropic" | "gemini" | "groq" | "openrouter" | "deepseek" | "nvidia" | "custom";
export const PROVIDERS: Record<ProviderId, { label: string; kind: "openai" | "anthropic"; baseUrl: string; defaultModel: string; keyUrl: string }> = {
  openai: { label: "OpenAI (ChatGPT)", kind: "openai", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4.1-mini", keyUrl: "https://platform.openai.com/api-keys" },
  anthropic: { label: "Anthropic (Claude)", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-5-5", keyUrl: "https://console.anthropic.com/settings/keys" },
  gemini: { label: "Google Gemini", kind: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", defaultModel: "gemini-2.5-flash", keyUrl: "https://aistudio.google.com/apikey" },
  groq: { label: "Groq", kind: "openai", baseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", keyUrl: "https://console.groq.com/keys" },
  openrouter: { label: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-4.1-mini", keyUrl: "https://openrouter.ai/keys" },
  deepseek: { label: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", keyUrl: "https://platform.deepseek.com/api_keys" },
  nvidia: { label: "NVIDIA NIM", kind: "openai", baseUrl: "https://integrate.api.nvidia.com/v1", defaultModel: "meta/llama-3.3-70b-instruct", keyUrl: "https://build.nvidia.com" },
  custom: { label: "Custom (OpenAI-compatible)", kind: "openai", baseUrl: "", defaultModel: "", keyUrl: "" },
};

export type AiSettings = {
  provider: ProviderId;
  models: Partial<Record<ProviderId, string>>;
  customBaseUrl: string;
  autoApply: boolean;
  instructions: string;
  jyotishBridge: { groq: boolean; nvidia: boolean };
};
const DEFAULT_AI: AiSettings = { provider: "openai", models: {}, customBaseUrl: "", autoApply: false, instructions: "", jyotishBridge: { groq: true, nvidia: true } };

export async function getAiSettings(env: AdminEnv): Promise<AiSettings> {
  const s = await getSetting<Partial<AiSettings>>(env, "ai", {});
  return { ...DEFAULT_AI, ...s, models: { ...(s.models || {}) }, jyotishBridge: { ...DEFAULT_AI.jyotishBridge, ...(s.jyotishBridge || {}) } };
}
export function cleanAiSettings(input: any, prev: AiSettings): AiSettings {
  const provider = (Object.keys(PROVIDERS) as ProviderId[]).includes(input?.provider) ? input.provider : prev.provider;
  const models: Partial<Record<ProviderId, string>> = {};
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    const m = String(input?.models?.[id] ?? prev.models[id] ?? "").trim().slice(0, 120);
    if (m) models[id] = m;
  }
  let customBaseUrl = String(input?.customBaseUrl ?? prev.customBaseUrl).trim().replace(/\/+$/, "").slice(0, 300);
  if (customBaseUrl && !/^https:\/\/[^\s]+$/i.test(customBaseUrl)) customBaseUrl = "";
  return {
    provider, models, customBaseUrl,
    autoApply: typeof input?.autoApply === "boolean" ? input.autoApply : prev.autoApply,
    instructions: String(input?.instructions ?? prev.instructions).slice(0, 4000),
    jyotishBridge: {
      groq: typeof input?.jyotishBridge?.groq === "boolean" ? input.jyotishBridge.groq : prev.jyotishBridge.groq,
      nvidia: typeof input?.jyotishBridge?.nvidia === "boolean" ? input.jyotishBridge.nvidia : prev.jyotishBridge.nvidia,
    },
  };
}

// ---------- tools ----------

type Tool = { name: string; description: string; parameters: any; write: boolean };
const colorProps = Object.fromEntries(
  ["accent", "accentStrong", "accentSoft", "background", "surface", "text", "muted", "line", "holiday", "festival"].map((k) => [k, { type: "string", description: "Hex colour like #176f3b" }])
);
export const TOOLS: Tool[] = [
  { name: "get_site_config", write: false, description: "Read the current DRAFT site configuration (theme, renamed labels, features, banner, redirects, maintenance, custom CSS) and the published version number.", parameters: { type: "object", properties: {} } },
  { name: "list_features", write: false, description: "List known site sections/features with their paths, names and whether they are enabled or hidden in navigation.", parameters: { type: "object", properties: {} } },
  { name: "get_traffic", write: false, description: "Traffic summary for a period: totals, previous-period comparison, top pages, referrers, countries, devices.", parameters: { type: "object", properties: { range: { type: "string", enum: ["24h", "7d", "30d", "90d"] } }, required: ["range"] } },
  { name: "get_live_visitors", write: false, description: "Visitors active in the last 5 minutes, by page and country, plus signed-in users active in 15 minutes.", parameters: { type: "object", properties: {} } },
  { name: "get_user_summary", write: false, description: "Counts of signed-in site users: total, new, active, push subscriptions, families.", parameters: { type: "object", properties: {} } },
  { name: "get_recent_activity", write: false, description: "Recent admin activity log entries.", parameters: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "rename_label", write: true, description: "Rename visible text anywhere on the site (menus, headings, buttons). 'exact' replaces text nodes whose whole trimmed text equals `from`; 'contains' replaces every occurrence inside text.", parameters: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, match: { type: "string", enum: ["exact", "contains"] } }, required: ["from", "to"] } },
  { name: "remove_label", write: true, description: "Remove an existing rename rule so the original text shows again.", parameters: { type: "object", properties: { from: { type: "string" } }, required: ["from"] } },
  { name: "set_theme_colors", write: true, description: "Set theme colours for light or dark mode. Only include colours to change; pass an empty string to reset one to the site default.", parameters: { type: "object", properties: { mode: { type: "string", enum: ["light", "dark"] }, ...colorProps }, required: ["mode"] } },
  { name: "set_theme_style", write: true, description: "Set corner radius (0–28 px, or null for default) and/or body font.", parameters: { type: "object", properties: { radius: { type: ["integer", "null"] }, font: { type: "string", enum: Object.keys(FONT_CHOICES) } } } },
  { name: "toggle_feature", write: true, description: "Enable/disable a site section by path, or hide it from navigation. Disabled sections redirect visitors to redirectTo (default '/').", parameters: { type: "object", properties: { path: { type: "string" }, enabled: { type: "boolean" }, hideInNav: { type: "boolean" }, redirectTo: { type: "string" } }, required: ["path", "enabled"] } },
  { name: "set_banner", write: true, description: "Configure the announcement banner shown at the top of every page.", parameters: { type: "object", properties: { enabled: { type: "boolean" }, text: { type: "string" }, linkText: { type: "string" }, linkUrl: { type: "string" }, tone: { type: "string", enum: ["info", "festive", "alert"] }, dismissible: { type: "boolean" } }, required: ["enabled"] } },
  { name: "add_redirect", write: true, description: "Add or replace a URL redirect.", parameters: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, status: { type: "integer", enum: [301, 302] } }, required: ["from", "to"] } },
  { name: "remove_redirect", write: true, description: "Remove a redirect by its source path.", parameters: { type: "object", properties: { from: { type: "string" } }, required: ["from"] } },
  { name: "set_custom_css", write: true, description: "Add CSS to the site. mode 'append' adds to existing custom CSS, 'replace' overwrites it. Prefer the site's CSS variables (--brand-600, --surface, --ink-900, --radius...).", parameters: { type: "object", properties: { css: { type: "string" }, mode: { type: "string", enum: ["append", "replace"] } }, required: ["css", "mode"] } },
  { name: "set_maintenance", write: true, description: "Turn maintenance mode on/off. When on, visitors see a maintenance page; admins still see the site.", parameters: { type: "object", properties: { enabled: { type: "boolean" }, title: { type: "string" }, message: { type: "string" } }, required: ["enabled"] } },
  { name: "publish_draft", write: true, description: "Publish the current draft so visitors see it. Only propose this when the admin asks to publish or go live.", parameters: { type: "object", properties: { note: { type: "string" } }, required: ["note"] } },
];

function summarize(tool: string, a: any): string {
  switch (tool) {
    case "rename_label": return `Rename “${a.from}” → “${a.to}”${a.match === "contains" ? " (everywhere it appears)" : ""}`;
    case "remove_label": return `Stop renaming “${a.from}”`;
    case "set_theme_colors": {
      const keys = Object.keys(a).filter((k) => k !== "mode");
      return `Set ${a.mode} theme: ${keys.map((k) => `${k} ${a[k] || "(default)"}`).join(", ") || "no changes"}`;
    }
    case "set_theme_style": return `Theme style: ${a.radius !== undefined ? `radius ${a.radius ?? "default"}` : ""}${a.font !== undefined ? ` font ${a.font || "default"}` : ""}`.trim();
    case "toggle_feature": return `${a.enabled ? (a.hideInNav ? "Hide from menus" : "Enable") : "Disable"} ${a.path}${!a.enabled && a.redirectTo ? ` (send visitors to ${a.redirectTo})` : ""}`;
    case "set_banner": return a.enabled ? `Show banner: “${String(a.text || "").slice(0, 80)}”` : "Hide the banner";
    case "add_redirect": return `Redirect ${a.from} → ${a.to} (${a.status || 301})`;
    case "remove_redirect": return `Remove redirect from ${a.from}`;
    case "set_custom_css": return `${a.mode === "replace" ? "Replace" : "Add"} custom CSS (${String(a.css || "").length} characters)`;
    case "set_maintenance": return a.enabled ? "Turn ON maintenance mode" : "Turn off maintenance mode";
    case "publish_draft": return `Publish draft: “${a.note || "AI-suggested changes"}”`;
    default: return tool;
  }
}

export async function applyProposal(env: AdminEnv, tool: string, a: any, by: string): Promise<string> {
  if (tool === "publish_draft") {
    const v = await publishDraft(env, by, String(a?.note || "Published from AI agent"));
    return `Published as version ${v}.`;
  }
  const c: SiteConfig = structuredClone((await loadConfig(env, "draft", true)).config);
  switch (tool) {
    case "rename_label": {
      c.labels = c.labels.filter((l) => l.from !== String(a.from));
      c.labels.push({ from: String(a.from), to: String(a.to ?? ""), match: a.match === "contains" ? "contains" : "exact" });
      break;
    }
    case "remove_label": c.labels = c.labels.filter((l) => l.from !== String(a.from)); break;
    case "set_theme_colors": {
      const mode = a.mode === "dark" ? "dark" : "light";
      for (const [k, v] of Object.entries(a)) {
        if (k === "mode") continue;
        if (v === "" || v == null) delete (c.theme[mode] as any)[k];
        else (c.theme[mode] as any)[k] = v;
      }
      break;
    }
    case "set_theme_style":
      if (a.radius !== undefined) c.theme.radius = a.radius;
      if (a.font !== undefined) c.theme.font = a.font;
      break;
    case "toggle_feature": {
      const path = String(a.path);
      c.features = c.features.filter((f) => f.path !== path);
      c.features.push({ path, enabled: !!a.enabled, hideInNav: !!a.hideInNav || !a.enabled, redirectTo: a.redirectTo || "/" });
      break;
    }
    case "set_banner": c.banner = { ...c.banner, ...a, id: a.text && a.text !== c.banner.text ? "b" + Date.now().toString(36) : c.banner.id }; break;
    case "add_redirect":
      c.redirects = c.redirects.filter((r) => r.from !== a.from);
      c.redirects.push({ from: a.from, to: a.to, status: a.status === 302 ? 302 : 301 });
      break;
    case "remove_redirect": c.redirects = c.redirects.filter((r) => r.from !== a.from); break;
    case "set_custom_css": c.customCss = a.mode === "replace" ? String(a.css) : (c.customCss ? c.customCss + "\n\n" : "") + String(a.css); break;
    case "set_maintenance": c.maintenance = { ...c.maintenance, ...a }; break;
    default: throw new Error("unknown_tool");
  }
  await saveDraft(env, normalizeConfig(c), by);
  return "Applied to draft.";
}

async function runReadTool(env: AdminEnv, name: string, a: any): Promise<unknown> {
  switch (name) {
    case "get_site_config": {
      const [d, p] = await Promise.all([loadConfig(env, "draft", true), loadConfig(env, "published", true)]);
      return { draft: d.config, publishedVersion: p.version, draftDiffersFromPublished: JSON.stringify(d.config) !== JSON.stringify(p.config) };
    }
    case "list_features": {
      const d = (await loadConfig(env, "draft", true)).config;
      return FEATURE_CATALOG.map((f) => {
        const rule = d.features.find((r) => r.path === f.path);
        return { ...f, enabled: rule ? rule.enabled : true, hideInNav: rule ? rule.hideInNav : false };
      });
    }
    case "get_traffic": {
      const s = await stats(env, String(a?.range || "7d"));
      return { ...s, series: s.series.slice(-48), paths: s.paths.slice(0, 12), referrers: s.referrers.slice(0, 8), countries: s.countries.slice(0, 8) };
    }
    case "get_live_visitors": return live(env);
    case "get_user_summary": return userSummary(env);
    case "get_recent_activity": return all(env, "select ts,admin,action,target,detail from aap_audit order by id desc limit ?1", Math.min(50, Number(a?.limit) || 15));
    default: return { error: "unknown_tool" };
  }
}

// ---------- providers ----------

type Msg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: { id: string; name: string; arguments: string }[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string };
type Completion = { text: string; toolCalls: { id: string; name: string; args: any; raw: string }[] };

async function providerConfig(env: AdminEnv, settings: AiSettings, id: ProviderId) {
  const p = PROVIDERS[id];
  const key = await getSecret(env, "ai." + id);
  if (!key) throw new Error(`No API key saved for ${p.label}. Add one in AI agent → Providers.`);
  const baseUrl = id === "custom" ? settings.customBaseUrl : p.baseUrl;
  if (!baseUrl) throw new Error("Set a base URL for the custom provider.");
  const model = settings.models[id] || p.defaultModel;
  if (!model) throw new Error("Choose a model for this provider.");
  return { ...p, id, key, baseUrl, model };
}

async function errorText(res: Response) {
  const body: any = await res.json().catch(() => null);
  const msg = body?.error?.message || body?.error?.type || body?.message || (typeof body?.error === "string" ? body.error : "");
  return `${res.status} ${msg || res.statusText}`.trim();
}

async function complete(cfg: Awaited<ReturnType<typeof providerConfig>>, system: string, messages: Msg[], tools: Tool[] | null): Promise<Completion> {
  if (cfg.kind === "anthropic") {
    const out: any[] = [];
    for (const m of messages) {
      if (m.role === "user") out.push({ role: "user", content: m.content });
      else if (m.role === "assistant") {
        const blocks: any[] = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        for (const tc of m.tool_calls || []) blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: safeParse(tc.arguments) });
        out.push({ role: "assistant", content: blocks.length ? blocks : [{ type: "text", text: "…" }] });
      } else {
        const block = { type: "tool_result", tool_use_id: m.tool_call_id, content: m.content };
        const last = out[out.length - 1];
        if (last?.role === "user" && Array.isArray(last.content) && last.content[0]?.type === "tool_result") last.content.push(block);
        else out.push({ role: "user", content: [block] });
      }
    }
    const res = await fetch(cfg.baseUrl + "/messages", {
      method: "POST",
      headers: { "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.model, max_tokens: 2048, system, messages: out,
        ...(tools ? { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) } : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error("Anthropic: " + (await errorText(res)));
    const data: any = await res.json();
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    const toolCalls = (data.content || []).filter((b: any) => b.type === "tool_use").map((b: any) => ({ id: b.id, name: b.name, args: b.input || {}, raw: JSON.stringify(b.input || {}) }));
    return { text, toolCalls };
  }
  const out: any[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content || null,
        ...(m.tool_calls?.length ? { tool_calls: m.tool_calls.map((tc) => ({ id: tc.id, type: "function", function: { name: tc.name, arguments: tc.arguments } })) } : {}),
      });
    } else if (m.role === "tool") out.push({ role: "tool", tool_call_id: m.tool_call_id, content: m.content });
    else out.push(m);
  }
  const headers: Record<string, string> = { authorization: "Bearer " + cfg.key, "content-type": "application/json" };
  if (cfg.id === "openrouter") {
    headers["http-referer"] = "https://aafnaipatro.com/admin";
    headers["x-title"] = "Aafnai Patro Admin";
  }
  const res = await fetch(cfg.baseUrl + "/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: cfg.model, messages: out,
      ...(tools ? { tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })), tool_choice: "auto" } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(cfg.label + ": " + (await errorText(res)));
  const data: any = await res.json();
  const msg = data?.choices?.[0]?.message || {};
  const toolCalls = (msg.tool_calls || []).map((tc: any, i: number) => ({
    id: tc.id || "call_" + i + "_" + Date.now().toString(36),
    name: tc.function?.name,
    args: safeParse(tc.function?.arguments),
    raw: typeof tc.function?.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function?.arguments || {}),
  }));
  return { text: typeof msg.content === "string" ? msg.content : "", toolCalls };
}

function safeParse(s: unknown) {
  if (typeof s !== "string") return s || {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function systemPrompt(settings: AiSettings) {
  return `You are the site agent for Aafnai Patro (आफ्नै पात्रो, aafnaipatro.com) — a Nepali calendar with panchang, rashifal, festivals, date conversion, FM/TV, community calendars and Nepali-language tools. You help the site owner manage the site from the admin console.

How changes work:
- Read tools run immediately. Write tools do NOT change anything by themselves: each call creates a proposal the admin approves with one click.${settings.autoApply ? " (Auto-apply is ON: proposals are applied to the draft immediately, but never published without approval.)" : ""}
- Approved changes go to the DRAFT. Visitors only see them after the draft is published. Propose publish_draft only when the admin asks to publish or go live.
- Never claim a change is live. Say what you proposed and that it awaits approval.

Guidance:
- Before renaming or toggling, check get_site_config / list_features so you don't duplicate rules.
- For renames, the text must match what visitors see (Nepali or English). Use 'exact' for menu items and buttons; 'contains' only when asked to change a word everywhere.
- Keep colours accessible (text contrast at least 4.5:1). The brand green is #176f3b.
- When reporting traffic, lead with the key number and the change vs the previous period. Times are Nepal time.
- Reply in the language the admin writes in (Nepali or English). Be brief and concrete.
${settings.instructions ? "\nOwner's standing instructions:\n" + settings.instructions : ""}`;
}

// ---------- chat loop ----------

const MAX_STEPS = 6;
const MAX_HISTORY = 40;

export async function chat(env: AdminEnv, admin: { id: string; username: string }, threadId: string | null, message: string) {
  const settings = await getAiSettings(env);
  const cfg = await providerConfig(env, settings, settings.provider);
  let thread = threadId ? await first<any>(env, "select * from aap_ai_threads where id=?1", threadId) : null;
  const messages: Msg[] = thread ? safeParse(thread.messages) : [];
  const id = thread?.id || crypto.randomUUID();
  messages.push({ role: "user", content: message.slice(0, 8000) });

  const created: any[] = [];
  let reply = "";
  for (let step = 0; step < MAX_STEPS; step++) {
    const context = messages.slice(-MAX_HISTORY);
    while (context.length && context[0].role !== "user") context.shift(); // never start on a dangling tool result
    const res = await complete(cfg, systemPrompt(settings), context, TOOLS);
    messages.push({ role: "assistant", content: res.text, ...(res.toolCalls.length ? { tool_calls: res.toolCalls.map((t) => ({ id: t.id, name: t.name, arguments: t.raw || "{}" })) } : {}) });
    if (!res.toolCalls.length) {
      reply = res.text;
      break;
    }
    for (const tc of res.toolCalls) {
      const tool = TOOLS.find((t) => t.name === tc.name);
      let result: unknown;
      if (!tool) result = { error: "Unknown tool " + tc.name };
      else if (!tool.write) {
        try {
          result = await runReadTool(env, tool.name, tc.args);
        } catch (e) {
          result = { error: String((e as Error).message || e) };
        }
      } else {
        const pid = crypto.randomUUID();
        const summary = summarize(tool.name, tc.args || {});
        let status = "pending", note = "Proposal created; waiting for the admin to approve it.";
        if (settings.autoApply && tool.name !== "publish_draft") {
          try {
            note = await applyProposal(env, tool.name, tc.args || {}, admin.username + " (AI)");
            status = "applied";
          } catch (e) {
            note = "Could not apply: " + String((e as Error).message || e);
            status = "failed";
          }
        }
        await run(
          env,
          "insert into aap_ai_proposals(id,thread_id,tool,args,summary,status,created_at,decided_at,decided_by) values(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
          pid, id, tool.name, JSON.stringify(tc.args || {}), summary, status, Date.now(), status === "pending" ? null : Date.now(), status === "pending" ? null : "auto"
        );
        created.push({ id: pid, tool: tool.name, summary, status });
        result = { proposal: pid, status, note };
      }
      messages.push({ role: "tool", tool_call_id: tc.id, name: tc.name, content: JSON.stringify(result).slice(0, 8000) });
    }
    if (step === MAX_STEPS - 1) reply = "I've reached the step limit for one message. Ask me to continue if needed.";
  }

  const title = thread?.title || message.replace(/\s+/g, " ").slice(0, 60);
  const now = Date.now();
  const stored = JSON.stringify(messages.slice(-120));
  if (thread) await run(env, "update aap_ai_threads set messages=?1,updated_at=?2 where id=?3", stored, now, id);
  else await run(env, "insert into aap_ai_threads(id,admin_id,title,messages,created_at,updated_at) values(?1,?2,?3,?4,?5,?5)", id, admin.id, title, stored, now);
  await audit(env, admin.username, "ai_chat", "ai", { thread: id, provider: settings.provider, model: cfg.model, proposals: created.length });
  return { threadId: id, reply, proposals: created, model: cfg.model, provider: settings.provider };
}

export function displayMessages(raw: string) {
  const msgs: Msg[] = safeParse(raw) || [];
  const out: any[] = [];
  for (const m of msgs) {
    if (m.role === "user") out.push({ role: "user", text: m.content });
    else if (m.role === "assistant") {
      if (m.tool_calls?.length) out.push({ role: "tools", tools: m.tool_calls.map((t) => t.name) });
      if (m.content) out.push({ role: "assistant", text: m.content });
    }
  }
  return out;
}

export async function testProvider(env: AdminEnv, id: ProviderId) {
  const settings = await getAiSettings(env);
  const cfg = await providerConfig(env, settings, id);
  const started = Date.now();
  const res = await complete(cfg, "You are a connectivity check.", [{ role: "user", content: "Reply with exactly: OK" }], null);
  return { ok: true, model: cfg.model, reply: res.text.slice(0, 80), ms: Date.now() - started };
}

export async function listModels(env: AdminEnv, id: ProviderId) {
  const settings = await getAiSettings(env);
  const p = PROVIDERS[id];
  const key = await getSecret(env, "ai." + id);
  if (!key) throw new Error("Save an API key first.");
  const base = id === "custom" ? settings.customBaseUrl : p.baseUrl;
  const headers: Record<string, string> = p.kind === "anthropic" ? { "x-api-key": key, "anthropic-version": "2023-06-01" } : { authorization: "Bearer " + key };
  const res = await fetch(base + "/models" + (p.kind === "anthropic" ? "?limit=100" : ""), { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(await errorText(res));
  const data: any = await res.json();
  const ids = (data?.data || data?.models || []).map((m: any) => String(m.id || m.name || "").replace(/^models\//, "")).filter(Boolean);
  return ids.sort().slice(0, 400);
}

// ---------- Jyotish bridge ----------
// Lets keys saved here power the existing public Jyotish chat (worker/jyotish.ts
// reads GROQ_API_KEY / NVIDIA_API_KEY) without touching Cloudflare secrets.

let overlayMemo: { at: number; vars: Record<string, string> } | null = null;
export async function aiEnvOverlay(env: AdminEnv): Promise<Record<string, string>> {
  if (overlayMemo && Date.now() - overlayMemo.at < 60_000) return overlayMemo.vars;
  const vars: Record<string, string> = {};
  try {
    const s = await getAiSettings(env);
    if(s.models.groq)vars.GROQ_MODEL=s.models.groq;
    if(s.models.nvidia)vars.NVIDIA_MODEL=s.models.nvidia;
    const hasGroq = !!(env.Groq_API || env.GROQ_API_KEY || env.GROQ_KEY);
    const hasNvidia = !!(env.nvidia_api || env.NVIDIA_NIM_API_KEY || env.NVIDIA_API_KEY || env.NGC_API_KEY);
    if (s.jyotishBridge.groq && !hasGroq) {
      const k = await getSecret(env, "ai.groq");
      if (k) vars.GROQ_API_KEY = k;
    }
    if (s.jyotishBridge.nvidia && !hasNvidia) {
      const k = await getSecret(env, "ai.nvidia");
      if (k) vars.NVIDIA_API_KEY = k;
    }
  } catch {
    /* tables may not exist yet */
  }
  overlayMemo = { at: Date.now(), vars };
  return vars;
}
export function resetAiOverlay() {
  overlayMemo = null;
}

export async function aiRoutesJsonError(e: unknown) {
  return json({ ok: false, error: "ai_error", message: String((e as Error)?.message || e) }, 502);
}
export { readJson, setSetting };
